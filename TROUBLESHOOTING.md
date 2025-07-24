# ApplyToMation Extension Troubleshooting Guide

## Common Issues and Solutions

### 1. "Unable to download all specified images" Error

This error typically occurs when the Chrome extension cannot load its icon files properly.

**Solution:**
1. Make sure all icon files exist in the `extension/assets/` directory:
   - `icon16.png` (16x16px)
   - `icon32.png` (32x32px)
   - `icon48.png` (48x48px)
   - `icon128.png` (128x128px)

2. Verify the manifest.json has proper icon definitions:
   ```json
   {
     "icons": {
       "16": "assets/icon16.png",
       "32": "assets/icon32.png",
       "48": "assets/icon48.png",
       "128": "assets/icon128.png"
     },
     "action": {
       "default_icon": {
         "16": "assets/icon16.png",
         "32": "assets/icon32.png",
         "48": "assets/icon48.png",
         "128": "assets/icon128.png"
       }
     }
   }
   ```

3. Reload the extension:
   - Go to `chrome://extensions/`
   - Find ApplyToMation
   - Click the refresh/reload button
   - Or disable and re-enable the extension

### 2. Extension Not Loading

**Check:**
1. Open Chrome DevTools (F12)
2. Go to the Console tab
3. Look for any error messages
4. Check the Extensions tab for any errors

**Common causes:**
- Missing files in the extension directory
- Syntax errors in JavaScript files
- Invalid manifest.json

### 3. Content Script Not Working

**Test:**
1. Open the test page: `extension/test-extension.html`
2. Check if the extension status shows as loaded
3. Verify form fields are detected

**If not working:**
1. Check browser console for errors
2. Verify the content script is being injected
3. Make sure you're on a supported job portal

### 4. Supabase Connection Issues

**Check:**
1. Verify your Supabase URL and API key in `extension/lib/supabase-client.js`
2. Ensure your Supabase project is active
3. Check if the database schema has been set up

### 5. Form Detection Not Working

**Troubleshooting:**
1. Make sure you're on a supported job portal
2. Check if the form has standard input fields
3. Try refreshing the page
4. Check browser console for any errors

### 6. Permission Issues

**Verify permissions in manifest.json:**
```json
{
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "sidePanel",
    "notifications"
  ]
}
```

### 7. Extension Icon Not Appearing

**Check:**
1. Verify icon files exist and are valid PNG files
2. Check file sizes (should be reasonable, not too large)
3. Ensure proper file paths in manifest.json

## Testing the Extension

1. **Load the extension:**
   - Open Chrome
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the `extension` folder

2. **Test basic functionality:**
   - Open `extension/test-extension.html` in a new tab
   - Check if the extension status shows as working
   - Try the form detection

3. **Test on job portals:**
   - Go to LinkedIn, Indeed, or another supported site
   - Navigate to a job application form
   - Click the extension icon to open the sidebar
   - Try scanning and filling forms

## Debug Mode

To enable debug logging:

1. Open Chrome DevTools
2. Go to the Console tab
3. Look for messages starting with "ApplyToMation"
4. Check for any error messages

## Common Error Messages

- **"Extension not detected"**: Extension not loaded or disabled
- **"Communication failed"**: Background script not responding
- **"No form fields detected"**: Content script not working or no forms found
- **"Authentication failed"**: Supabase connection issues

## Getting Help

If you're still experiencing issues:

1. Check the browser console for specific error messages
2. Verify all files are present in the extension directory
3. Try reloading the extension
4. Check if the issue occurs on all sites or just specific ones

## File Structure Check

Ensure your extension directory has this structure:
```
extension/
├── manifest.json
├── background/
│   └── service-worker.js
├── content/
│   └── form-detector.js
├── sidebar/
│   ├── panel.html
│   ├── panel.css
│   └── panel.js
├── lib/
│   └── supabase-client.js
├── assets/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── google-icon.svg
└── test-extension.html
``` 