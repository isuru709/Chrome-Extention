// Content script for advanced video/audio detection
// Injected into all web pages to detect media elements

(function() {
  'use strict';

  // Detected media URLs
  let detectedMedia = new Set();
  let observers = [];

  // Common video/audio URL patterns
  const mediaPatterns = [
    /\.(mp4|webm|ogg|mp3|m4a|wav|flac|aac|m3u8|mpd)(\?.*)?$/i,
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /vimeo\.com\//i,
    /dailymotion\.com\//i,
    /twitch\.tv\//i,
    /tiktok\.com\//i,
    /facebook\.com\/.*\/videos\//i,
    /instagram\.com\/(p|reel|tv)\//i,
    /twitter\.com\/.*\/status\//i,
    /x\.com\/.*\/status\//i,
    /streamable\.com\//i,
    /imgur\.com\/.*\.(mp4|gifv)/i,
    /gfycat\.com\//i,
    /redgifs\.com\//i,
    /reddit\.com\/.*\/comments\//i,
    /v\.redd\.it\//i,
    /soundcloud\.com\//i,
    /spotify\.com\/track\//i,
    /bandcamp\.com\/track\//i,
    /mixcloud\.com\//i
  ];

  // Stream URL patterns (HLS, DASH, etc.)
  const streamPatterns = [
    /\.m3u8/i,
    /\.mpd/i,
    /manifest\.(m3u8|mpd)/i,
    /playlist\.m3u8/i,
    /master\.m3u8/i
  ];

  // Detect media from various sources
  function detectMediaElements() {
    const media = [];

    // 1. iframes with video URLs (page URLs only, no blobs)
    document.querySelectorAll('iframe').forEach(iframe => {
      if (iframe.src && isMediaURL(iframe.src)) {
        const title = iframe.title || iframe.getAttribute('aria-label') || null;
        media.push({ url: iframe.src, type: 'iframe', element: 'iframe', title: title });
      }
    });

    // 2. Links to video/audio files (no blobs)
    document.querySelectorAll('a[href]').forEach(link => {
      if (isMediaURL(link.href)) {
        const title = link.textContent.trim() || link.title || link.getAttribute('aria-label') || null;
        media.push({ url: link.href, type: 'link', element: 'anchor', title: title });
      }
    });

    // 3. Open Graph and Twitter Card meta tags
    document.querySelectorAll('meta[property*="video"], meta[property*="audio"], meta[name*="twitter:player"]').forEach(meta => {
      const content = meta.getAttribute('content');
      if (content && isMediaURL(content)) {
        // Try to find associated title meta tag
        const titleMeta = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]');
        const title = titleMeta ? titleMeta.getAttribute('content') : null;
        media.push({ url: content, type: 'meta', element: 'og/twitter', title: title });
      }
    });

    // 4. JSON-LD structured data
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        extractMediaFromJSON(data, media);
      } catch (e) {}
    });

    return media;
  }

  // Check if URL is a media URL
  function isMediaURL(url) {
    if (!url) return false;
    
    // Filter out blob, data, and chrome URLs
    if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('chrome:') || url.startsWith('chrome-extension:')) {
      return false;
    }
    
    try {
      const urlObj = new URL(url, window.location.href);
      
      // Additional check: must be http or https
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return false;
      }
      
      return mediaPatterns.some(pattern => pattern.test(urlObj.href));
    } catch {
      return false;
    }
  }

  // Extract media URLs from JSON data
  function extractMediaFromJSON(obj, media) {
    if (!obj || typeof obj !== 'object') return;
    
    for (let key in obj) {
      if (typeof obj[key] === 'string' && isMediaURL(obj[key])) {
        media.push({ url: obj[key], type: 'json-ld', element: 'structured-data' });
      } else if (typeof obj[key] === 'object') {
        extractMediaFromJSON(obj[key], media);
      }
    }
  }

  // Intercept network requests (XMLHttpRequest)
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._requestURL = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    if (this._requestURL && (isMediaURL(this._requestURL) || isStreamURL(this._requestURL))) {
      detectedMedia.add(this._requestURL);
      notifyExtension({ url: this._requestURL, type: 'xhr', method: 'network' });
    }
    return originalSend.apply(this, arguments);
  };

  // Intercept Fetch API
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (url && (isMediaURL(url) || isStreamURL(url))) {
      detectedMedia.add(url);
      notifyExtension({ url: url, type: 'fetch', method: 'network' });
    }
    return originalFetch.apply(this, args);
  };

  // Check if URL is a streaming URL
  function isStreamURL(url) {
    if (!url) return false;
    
    // Filter out blob URLs
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return false;
    }
    
    return streamPatterns.some(pattern => pattern.test(url));
  }

  // Monitor DOM changes for dynamically loaded videos
  function observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      for (let mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO' || node.tagName === 'IFRAME') {
                shouldScan = true;
              }
            }
          });
        }
      }
      
      if (shouldScan) {
        scanAndNotify();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    observers.push(observer);
  }

  // Scan and notify extension
  function scanAndNotify() {
    const media = detectMediaElements();
    
    media.forEach(item => {
      if (!detectedMedia.has(item.url)) {
        detectedMedia.add(item.url);
        notifyExtension(item);
      }
    });
  }

  // Send detected media to extension
  function notifyExtension(mediaInfo) {
    chrome.runtime.sendMessage({
      action: 'mediaDetected',
      data: {
        url: mediaInfo.url,
        pageUrl: window.location.href,
        pageTitle: document.title,
        title: mediaInfo.title || document.title,
        type: mediaInfo.type,
        element: mediaInfo.element,
        timestamp: Date.now()
      }
    }).catch(err => {
      // Extension context might be invalidated
      console.debug('Could not send to extension:', err);
    });
  }

  // Listen for messages from extension
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getMedia') {
      const media = detectMediaElements();
      sendResponse({ 
        media: media,
        detectedCount: detectedMedia.size,
        pageUrl: window.location.href,
        pageTitle: document.title
      });
    } else if (request.action === 'rescan') {
      scanAndNotify();
      sendResponse({ status: 'rescanned' });
    }
    return true;
  });

  // Initialize detection
  function initialize() {
    // Initial scan
    setTimeout(() => {
      scanAndNotify();
    }, 1000);

    // Observe DOM changes
    if (document.body) {
      observeDOMChanges();
    } else {
      document.addEventListener('DOMContentLoaded', observeDOMChanges);
    }

    // Rescan periodically for dynamically loaded content
    setInterval(() => {
      scanAndNotify();
    }, 5000);

    // Scan when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        scanAndNotify();
      }
    });
  }

  // Start detection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Cleanup on unload
  window.addEventListener('unload', () => {
    observers.forEach(obs => obs.disconnect());
    observers = [];
  });

})();
