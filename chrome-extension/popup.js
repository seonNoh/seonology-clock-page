// Seonology Bookmark Sync - Popup UI

const $enabled = document.getElementById('enabled');
const $apiUrl = document.getElementById('apiUrl');
const $folderList = document.getElementById('folderList');
const $syncInterval = document.getElementById('syncInterval');
const $syncNow = document.getElementById('syncNow');
const $statusDot = document.getElementById('statusDot');
const $statusText = document.getElementById('statusText');

let currentConfig = null;

// ===== Load config & render =====
async function init() {
  const result = await chrome.storage.local.get('config');
  currentConfig = {
    apiUrl: 'https://clock.seonology.com',
    enabled: false,
    syncFolders: [],
    categoryPrefix: 'chrome',
    syncIntervalMin: 5,
    lastSync: null,
    ...result.config,
  };

  $enabled.checked = currentConfig.enabled;
  $apiUrl.value = currentConfig.apiUrl;
  $syncInterval.value = String(currentConfig.syncIntervalMin);
  $syncNow.disabled = !currentConfig.enabled;

  updateStatus();
  loadFolderTree();
}

// ===== Update status display =====
function updateStatus() {
  if (!currentConfig.enabled) {
    $statusDot.className = 'status-dot inactive';
    $statusText.textContent = '동기화 비활성화';
  } else if (currentConfig.lastSync) {
    $statusDot.className = 'status-dot active';
    const ago = timeAgo(new Date(currentConfig.lastSync));
    $statusText.textContent = `마지막 동기화: ${ago}`;
  } else {
    $statusDot.className = 'status-dot active';
    $statusText.textContent = '동기화 활성화 (아직 동기화 안됨)';
  }
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}초 전`;
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

// ===== Load Chrome bookmark folder tree =====
async function loadFolderTree() {
  try {
    const tree = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'getBookmarkTree' }, (response) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    });

    $folderList.innerHTML = '';
    renderFolders(tree[0].children || [], 0);
  } catch (err) {
    $folderList.innerHTML = `<div class="loading">폴더 로드 실패: ${err.message}</div>`;
  }
}

function renderFolders(nodes, depth) {
  for (const node of nodes) {
    // Only show folders (nodes with children)
    if (!node.url && node.children) {
      const bookmarkCount = node.children.filter(c => c.url).length;
      const subfolderCount = node.children.filter(c => !c.url && c.children).length;

      const item = document.createElement('label');
      item.className = 'folder-item';
      item.style.paddingLeft = `${8 + depth * 16}px`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = node.id;
      checkbox.checked = currentConfig.syncFolders.includes(node.id);
      checkbox.addEventListener('change', () => onFolderToggle(node.id, checkbox.checked));

      const icon = document.createElement('span');
      icon.className = 'folder-icon';
      icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

      const name = document.createElement('span');
      name.className = 'folder-name';
      name.textContent = node.title || '(이름 없음)';

      const count = document.createElement('span');
      count.className = 'folder-count';
      count.textContent = `${bookmarkCount}`;

      item.append(checkbox, icon, name, count);
      $folderList.appendChild(item);

      // Recurse into subfolders
      if (subfolderCount > 0) {
        renderFolders(node.children.filter(c => !c.url && c.children), depth + 1);
      }
    }
  }
}

// ===== Event handlers =====
async function saveConfig(partial) {
  const updated = { ...currentConfig, ...partial };
  await chrome.storage.local.set({ config: updated });
  currentConfig = updated;
  updateStatus();
}

$enabled.addEventListener('change', async () => {
  await saveConfig({ enabled: $enabled.checked });
  $syncNow.disabled = !$enabled.checked;
  if ($enabled.checked && currentConfig.syncFolders.length > 0) {
    // Trigger initial sync
    setSyncing();
    chrome.runtime.sendMessage({ type: 'fullSync' });
  }
});

$apiUrl.addEventListener('change', () => {
  saveConfig({ apiUrl: $apiUrl.value.replace(/\/$/, '') });
});

$syncInterval.addEventListener('change', () => {
  const val = parseInt($syncInterval.value);
  saveConfig({ syncIntervalMin: val });
  chrome.runtime.sendMessage({ type: 'updateAlarm', intervalMin: val });
});

function onFolderToggle(folderId, checked) {
  let folders = [...currentConfig.syncFolders];
  if (checked) {
    if (!folders.includes(folderId)) folders.push(folderId);
  } else {
    folders = folders.filter(id => id !== folderId);
  }
  saveConfig({ syncFolders: folders });
}

$syncNow.addEventListener('click', () => {
  if (!currentConfig.enabled) return;
  setSyncing();
  chrome.runtime.sendMessage({ type: 'fullSync' });
});

function setSyncing() {
  $statusDot.className = 'status-dot syncing';
  $statusText.textContent = '동기화 중...';
  $syncNow.disabled = true;
}

// ===== Listen for sync completion =====
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'syncComplete') {
    $syncNow.disabled = !currentConfig.enabled;
    if (message.success) {
      currentConfig.lastSync = new Date().toISOString();
      $statusDot.className = 'status-dot active';
      $statusText.textContent = `동기화 완료! (방금 전)`;
    } else {
      $statusDot.className = 'status-dot inactive';
      $statusText.textContent = `동기화 실패: ${message.error || '알 수 없는 오류'}`;
    }
  }
});

// ===== Init =====
init();
