// Default API URL
const DEFAULT_API_URL = 'https://uni.isuruhub.site:8443';

// State management
let currentJobId = null;
let pollingInterval = null;
let apiUrl = DEFAULT_API_URL;

// DOM Elements
const urlInput = document.getElementById('urlInput');
const autoFillBtn = document.getElementById('autoFillBtn');
const downloadTypeRadios = document.querySelectorAll('input[name="downloadType"]');
const videoQualitySection = document.getElementById('videoQualitySection');
const audioQualitySection = document.getElementById('audioQualitySection');
const videoQualitySelect = document.getElementById('videoQuality');
const audioQualitySelect = document.getElementById('audioQuality');
const customCookiesTextarea = document.getElementById('customCookies');
const downloadBtn = document.getElementById('downloadBtn');
const btnText = document.getElementById('btnText');
const statusSection = document.getElementById('statusSection');
const statusBox = document.getElementById('statusBox');
const statusMessage = document.getElementById('statusMessage');
const spinner = document.getElementById('spinner');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const resultSection = document.getElementById('resultSection');
const resultBox = document.getElementById('resultBox');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');
const downloadLink = document.getElementById('downloadLink');

// Detected media elements
const detectedMediaSection = document.getElementById('detectedMediaSection');
const detectedMediaSelect = document.getElementById('detectedMediaSelect');

// Collapsible cookies section
const cookiesToggle = document.getElementById('cookiesToggle');
const cookiesContent = document.getElementById('cookiesContent');

// Settings
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const saveSettings = document.getElementById('saveSettings');
const apiUrlInput = document.getElementById('apiUrlInput');

// Load saved API URL from storage
chrome.storage.sync.get(['apiUrl'], (result) => {
  if (result.apiUrl) {
    apiUrl = result.apiUrl;
    apiUrlInput.value = apiUrl;
  }
});

// Check for pending download from context menu
chrome.storage.local.get(['pendingDownload'], (result) => {
  if (result.pendingDownload) {
    const pending = result.pendingDownload;
    // Only use if less than 30 seconds old
    if (Date.now() - pending.timestamp < 30000) {
      urlInput.value = pending.url;
      
      // Set download type
      const typeRadio = document.querySelector(`input[name="downloadType"][value="${pending.type}"]`);
      if (typeRadio) {
        typeRadio.checked = true;
        typeRadio.dispatchEvent(new Event('change'));
      }
    }
    // Clear pending download
    chrome.storage.local.remove('pendingDownload');
  }
});

// Auto-detect video URLs on popup open
(async function detectVideo() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;
    
    const url = tab.url;
    
    // Check if URL is from a supported video platform
    const videoPatterns = [
      /youtube\.com\/watch/i,
      /youtu\.be\//i,
      /youtube\.com\/shorts/i,
      /vimeo\.com\//i,
      /dailymotion\.com\//i,
      /twitch\.tv\//i,
      /tiktok\.com\//i,
      /facebook\.com\/watch/i,
      /instagram\.com\/(p|reel|tv)\//i,
      /twitter\.com\/.+\/status\//i,
      /x\.com\/.+\/status\//i
    ];
    
    const isVideoURL = videoPatterns.some(pattern => pattern.test(url));
    
    if (isVideoURL && !urlInput.value) {
      urlInput.value = url;
      urlInput.style.borderColor = 'var(--success)';
      showStatus('Video detected on current page!', 'success');
      setTimeout(() => hideStatus(), 2000);
    }
    
    // Load detected media from content script
    loadDetectedMedia(tab.id);
  } catch (error) {
    console.error('Error detecting video:', error);
  }
})();

// Load detected media from content script
async function loadDetectedMedia(tabId) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getDetectedMedia',
      tabId: tabId
    });
    
    if (response && response.media && response.media.length > 0) {
      // Populate dropdown
      detectedMediaSelect.innerHTML = '<option value="">-- Select detected media --</option>';
      
      response.media.forEach((media, index) => {
        const option = document.createElement('option');
        option.value = media.url;
        
        // Create a friendly display name
        let displayName = '';
        
        if (media.title && media.title !== media.pageTitle) {
          // Use media-specific title if available
          displayName = media.title;
        } else if (media.pageTitle) {
          // Use page title
          displayName = media.pageTitle;
        } else {
          // Fallback to shortened URL
          displayName = media.url.length > 40 ? media.url.substring(0, 40) + '...' : media.url;
        }
        
        // Add type indicator
        const typeIcon = media.type === 'iframe' ? '🎬' : 
                        media.type === 'link' ? '🔗' : 
                        media.type === 'meta' ? '📄' : 
                        media.type === 'json-ld' ? '📋' :
                        media.type === 'xhr' ? '📡' :
                        media.type === 'fetch' ? '🌐' : '📹';
        
        option.textContent = `${typeIcon} ${displayName}`;
        option.title = media.url; // Show full URL on hover
        detectedMediaSelect.appendChild(option);
      });
      
      detectedMediaSection.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error loading detected media:', error);
  }
}

// Handle detected media selection
detectedMediaSelect.addEventListener('change', (e) => {
  if (e.target.value) {
    urlInput.value = e.target.value;
    urlInput.focus();
  }
});

// Auto-fill URL from current tab
autoFillBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      urlInput.value = tab.url;
      urlInput.focus();
    }
  } catch (error) {
    console.error('Error getting current tab:', error);
  }
});

// Toggle download type sections
downloadTypeRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'video') {
      videoQualitySection.classList.remove('hidden');
      audioQualitySection.classList.add('hidden');
    } else {
      videoQualitySection.classList.add('hidden');
      audioQualitySection.classList.remove('hidden');
    }
  });
});

// Collapsible cookies section
cookiesToggle.addEventListener('click', () => {
  cookiesToggle.classList.toggle('active');
  cookiesContent.classList.toggle('active');
});

// Settings modal
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
});

closeSettings.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add('hidden');
  }
});

saveSettings.addEventListener('click', () => {
  const newApiUrl = apiUrlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash
  if (!newApiUrl) {
    alert('Please enter a valid API URL');
    return;
  }
  
  apiUrl = newApiUrl;
  chrome.storage.sync.set({ apiUrl: newApiUrl }, () => {
    showStatus('Settings saved successfully!', 'success');
    setTimeout(() => {
      settingsModal.classList.add('hidden');
      hideStatus();
    }, 1500);
  });
});

// Main download function
downloadBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  
  if (!url) {
    showStatus('Please enter a video URL', 'error');
    return;
  }
  
  // Validate URL
  try {
    new URL(url);
  } catch {
    showStatus('Please enter a valid URL', 'error');
    return;
  }
  
  // Get download parameters
  const downloadType = document.querySelector('input[name="downloadType"]:checked').value;
  const maxHeight = downloadType === 'video' && videoQualitySelect.value ? parseInt(videoQualitySelect.value) : null;
  const audioBitrate = downloadType === 'audio' ? parseInt(audioQualitySelect.value) : 192;
  let customCookies = customCookiesTextarea.value.trim() || null;
  
  // Auto-capture cookies if not manually provided
  if (!customCookies) {
    customCookies = await captureCookiesForURL(url);
  }
  
  // Prepare request payload
  const payload = {
    url: url,
    kind: downloadType,
    audio_bitrate: audioBitrate
  };
  
  if (maxHeight) {
    payload.max_height = maxHeight;
  }
  
  if (customCookies) {
    payload.custom_cookies = customCookies;
  }
  
  // Start download
  await startDownload(payload);
});

// Capture cookies from the target domain
async function captureCookiesForURL(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // Get all cookies for this domain
    const cookies = await chrome.cookies.getAll({ domain: domain });
    
    // Also try without subdomain (e.g., .youtube.com)
    const mainDomain = domain.split('.').slice(-2).join('.');
    const mainDomainCookies = await chrome.cookies.getAll({ domain: mainDomain });
    
    // Combine and deduplicate
    const allCookies = [...cookies, ...mainDomainCookies];
    const uniqueCookies = Array.from(
      new Map(allCookies.map(c => [c.name, c])).values()
    );
    
    if (uniqueCookies.length === 0) {
      return null;
    }
    
    // Convert to Netscape format
    let netscapeCookies = '# Netscape HTTP Cookie File\n';
    
    for (const cookie of uniqueCookies) {
      const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain : '.' + cookie.domain;
      const flag = 'TRUE';
      const path = cookie.path || '/';
      const secure = cookie.secure ? 'TRUE' : 'FALSE';
      const expiration = cookie.expirationDate ? Math.floor(cookie.expirationDate) : '0';
      const name = cookie.name;
      const value = cookie.value;
      
      netscapeCookies += `${cookieDomain}\t${flag}\t${path}\t${secure}\t${expiration}\t${name}\t${value}\n`;
    }
    
    console.log(`Captured ${uniqueCookies.length} cookies for ${domain}`);
    return netscapeCookies;
    
  } catch (error) {
    console.error('Error capturing cookies:', error);
    return null;
  }
}

async function startDownload(payload) {
  try {
    // Disable button and show loading
    downloadBtn.disabled = true;
    btnText.textContent = 'Starting...';
    hideResult();
    showStatus('Initiating download...', 'info', true);
    
    // Make API request
    const response = await fetch(`${apiUrl}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }
    
    const data = await response.json();
    currentJobId = data.id || data.job_id;
    
    if (!currentJobId) {
      throw new Error('Server did not return a job ID');
    }
    
    showStatus('Download in progress...', 'info', true);
    
    // Start polling for status
    startPolling();
    
  } catch (error) {
    console.error('Download error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    resetButton();
  }
}

function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/jobs/${currentJobId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.status}`);
      }
      
      const status = await response.json();
      handleStatusUpdate(status);
      
    } catch (error) {
      console.error('Polling error:', error);
      stopPolling();
      showStatus(`Error checking status: ${error.message}`, 'error');
      resetButton();
    }
  }, 2000); // Poll every 2 seconds
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function handleStatusUpdate(status) {
  switch (status.status) {
    case 'queued':
    case 'pending':
      showStatus('Waiting to start...', 'info', true);
      break;
      
    case 'downloading':
      const progressText = status.progress 
        ? `Downloading... ${status.progress}%` 
        : 'Downloading...';
      showStatus(progressText, 'info', true);
      
      if (status.progress) {
        progressBar.classList.remove('hidden');
        progressFill.style.width = `${status.progress}%`;
      }
      break;
      
    case 'processing':
      showStatus('Processing file...', 'info', true);
      progressBar.classList.add('hidden');
      break;
      
    case 'finished':
    case 'completed':
      stopPolling();
      hideStatus();
      showResult(status);
      resetButton();
      break;
      
    case 'error':
    case 'failed':
      stopPolling();
      const errorMsg = status.message || status.error || 'Download failed';
      showStatus(errorMsg, 'error');
      resetButton();
      break;
      
    default:
      showStatus(status.message || 'Processing...', 'info', true);
  }
}

function showResult(status) {
  resultSection.classList.remove('hidden');
  resultBox.classList.remove('error');
  resultBox.classList.add('success');
  
  resultTitle.textContent = 'Download Complete!';
  
  if (status.file_name) {
    resultMessage.textContent = `File: ${status.file_name}`;
  } else {
    resultMessage.textContent = 'Your file is ready';
  }
  
  if (status.link) {
    downloadLink.href = status.link;
    downloadLink.classList.remove('hidden');
  } else {
    downloadLink.classList.add('hidden');
  }
  
  // Scroll to result
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showStatus(message, type = 'info', showSpinner = false) {
  statusSection.classList.remove('hidden');
  statusBox.className = `status-box ${type}`;
  statusMessage.textContent = message;
  
  if (showSpinner) {
    spinner.classList.remove('hidden');
  } else {
    spinner.classList.add('hidden');
  }
  
  // Auto-hide errors after 5 seconds
  if (type === 'error') {
    setTimeout(() => {
      hideStatus();
    }, 5000);
  }
}

function hideStatus() {
  statusSection.classList.add('hidden');
  progressBar.classList.add('hidden');
  progressFill.style.width = '0%';
}

function hideResult() {
  resultSection.classList.add('hidden');
}

function resetButton() {
  downloadBtn.disabled = false;
  btnText.textContent = 'Download';
}

// Cleanup on popup close
window.addEventListener('unload', () => {
  stopPolling();
});

// Enter key to submit
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !downloadBtn.disabled) {
    downloadBtn.click();
  }
});
