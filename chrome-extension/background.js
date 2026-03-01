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
// Deduplicates: if a parent folder is selected, skip its child folders
async function getSelectedBookmarks(config) {
  const tree = await chrome.bookmarks.getTree();
  const allFound = [];

  function findFolders(nodes, selectedIds) {
    for (const node of nodes) {
      if (selectedIds.includes(node.id)) {
        allFound.push(node);
      }
      if (node.children) {
        findFolders(node.children, selectedIds);
      }
    }
  }

  if (config.syncFolders.length > 0) {
    findFolders(tree, config.syncFolders);
  }

  // Remove child folders whose ancestor is already in the list
  const selectedIdSet = new Set(allFound.map(f => f.id));
  function hasAncestorInSet(node) {
    // Walk up using the tree to check if any ancestor folder is also selected
    for (const other of allFound) {
      if (other.id === node.id) continue;
      if (isDescendantOf(node, other)) return true;
    }
    return false;
  }
  function isDescendantOf(child, parent) {
    function search(nodes) {
      for (const n of nodes) {
        if (n.id === child.id) return true;
        if (n.children && search(n.children)) return true;
      }
      return false;
    }
    return parent.children ? search(parent.children) : false;
  }

  return allFound.filter(f => !hasAncestorInSet(f));
}

// ===== Flatten folder tree: collect all subfolders with their path =====
function flattenFolders(folder, parentPath = '') {
  const result = [];
  const currentPath = parentPath ? `${parentPath} / ${folder.title}` : folder.title;
  const bookmarks = (folder.children || []).filter(c => c.url);
  const subfolders = (folder.children || []).filter(c => !c.url && c.children);

  // Include this folder if it has bookmarks
  if (bookmarks.length > 0) {
    result.push({ id: folder.id, title: currentPath, bookmarks });
  }

  // Recurse into subfolders
  for (const sub of subfolders) {
    result.push(...flattenFolders(sub, currentPath));
  }
  return result;
}

// ===== Check if a folder is inside a synced folder (ancestor check) =====
async function findSyncAncestor(folderId, syncFolders) {
  let currentId = folderId;
  const visited = new Set();
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    if (syncFolders.includes(currentId)) return currentId;
    try {
      const [node] = await chrome.bookmarks.get(currentId);
      currentId = node.parentId;
    } catch {
      return null;
    }
  }
  return null;
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

    // 3. For each Chrome folder → flatten subfolders, ensure categories, sync bookmarks
    // Build a name→category lookup from existing Clock Page data for dedup
    const clockCatByName = new Map();
    for (const cat of clockData.categories) {
      // Store the first matching category for each name
      if (!clockCatByName.has(cat.name)) {
        clockCatByName.set(cat.name, cat);
      }
    }

    for (const folder of chromeFolders) {
      const flatList = flattenFolders(folder);

      for (const entry of flatList) {
        const categoryName = `${config.categoryPrefix ? config.categoryPrefix + ' · ' : ''}${entry.title}`;

        // Find category: 1) by syncMap ID, 2) by name match, 3) create new
        let categoryId = syncMap.categories[entry.id];
        let existingCat = categoryId
          ? clockData.categories.find(c => c.id === categoryId)
          : null;

        // Fallback: find by name if syncMap lost the mapping
        if (!existingCat) {
          existingCat = clockCatByName.get(categoryName) || null;
          if (existingCat) {
            categoryId = existingCat.id;
            syncMap.categories[entry.id] = categoryId;
            console.log(`[Seonology Sync] Relinked category by name: ${categoryName}`);
          }
        }

        // Create only if truly not found
        if (!existingCat) {
          const result = await apiCall(config, 'POST', '/api/bookmarks/categories', {
            name: categoryName,
          });
          categoryId = result.category.id;
          syncMap.categories[entry.id] = categoryId;
          existingCat = result.category;
          // Add to lookup so subsequent entries don't create duplicates
          clockCatByName.set(categoryName, existingCat);
          console.log(`[Seonology Sync] Created category: ${categoryName}`);
        }

        // 4. Sync bookmarks in this subfolder
        const chromeBookmarks = entry.bookmarks;
        const existingBookmarks = existingCat.bookmarks || [];

        const existingUrls = new Set(existingBookmarks.map(b => b.url));
        const chromeUrls = new Set(chromeBookmarks.map(b => b.url));

        // Add new bookmarks from Chrome (skip if URL already exists)
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
            existingUrls.add(cb.url); // Track to prevent within-batch duplicates
            console.log(`[Seonology Sync] Added: ${cb.title}`);
          }
        }

        // Remove bookmarks that were deleted from Chrome
        for (const eb of existingBookmarks) {
          if (!chromeUrls.has(eb.url)) {
            const isSynced = Object.values(syncMap.bookmarks).includes(eb.id);
            if (isSynced) {
              await apiCall(config, 'DELETE',
                `/api/bookmarks/categories/${categoryId}/bookmarks/${eb.id}`);
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

  // Check if this bookmark's parent (or any ancestor) is in syncFolders
  const syncAncestor = await findSyncAncestor(bookmark.parentId, config.syncFolders);
  if (!syncAncestor) return;

  const syncMap = await getSyncMap();
  const categoryId = syncMap.categories[bookmark.parentId];
  if (!categoryId) {
    // Subfolder not yet synced as category, trigger full sync to create it
    return fullSync();
  }

  try {
    // Check if URL already exists in this category to prevent duplicates
    const clockData = await apiCall(config, 'GET', '/api/bookmarks');
    const cat = clockData.categories.find(c => c.id === categoryId);
    if (cat && cat.bookmarks.some(b => b.url === bookmark.url)) {
      console.log(`[Seonology Sync] Skip duplicate: ${bookmark.title}`);
      return;
    }

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
  const wasInSync = await findSyncAncestor(moveInfo.oldParentId, config.syncFolders);
  const nowInSync = await findSyncAncestor(moveInfo.parentId, config.syncFolders);

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

// ===== Browser Stats Collection =====
async function collectAndSendStats() {
  try {
    const config = await getConfig();

    // Get all tabs across all windows
    const tabs = await chrome.tabs.query({});
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });

    // Group tabs by window
    const tabsByWindow = {};
    for (const tab of tabs) {
      if (!tabsByWindow[tab.windowId]) tabsByWindow[tab.windowId] = 0;
      tabsByWindow[tab.windowId]++;
    }

    // Get system memory info
    let memoryInfo = null;
    if (chrome.system && chrome.system.memory) {
      memoryInfo = await new Promise(resolve => {
        chrome.system.memory.getInfo(info => resolve(info));
      });
    }

    const stats = {
      tabs: {
        total: tabs.length,
        byWindow: Object.entries(tabsByWindow).map(([winId, count]) => ({ windowId: Number(winId), count })),
      },
      windows: windows.length,
      memory: memoryInfo ? {
        totalBytes: memoryInfo.capacity,
        availableBytes: memoryInfo.availableCapacity,
        usedPercent: Math.round((1 - memoryInfo.availableCapacity / memoryInfo.capacity) * 100),
      } : null,
      timestamp: new Date().toISOString(),
    };

    // Send to API
    await fetch(`${config.apiUrl}/api/browser-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats),
    });

    console.log(`[Seonology Stats] ${tabs.length} tabs, ${windows.length} windows, mem ${stats.memory?.usedPercent}%`);
  } catch (err) {
    console.error('[Seonology Stats] Error:', err.message);
  }
}

// ===== Periodic full sync via alarms =====
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'periodicSync') {
    await fullSync();
  }
  if (alarm.name === 'browserStats') {
    await collectAndSendStats();
  }
});

// Setup alarm on install/startup
chrome.runtime.onInstalled.addListener(async () => {
  const config = await getConfig();
  chrome.alarms.create('periodicSync', {
    periodInMinutes: config.syncIntervalMin,
  });
  // Browser stats every 30 seconds (minimum alarm interval is 1 min in MV3)
  chrome.alarms.create('browserStats', { periodInMinutes: 0.5 });
  // Collect stats immediately
  collectAndSendStats();
  console.log('[Seonology Sync] Extension installed');
});

chrome.runtime.onStartup.addListener(async () => {
  const config = await getConfig();
  chrome.alarms.create('periodicSync', {
    periodInMinutes: config.syncIntervalMin,
  });
  chrome.alarms.create('browserStats', { periodInMinutes: 0.5 });
  collectAndSendStats();
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
  if (message.type === 'getBrowserStats') {
    collectAndSendStats().then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});
