import { randomBytes } from 'node:crypto';

import { test, expect } from '@playwright/test';

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
const PNG_BYTES = Buffer.from(PNG_BASE64, 'base64');
const EMPTY_TEXT = '저장된 이미지가 없습니다. 추가 버튼을 눌러 이미지를 붙여넣으세요.';
const PASTE_TARGET = '.clip-paste-target';

function nextImageId() {
  return randomBytes(12).toString('hex');
}

async function mockClipboardApi(page) {
  const state = { images: [], posts: 0, deletes: 0 };

  await page.route('**/api/clipboard/images', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        json: {
          images: state.images,
          totalBytes: state.images.reduce((sum, image) => sum + image.bytes, 0),
          limits: { maxImageBytes: 26214400, maxTotalBytes: 268435456, maxItems: 100 },
        },
      });
      return;
    }
    if (method === 'POST') {
      state.posts += 1;
      // 붙여넣을 때마다 새 이미지가 목록 앞에 쌓이도록 매번 새 id 를 발급한다.
      const image = {
        id: nextImageId(),
        type: 'image/png',
        extension: 'png',
        bytes: PNG_BYTES.length,
        createdAt: new Date().toISOString(),
      };
      state.images = [image, ...state.images];
      await route.fulfill({ status: 201, json: { image } });
      return;
    }
    await route.fulfill({ status: 405, json: { error: 'Method not allowed' } });
  });

  await page.route('**/api/clipboard/images/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      const id = route.request().url().split('/').pop();
      state.deletes += 1;
      state.images = state.images.filter((image) => image.id !== id);
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'image/png', body: PNG_BYTES });
  });

  return state;
}

async function openWithCleanPreferences(page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function pasteImage(page, base64) {
  return page.evaluate((data) => {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], 'clip.png', { type: 'image/png' }));
    const event = new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }, base64);
}

async function pasteText(page) {
  return page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'clock');
    const event = new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

test('갤러리로 열리고 추가 화면에서 여러 장을 붙여넣은 뒤 복사하고 삭제한다', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const state = await mockClipboardApi(page);
  await openWithCleanPreferences(page);

  await page.getByRole('button', { name: 'CB Clipboard' }).click();
  const dialog = page.getByRole('dialog', { name: 'Clipboard Images' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(PASTE_TARGET)).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '추가', exact: true })).toBeVisible();
  await expect(dialog.getByText(EMPTY_TEXT)).toBeVisible();

  // 갤러리에서는 이미지 붙여넣기를 가로채지 않는다.
  expect(await pasteImage(page, PNG_BASE64)).toBe(false);
  await page.waitForTimeout(300);
  expect(state.posts).toBe(0);
  await expect(dialog.getByText(EMPTY_TEXT)).toBeVisible();

  await dialog.getByRole('button', { name: '추가', exact: true }).click();
  await expect(dialog.locator(PASTE_TARGET)).toBeVisible();

  const addedItems = dialog.locator('.clip-added-item');
  expect(await pasteImage(page, PNG_BASE64)).toBe(true);
  await expect(addedItems).toHaveCount(1);
  expect(await pasteImage(page, PNG_BASE64)).toBe(true);
  await expect(addedItems).toHaveCount(2);
  expect(state.posts).toBe(2);

  await dialog.getByRole('button', { name: '갤러리로', exact: true }).click();
  const cards = dialog.locator('.clip-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first().locator('img')).toHaveJSProperty('naturalWidth', 1);

  await cards.first().getByRole('button', { name: '복사', exact: true }).click();
  await expect(cards.first().getByRole('button', { name: '복사됨', exact: true })).toBeVisible();
  const types = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return items.flatMap((item) => [...item.types]);
  });
  expect(types).toContain('image/png');

  await cards.first().getByRole('button', { name: '삭제', exact: true }).click();
  await expect(cards).toHaveCount(1);
  await cards.first().getByRole('button', { name: '삭제', exact: true }).click();
  await expect(cards).toHaveCount(0);
  expect(state.deletes).toBe(2);
  await expect(dialog.getByText(EMPTY_TEXT)).toBeVisible();
});

test('추가 화면에서도 이미지가 없는 붙여넣기는 기본 동작을 막지 않는다', async ({ page }) => {
  await mockClipboardApi(page);
  await openWithCleanPreferences(page);

  await page.getByRole('button', { name: 'CB Clipboard' }).click();
  const dialog = page.getByRole('dialog', { name: 'Clipboard Images' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: '추가', exact: true }).click();
  await expect(dialog.locator(PASTE_TARGET)).toBeVisible();

  expect(await pasteText(page)).toBe(false);
});

test('Classic 레이아웃의 도구 그리드에서도 같은 대화상자를 갤러리로 연다', async ({ page }) => {
  await mockClipboardApi(page);
  await openWithCleanPreferences(page);

  await page.getByRole('button', { name: 'Classic 레이아웃' }).click();
  await expect(page.locator('[data-dashboard-layout="classic"]')).toBeVisible();

  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await page.getByRole('button', { name: 'Clipboard', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Clipboard Images' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(PASTE_TARGET)).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '추가', exact: true })).toBeVisible();
  await expect(dialog.getByText(EMPTY_TEXT)).toBeVisible();
});
