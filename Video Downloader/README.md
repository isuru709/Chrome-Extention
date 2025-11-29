# Video Downloader Pro - Chrome Extension

A modern Chrome extension for downloading videos and audio from YouTube and other platforms with quality selection options.

## Features

- 🎥 **Video Downloads** - Download videos in multiple quality options (4K, 2K, 1080p, 720p, 480p, 360p)
- 🎵 **Audio Downloads** - Extract audio in MP3/AAC format with customizable bitrate
- 🎨 **Modern Interface** - Beautiful gradient design with smooth animations
- ⚡ **Quick Access** - Auto-fill URL from current tab
- 🔧 **Custom Settings** - Configure your own API server
- 🍪 **Cookie Support** - Add custom cookies for age-restricted or private videos
- 📊 **Progress Tracking** - Real-time download progress with visual feedback
- 📱 **Responsive Design** - Works perfectly in the popup window

## Installation

### Step 1: Generate Icons

1. Open `generate-icons.html` in your browser
2. Download all three icon files (icon16.png, icon48.png, icon128.png)
3. Place them in the `icons` folder

### Step 2: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the extension folder (the folder containing `manifest.json`)
5. The extension icon should appear in your Chrome toolbar

## Usage

### Basic Download

1. Click the extension icon in Chrome toolbar
2. Paste or auto-fill a video URL
3. Select download type (Video or Audio)
4. Choose quality settings
5. Click **Download**
6. Wait for completion and click **Open File** to access

### Advanced Options

#### Custom Cookies
For age-restricted or private videos:
1. Click **Advanced: Custom Cookies**
2. Paste your cookies in Netscape format
3. Proceed with download

#### API Server Configuration
To use your own server:
1. Click **Settings** at the bottom
2. Enter your API server URL
3. Click **Save Settings**

## API Server Setup

This extension requires a backend API server. The server is accessible at:

**Default URL:** `https://uni.isuruhub.site:8443`

### Server Requirements

The API server must support these endpoints:

- `POST /download` - Initiate download
  ```json
  {
    "url": "string",
    "kind": "video|audio",
    "max_height": 1080,
    "audio_bitrate": 192,
    "custom_cookies": "string (optional)"
  }
  ```

- `GET /status/{job_id}` - Check download status
  ```json
  {
    "status": "pending|downloading|processing|completed|failed",
    "progress": 0-100,
    "filename": "string",
    "file_url": "string",
    "error": "string (if failed)"
  }
  ```

## File Structure

```
chrom extention/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI
├── popup.js             # Extension logic
├── styles.css           # Modern styling
├── background.js        # Service worker
├── generate-icons.html  # Icon generator tool
├── icons/
│   ├── icon16.png      # 16x16 icon
│   ├── icon48.png      # 48x48 icon
│   └── icon128.png     # 128x128 icon
└── README.md           # This file
```

## Customization

### Change API Server
Edit the default URL in `popup.js`:
```javascript
const DEFAULT_API_URL = 'https://your-server-url';
```

### Modify Styling
Edit `styles.css` to customize colors, fonts, and layout. CSS variables are defined in `:root`:
```css
:root {
  --bg-gradient-1: #667eea;
  --bg-gradient-2: #764ba2;
  --accent-primary: #667eea;
  /* ... more variables */
}
```

### Add More Quality Options
Edit the `<select>` elements in `popup.html`:
```html
<option value="1080">Full HD (1080p)</option>
<option value="your-resolution">Your Quality</option>
```

## Troubleshooting

### Extension Not Loading
- Ensure all files are in the correct location
- Check that `manifest.json` is valid JSON
- Verify icons exist in the `icons` folder

### Downloads Not Starting
- Check API server is running and accessible
- Verify the API URL in settings
- Check browser console for errors (F12)

### Connection Errors
- Ensure CORS is properly configured on your API server
- Verify network connectivity to the API server
- Check that the API server URL includes protocol (http:// or https://)

### Icons Not Showing
- Generate PNG icons using `generate-icons.html`
- Ensure icons are placed in `icons` folder
- Reload the extension after adding icons

## Development

### Testing Changes
1. Make your code changes
2. Go to `chrome://extensions/`
3. Click the **Reload** button on your extension
4. Test the changes

### Debugging
- Right-click extension icon → **Inspect popup** to open DevTools
- View background service worker logs in `chrome://extensions/`
- Check console for JavaScript errors

## Browser Compatibility

- **Chrome:** Version 88+
- **Edge:** Version 88+
- **Brave:** Latest version
- **Opera:** Latest version

(Any Chromium-based browser with Manifest V3 support)

## Security Notes

- Never share your personal cookies publicly
- Use HTTPS for API servers in production
- Validate and sanitize all user inputs
- Keep the extension updated

## License

This extension is provided as-is for personal use.

## Support

For issues related to:
- **Extension UI/Logic:** Check browser console and extension logs
- **API Server:** Refer to your server documentation
- **Downloads failing:** Verify API server and yt-dlp installation

## Credits

Built with:
- Chrome Extensions Manifest V3
- Modern CSS with CSS Variables
- Vanilla JavaScript
- SVG Icons

---

**Version:** 1.0.0  
**Last Updated:** November 2025
