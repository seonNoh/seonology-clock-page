import { test, expect } from '@playwright/test';

const PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
const PNG_BYTES = Buffer.from(PNG_BASE64, 'base64');
const IMAGE_ID = 'a1b2c3d4e5f60718293a4b5c';
const EMPTY_TEXT = '저장된 이미지가 없습니다. 이미지를 복사한 뒤 Ctrl+V 를 누르세요.';

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
      state.images = [{
        id: IMAGE_ID,
        type: 'image/png',
        extension: 'png',
        bytes: PNG_BYTES.length,
        createdAt: new Date().toISOString(),
      }];
      await route.fulfill({ status: 201, json: { image: state.images[0] } });
      return;
    }
    await route.fulfill({ status: 405, json: { error: 'Method not allowed' } });
  });

  await page.route('**/api/clipboard/images/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      state.deletes += 1;
      state.images = [];
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

test('Split Console 독에서 이미지를 붙여넣고 복사하고 삭제한다', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const state = await mockClipboardApi(page);
  await openWithCleanPreferences(page);

  await page.getByRole('button', { name: 'CB Clipboard' }).click();
  const dialog = page.getByRole('dialog', { name: 'Clipboard Images' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(EMPTY_TEXT)).toBeVisible();

  expect(await pasteImage(page, PNG_BASE64)).toBe(true);

  const cards = dialog.locator('.clip-card');
  await expect(cards).toHaveCount(1);
  expect(state.posts).toBe(1);
  await expect(cards.locator('img')).toHaveJSProperty('naturalWidth', 1);

  await dialog.getByRole('button', { name: '복사', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '복사됨', exact: true })).toBeVisible();
  const types = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return items.flatMap((item) => [...item.types]);
  });
  expect(types).toContain('image/png');

  await dialog.getByRole('button', { name: '삭제', exact: true }).click();
  await expect(cards).toHaveCount(0);
  expect(state.deletes).toBe(1);
  await expect(dialog.getByText(EMPTY_TEXT)).toBeVisible();
});

test('이미지가 없는 붙여넣기는 기본 동작을 막지 않는다', async ({ page }) => {
  await mockClipboardApi(page);
  await openWithCleanPreferences(page);

  await page.getByRole('button', { name: 'CB Clipboard' }).click();
  await expect(page.getByRole('dialog', { name: 'Clipboard Images' })).toBeVisible();

  const prevented = await page.evaluate(() => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'clock');
    const event = new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
});

test('Classic 레이아웃의 도구 그리드에서도 같은 대화상자를 연다', async ({ page }) => {
  await mockClipboardApi(page);
  await openWithCleanPreferences(page);

  await page.getByRole('button', { name: 'Classic 레이아웃' }).click();
  await expect(page.locator('[data-dashboard-layout="classic"]')).toBeVisible();

  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await page.getByRole('button', { name: 'Clipboard', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Clipboard Images' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(EMPTY_TEXT)).toBeVisible();
});
