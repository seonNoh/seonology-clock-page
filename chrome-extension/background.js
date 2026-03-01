// Seonology Bookmark Sync - Background Service Worker
// Chrome 즐겨찾기 변경 감지 → Clock Page API 실시간 동기화

const DEFAULT_CONFIG = {
  apiUrl: 'https://clock.seonology.com',
  enabled: false,
  syncFolders: [],          // Chrome folder IDs to sync
  categoryPrefix: 'chrome', // prefix for synced category names
  syncIntervalMin: 5,       // periodic full sync interval (minutes)
  lastSync: null,
};

// ===== Config helpers =====
async function getConfig() {
  const result = await chrome.storage.local.get('config');
  return { ...DEFAULT_CONFIG, ...result.config };
}

async function setConfig(partial) {
  const config = await getConfig();
  const updated = { ...config, ...partial };
  await chrome.storage.local.set({ config: updated });
  return updated;
}

// ===== Sync state (mapping Chrome ID → Clock Page ID) =====
async function getSyncMap() {
  const result = await chrome.storage.local.get('syncMap');
  return result.syncMap || { categories: {}, bookmarks: {} };
}

async function setSyncMap(map) {
  await chrome.storage.local.set({ syncMap: map });
}

// ===== API helpers =====
async function apiCall(config, method, path, body) {
  const url = `${config.apiUrl}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  if (!resp.ok) throw new Error(`API ${method} ${path}: ${resp.status}`);
  return resp.json();
}

// ===== Get Chrome bookmark tree for selected folders =====
async function getSelectedBookmarks(config) {
  const tree = await chrome.bookmarks.getTree();
  const folders = [];

  function findFolders(nodes, selectedIds) {
    for (const node of nodes) {
      if (selectedIds.includes(node.id)) {
        folders.push(node);
      }
      if (node.children) {
        findFolders(node.children, selectedIds);
      }
    }
  }

  if (config.syncFolders.length > 0) {
    findFolders(tree, config.syncFolders);
  }
  return folders;
}

// ===== Full sync =====
async function fullSync() {
  const config = await getConfig();
  if (!config.enabled || config.syncFolders.length === 0) return;

  console.log('[Seonology Sync] Starting full sync...');

  try {
    // 1. Get current Clock Page bookmarks
    const clockData = await apiCall(config, 'GET', '/api/bookmarks');
    const syncMap = await getSyncMap();

    // 2. Get selected Chrome folders
    const chromeFolders = await getSelectedBookmarks(config);

    // 3. For each Chrome folder → ensure category exists, sync bookmarks
    for (const folder of chromeFolders) {
      const categoryName = `${config.categoryPrefix ? config.categoryPrefix + ' · ' : ''}${folder.title}`;

      // Find or create category
      let categoryId = syncMap.categories[folder.id];
      let existingCat = categoryId
        ? clockData.categories.find(c => c.id === categoryId)
        : null;

      if (!existingCat) {
        // Create new category
        const result = await apiCall(config, 'POST', '/api/bookmarks/categories', {
          name: categoryName,
        });
        categoryId = result.category.id;
        syncMap.categories[folder.id] = categoryId;
        existingCat = result.category;
      }

      // 4. Sync bookmarks in this folder
      const chromeBookmarks = (folder.children || []).filter(c => c.url);
      const existingBookmarks = existingCat.bookmarks || [];

      // Track URLs already in Clock Page for this category
      const existingUrls = new Set(existingBookmarks.map(b => b.url));
      const chromeUrls = new Set(chromeBookmarks.map(b => b.url));

      // Add new bookmarks from Chrome
      for (const cb of chromeBookmarks) {
        if (!existingUrls.has(cb.url)) {
          const result = await apiCall(config, 'POST',
            `/api/bookmarks/categories/${categoryId}/bookmarks`, {
              name: cb.title || cb.url,
              url: cb.url,
              icon: 'default',
              color: '#6366f1',
            });
          syncMap.bookmarks[cb.id] = result.bookmark.id;
          console.log(`[Seonology Sync] Added: ${cb.title}`);
        }
      }

      // Remove bookmarks that were deleted from Chrome
      for (const eb of existingBookmarks) {
        if (!chromeUrls.has(eb.url)) {
          // Check if this bookmark was synced from Chrome (not manually added)
          const isSynced = Object.values(syncMap.bookmarks).includes(eb.id);
          if (isSynced) {
            await apiCall(config, 'DELETE',
              `/api/bookmarks/categories/${categoryId}/bookmarks/${eb.id}`);
            // Remove from syncMap
            for (const [chromeId, clockId] of Object.entries(syncMap.bookmarks)) {
              if (clockId === eb.id) {
                delete syncMap.bookmarks[chromeId];
                break;
              }
            }
            console.log(`[Seonology Sync] Removed: ${eb.name}`);
          }
        }
      }
    }

    // 5. Save sync state
    await setSyncMap(syncMap);
    await setConfig({ lastSync: new Date().toISOString() });
    console.log('[Seonology Sync] Full sync complete');

    // Notify popup if open
    chrome.runtime.sendMessage({ type: 'syncComplete', success: true }).catch(() => {});
  } catch (err) {
    console.error('[Seonology Sync] Full sync failed:', err);
    chrome.runtime.sendMessage({ type: 'syncComplete', success: false, error: err.message }).catch(() => {});
  }
}

// ===== Incremental sync: bookmark added =====
async function onBookmarkCreated(id, bookmark) {
  const config = await getConfig();
  if (!config.enabled || !bookmark.url) return;

  // Check if this bookmark's parent folder is in syncFolders
  if (!config.syncFolders.includes(bookmark.parentId)) return;

  const syncMap = await getSyncMap();
  const categoryId = syncMap.categories[bookmark.parentId];
  if (!categoryId) {
    // Folder not yet synced, trigger full sync
    return fullSync();
  }

  try {
    const result = await apiCall(config, 'POST',
      `/api/bookmarks/categories/${categoryId}/bookmarks`, {
        name: bookmark.title || bookmark.url,
        url: bookmark.url,
        icon: 'default',
        color: '#6366f1',
      });
    syncMap.bookmarks[id] = result.bookmark.id;
    await setSyncMap(syncMap);
    console.log(`[Seonology Sync] Real-time add: ${bookmark.title}`);
  } catch (err) {
    console.error('[Seonology Sync] Failed to add bookmark:', err);
  }
}

// ===== Incremental sync: bookmark removed =====
async function onBookmarkRemoved(id, removeInfo) {
  const config = await getConfig();
  if (!config.enabled) return;

  const syncMap = await getSyncMap();

  // Check if it was a synced bookmark
  const clockBookmarkId = syncMap.bookmarks[id];
  if (clockBookmarkId) {
    // Find which category it belongs to
    const parentFolderId = Object.keys(syncMap.categories).find(folderId =>
      config.syncFolders.includes(folderId)
    );
    // We need to find the right category - try all synced categories
    for (const [folderId, catId] of Object.entries(syncMap.categories)) {
      try {
        await apiCall(config, 'DELETE',
          `/api/bookmarks/categories/${catId}/bookmarks/${clockBookmarkId}`);
        delete syncMap.bookmarks[id];
        await setSyncMap(syncMap);
        console.log(`[Seonology Sync] Real-time remove: ${id}`);
        return;
      } catch {
        // Not in this category, try next
      }
    }
  }

  // Check if it was a synced folder (category)
  const clockCategoryId = syncMap.categories[id];
  if (clockCategoryId) {
    try {
      await apiCall(config, 'DELETE', `/api/bookmarks/categories/${clockCategoryId}`);
      delete syncMap.categories[id];
      await setSyncMap(syncMap);
      console.log(`[Seonology Sync] Real-time remove folder: ${id}`);
    } catch (err) {
      console.error('[Seonology Sync] Failed to remove category:', err);
    }
  }
}

// ===== Incremental sync: bookmark changed =====
async function onBookmarkChanged(id, changeInfo) {
  const config = await getConfig();
  if (!config.enabled) return;

  const syncMap = await getSyncMap();
  const clockBookmarkId = syncMap.bookmarks[id];
  if (!clockBookmarkId) return;

  // Find the category
  for (const [folderId, catId] of Object.entries(syncMap.categories)) {
    try {
      const updates = {};
      if (changeInfo.title) updates.name = changeInfo.title;
      if (changeInfo.url) updates.url = changeInfo.url;

      if (Object.keys(updates).length > 0) {
        await apiCall(config, 'PATCH',
          `/api/bookmarks/categories/${catId}/bookmarks/${clockBookmarkId}`, updates);
        console.log(`[Seonology Sync] Real-time update: ${changeInfo.title || id}`);
        return;
      }
    } catch {
      // Not in this category, try next
    }
  }
}

// ===== Incremental sync: bookmark moved =====
async function onBookmarkMoved(id, moveInfo) {
  const config = await getConfig();
  if (!config.enabled) return;

  const syncMap = await getSyncMap();
  const wasInSync = config.syncFolders.includes(moveInfo.oldParentId);
  const nowInSync = config.syncFolders.includes(moveInfo.parentId);

  if (wasInSync && !nowInSync) {
    // Moved out of synced folder → remove from Clock Page
    onBookmarkRemoved(id, {});
  } else if (!wasInSync && nowInSync) {
    // Moved into synced folder → add to Clock Page
    const [bookmark] = await chrome.bookmarks.get(id);
    if (bookmark) onBookmarkCreated(id, { ...bookmark, parentId: moveInfo.parentId });
  } else if (wasInSync && nowInSync && moveInfo.oldParentId !== moveInfo.parentId) {
    // Moved between synced folders → remove from old, add to new
    onBookmarkRemoved(id, {});
    const [bookmark] = await chrome.bookmarks.get(id);
    if (bookmark) onBookmarkCreated(id, { ...bookmark, parentId: moveInfo.parentId });
  }
}

// ===== Event listeners =====
chrome.bookmarks.onCreated.addListener(onBookmarkCreated);
chrome.bookmarks.onRemoved.addListener(onBookmarkRemoved);
chrome.bookmarks.onChanged.addListener(onBookmarkChanged);
chrome.bookmarks.onMoved.addListener(onBookmarkMoved);

// ===== Periodic full sync via alarms =====
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'periodicSync') {
    await fullSync();
  }
});

// Setup alarm on install/startup
chrome.runtime.onInstalled.addListener(async () => {
  const config = await getConfig();
  chrome.alarms.create('periodicSync', {
    periodInMinutes: config.syncIntervalMin,
  });
  console.log('[Seonology Sync] Extension installed');
});

chrome.runtime.onStartup.addListener(async () => {
  const config = await getConfig();
  chrome.alarms.create('periodicSync', {
    periodInMinutes: config.syncIntervalMin,
  });
});

// ===== Message handler (from popup) =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fullSync') {
    fullSync().then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
  if (message.type === 'getBookmarkTree') {
    chrome.bookmarks.getTree().then(tree => sendResponse(tree))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === 'updateAlarm') {
    chrome.alarms.create('periodicSync', {
      periodInMinutes: message.intervalMin || 5,
    });
    sendResponse({ success: true });
  }
});
