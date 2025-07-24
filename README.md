# ApplyToMation - Chrome Extension for Job Application Automation

A Chrome extension that automatically fills job application forms using your saved profile data. Built as a SaaS solution with user authentication and cloud storage via Supabase.

## Features

- **Smart Form Detection**: Automatically detects and maps form fields on popular job portals
- **Profile Management**: Cloud-based user profiles with secure authentication
- **Auto-Fill Forms**: One-click form filling with your personal and professional data
- **Application Tracking**: Keep track of all your job applications
- **Multi-Site Support**: Works with LinkedIn, Indeed, Glassdoor, Workday, and more
- **Usage Analytics**: Track your application activity and progress

## Supported Job Portals

- LinkedIn
- Indeed
- Glassdoor
- Monster
- ZipRecruiter
- Jobvite
- Workday
- Greenhouse
- Lever
- BambooHR

## Setup Instructions

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project settings and copy the URL and anon key
3. Run the SQL commands from `extension/lib/database-schema.sql` in your Supabase SQL editor
4. Enable the authentication providers you want to use (Google, etc.) in Authentication > Providers

### 2. Configure the Extension

1. Open `extension/lib/supabase-client.js`
2. Replace `YOUR_SUPABASE_URL` with your Supabase project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your Supabase anon key

### 3. Create Extension Icons (Optional)

Create the following icon files in `extension/assets/`:
- `icon16.png` (16x16px)
- `icon32.png` (32x32px) 
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

Or use any 16x16, 32x32, 48x48, and 128x128 pixel PNG icons for now.

### 4. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `extension` folder
4. The ApplyToMation extension should now appear in your extensions list

### 5. Set up Authentication (Optional - for OAuth)

If you want to use Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add your Chrome extension ID to authorized origins
6. Configure the OAuth settings in Supabase Authentication settings

## Usage

1. **First Time Setup**:
   - Click the ApplyToMation icon to open the sidebar
   - Sign up for an account or log in
   - Fill out your profile information

2. **Using the Extension**:
   - Navigate to any supported job portal
   - Click on a job application form
   - Click the ApplyToMation icon to open the sidebar
   - Click "Scan Page" to detect form fields
   - Click "Fill Form" to automatically populate the form
   - Review and submit your application

3. **Managing Your Profile**:
   - Use the Profile tab to update your information
   - Upload your resume for easy access
   - Track your applications in the History tab

## Project Structure

```
extension/
├── manifest.json              # Extension configuration
├── sidebar/
│   ├── panel.html            # Sidebar UI
│   ├── panel.css             # Sidebar styling
│   └── panel.js              # Sidebar functionality
├── content/
│   └── form-detector.js      # Form detection and filling logic
├── background/
│   └── service-worker.js     # Background service worker
├── lib/
│   ├── supabase-client.js    # Supabase integration
│   └── database-schema.sql   # Database setup
└── assets/
    ├── icon16.png            # Extension icons
    ├── icon32.png
    ├── icon48.png
    ├── icon128.png
    └── google-icon.svg       # OAuth button icon
```

## Database Schema

The extension uses the following Supabase tables:

- **profiles**: User profile information (personal/professional data)
- **applications**: Job application tracking
- **form_templates**: Site-specific form field mappings
- **subscriptions**: User subscription and usage data

## Security Features

- Row Level Security (RLS) enabled on all tables
- JWT-based authentication
- Encrypted data storage
- HTTPS-only communication
- Chrome extension content security policy

## Development

### Technologies Used

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Authentication**: Supabase Auth with JWT
- **Storage**: Supabase Storage for file uploads
- **Real-time**: Supabase Realtime for live updates

### Adding New Job Portals

To add support for a new job portal:

1. Add the domain to `manifest.json` in `host_permissions` and `content_scripts.matches`
2. Add site-specific selectors to the `getFieldMappings()` method in `form-detector.js`
3. Test the form detection and filling on the new site
4. Add the site to the `getCurrentSite()` method for site-specific handling

## Subscription Plans

- **Free**: 10 applications per month
- **Premium**: Unlimited applications, advanced features
- **Enterprise**: Team features, analytics, custom integrations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on multiple job portals
5. Submit a pull request

## Support

For issues and support:
1. Check the browser console for error messages
2. Verify your Supabase configuration
3. Ensure you're on a supported job portal
4. Check that all required permissions are granted

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Privacy Policy

ApplyToMation respects your privacy:
- Your data is stored securely in Supabase
- We only access form fields you explicitly fill
- No personal data is shared with third parties
- You can delete your account and data at any time

## Roadmap

- [ ] AI-powered form field detection
- [ ] Custom field mapping interface
- [ ] Bulk application features
- [ ] Application status tracking
- [ ] Email integration
- [ ] Mobile app version
- [ ] Team collaboration features
- [ ] Advanced analytics dashboard