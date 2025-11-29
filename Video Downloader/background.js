// Background service worker for Chrome extension
// Handles background tasks and maintains extension lifecycle

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Video Downloader Pro installed');
    
    // Set default settings
    chrome.storage.sync.set({
      apiUrl: 'https://uni.isuruhub.site:8443'
    });
    
    // Create context menus
    createContextMenus();
  } else if (details.reason === 'update') {
    console.log('Video Downloader Pro updated to version', chrome.runtime.getManifest().version);
    createContextMenus();
  }
});

// Create context menu items
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'downloadVideo',
      title: 'Download Video',
      contexts: ['page', 'link', 'video', 'audio']
    });
    
    chrome.contextMenus.create({
      id: 'downloadAudio',
      title: 'Download Audio Only',
      contexts: ['page', 'link', 'video', 'audio']
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let url = info.linkUrl || info.srcUrl || info.pageUrl;
  
  chrome.storage.local.set({
    pendingDownload: {
      url: url,
      type: info.menuItemId === 'downloadAudio' ? 'audio' : 'video',
      timestamp: Date.now()
    }
  });
  
  // Open the popup by sending message
  chrome.action.openPopup();
});

// Handle context menu (optional - for future enhancement)
// This could allow right-click download functionality

// Keep service worker alive if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'alive' });
  }
  return true;
});

// Handle extension icon click (optional - for analytics)
chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked on tab:', tab.id);
});

// Store detected media URLs
let detectedMediaCache = new Map();

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'alive' });
  } else if (request.action === 'mediaDetected') {
    // Store detected media
    const tabId = sender.tab?.id;
    if (tabId) {
      if (!detectedMediaCache.has(tabId)) {
        detectedMediaCache.set(tabId, []);
      }
      
      const mediaList = detectedMediaCache.get(tabId);
      const mediaData = request.data;
      
      // Avoid duplicates
      const exists = mediaList.some(m => m.url === mediaData.url);
      if (!exists) {
        mediaList.push(mediaData);
        console.log('Media detected:', mediaData.url);
        
        // Update badge with count
        updateBadge(tabId, mediaList.length);
      }
    }
    sendResponse({ status: 'received' });
  } else if (request.action === 'getDetectedMedia') {
    // Send detected media to popup
    const tabId = request.tabId;
    const media = detectedMediaCache.get(tabId) || [];
    sendResponse({ media: media });
  }
  return true;
});

// Update extension badge
function updateBadge(tabId, count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString(), tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#667eea', tabId: tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId: tabId });
  }
}

// Clear cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  detectedMediaCache.delete(tabId);
});

// Clear cache when tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    detectedMediaCache.delete(tabId);
    updateBadge(tabId, 0);
  }
});

console.log('Video Downloader Pro background service worker initialized');
