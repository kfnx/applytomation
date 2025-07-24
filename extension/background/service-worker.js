// ApplyToMation Background Service Worker

class ApplyToMationBackground {
  constructor() {
    this.init();
  }

  init() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstall(details);
    });

    // Handle extension startup
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });

    // Handle sidebar panel actions
    chrome.action.onClicked.addListener((tab) => {
      this.openSidePanel(tab);
    });

    // Handle messages from content scripts and sidebar
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Handle tab updates (for automatic form detection)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle session management
    this.setupSessionManagement();
  }

  handleInstall(details) {
    console.log('ApplyToMation installed:', details);
    
    if (details.reason === 'install') {
      // First time installation
      this.showWelcomeNotification();
      this.setDefaultSettings();
    } else if (details.reason === 'update') {
      // Extension updated
      this.handleUpdate(details.previousVersion);
    }
  }

  handleStartup() {
    console.log('ApplyToMation started');
    // Restore any necessary state
    this.restoreSession();
  }

  async openSidePanel(tab) {
    try {
      // Open the side panel for the current tab
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      console.error('Error opening side panel:', error);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'getAuthState':
        await this.getAuthState(sendResponse);
        break;
        
      case 'saveAuthState':
        await this.saveAuthState(message.data, sendResponse);
        break;
        
      case 'clearAuthState':
        await this.clearAuthState(sendResponse);
        break;
        
      case 'trackUsage':
        await this.trackUsage(message.data, sendResponse);
        break;
        
      case 'checkUsageLimit':
        await this.checkUsageLimit(sendResponse);
        break;
        
      case 'formDetected':
        await this.handleFormDetected(message, sender);
        break;
        
      case 'applicationSubmitted':
        await this.handleApplicationSubmitted(message, sender);
        break;
        
      case 'syncData':
        await this.syncData(sendResponse);
        break;
        
      case 'test':
        sendResponse({ success: true, message: 'Extension is working correctly' });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
        break;
    }
  }

  handleTabUpdate(tabId, changeInfo, tab) {
    // Check if we're on a supported job portal
    if (changeInfo.status === 'complete' && tab.url) {
      const supportedSites = [
        'linkedin.com',
        'indeed.com',
        'glassdoor.com',
        'monster.com',
        'ziprecruiter.com',
        'jobvite.com',
        'workday.com',
        'greenhouse.io',
        'lever.co',
        'bamboohr.com'
      ];

      const isJobSite = supportedSites.some(site => tab.url.includes(site));
      
      if (isJobSite) {
        // Inject content script if not already injected
        this.ensureContentScriptInjected(tabId);
        
        // Update badge to show we're active on this site
        this.updateBadge(tabId, 'active');
      } else {
        this.updateBadge(tabId, 'inactive');
      }
    }
  }

  async ensureContentScriptInjected(tabId) {
    try {
      // Check if content script is already injected
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => window.applyToMationInjected
      });

      if (!results[0]?.result) {
        // Inject the content script
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/form-detector.js']
        });
      }
    } catch (error) {
      console.error('Error injecting content script:', error);
    }
  }

  updateBadge(tabId, status) {
    const badgeConfig = {
      active: { text: '●', color: '#10b981' },
      inactive: { text: '', color: '#64748b' },
      error: { text: '!', color: '#ef4444' }
    };

    const config = badgeConfig[status] || badgeConfig.inactive;
    
    chrome.action.setBadgeText({ text: config.text, tabId });
    chrome.action.setBadgeBackgroundColor({ color: config.color, tabId });
  }

  // Authentication State Management
  async getAuthState(sendResponse) {
    try {
      const result = await chrome.storage.local.get(['supabase.auth.token']);
      sendResponse({ token: result['supabase.auth.token'] || null });
    } catch (error) {
      console.error('Error getting auth state:', error);
      sendResponse({ error: error.message });
    }
  }

  async saveAuthState(data, sendResponse) {
    try {
      await chrome.storage.local.set({
        'supabase.auth.token': data.token,
        'user.profile': data.profile,
        'auth.timestamp': Date.now()
      });
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error saving auth state:', error);
      sendResponse({ error: error.message });
    }
  }

  async clearAuthState(sendResponse) {
    try {
      await chrome.storage.local.remove([
        'supabase.auth.token',
        'user.profile',
        'auth.timestamp'
      ]);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error clearing auth state:', error);
      sendResponse({ error: error.message });
    }
  }

  // Usage Tracking
  async trackUsage(data, sendResponse) {
    try {
      const usage = await this.getUsageData();
      const today = new Date().toDateString();
      
      if (usage.date !== today) {
        // Reset daily usage
        usage.date = today;
        usage.applications = 0;
        usage.formsScanned = 0;
      }

      // Update usage counters
      if (data.type === 'application') {
        usage.applications++;
      } else if (data.type === 'scan') {
        usage.formsScanned++;
      }

      await chrome.storage.local.set({ 'usage.data': usage });
      sendResponse({ success: true, usage });
      
    } catch (error) {
      console.error('Error tracking usage:', error);
      sendResponse({ error: error.message });
    }
  }

  async checkUsageLimit(sendResponse) {
    try {
      const usage = await this.getUsageData();
      const profile = await this.getUserProfile();
      
      const limits = {
        free: { applications: 10, scans: 50 },
        premium: { applications: -1, scans: -1 }, // Unlimited
        enterprise: { applications: -1, scans: -1 }
      };

      const userPlan = profile?.subscription?.plan || 'free';
      const userLimits = limits[userPlan] || limits.free;
      
      const canApply = userLimits.applications === -1 || usage.applications < userLimits.applications;
      const canScan = userLimits.scans === -1 || usage.formsScanned < userLimits.scans;
      
      sendResponse({
        canApply,
        canScan,
        usage,
        limits: userLimits,
        plan: userPlan
      });
      
    } catch (error) {
      console.error('Error checking usage limit:', error);
      sendResponse({ error: error.message });
    }
  }

  async getUsageData() {
    const result = await chrome.storage.local.get(['usage.data']);
    return result['usage.data'] || {
      date: new Date().toDateString(),
      applications: 0,
      formsScanned: 0
    };
  }

  async getUserProfile() {
    const result = await chrome.storage.local.get(['user.profile']);
    return result['user.profile'] || null;
  }

  // Form Detection Handlers
  async handleFormDetected(message, sender) {
    // Store detected form info for later use
    const tabId = sender.tab.id;
    const formData = {
      fields: message.fields,
      site: message.site,
      url: message.url,
      timestamp: Date.now()
    };

    await chrome.storage.session.set({
      [`form.${tabId}`]: formData
    });

    // Track the scan
    await this.trackUsage({ type: 'scan' });
    
    // Update badge to show form detected
    this.updateBadge(tabId, 'active');
  }

  async handleApplicationSubmitted(message, sender) {
    // Track the application
    await this.trackUsage({ type: 'application' });
    
    // Show success notification
    chrome.notifications.create('app-submitted', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icon48.png'),
      title: 'Application Submitted!',
      message: `Successfully applied to ${message.company} - ${message.position}`
    });

    // Clear form data
    const tabId = sender.tab.id;
    await chrome.storage.session.remove([`form.${tabId}`]);
  }

  // Session Management
  setupSessionManagement() {
    // Check session validity periodically
    setInterval(() => {
      this.validateSession();
    }, 15 * 60 * 1000); // Every 15 minutes
  }

  async validateSession() {
    try {
      const result = await chrome.storage.local.get(['auth.timestamp']);
      const timestamp = result['auth.timestamp'];
      
      if (timestamp) {
        const hoursSinceAuth = (Date.now() - timestamp) / (1000 * 60 * 60);
        
        // If session is older than 24 hours, clear it
        if (hoursSinceAuth > 24) {
          await this.clearAuthState(() => {});
          console.log('Session expired, cleared auth state');
        }
      }
    } catch (error) {
      console.error('Error validating session:', error);
    }
  }

  async restoreSession() {
    // Restore any necessary session data
    try {
      const authData = await chrome.storage.local.get(['supabase.auth.token']);
      if (authData['supabase.auth.token']) {
        console.log('Session restored');
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
  }

  // Data Synchronization
  async syncData(sendResponse) {
    try {
      // Sync local storage with Supabase
      // This would involve getting the latest data from Supabase
      // and updating local storage
      
      sendResponse({ success: true, message: 'Data synced successfully' });
    } catch (error) {
      console.error('Error syncing data:', error);
      sendResponse({ error: error.message });
    }
  }

  // Utility Methods
  showWelcomeNotification() {
    if (chrome.notifications) {
      chrome.notifications.create('welcome', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icon48.png'),
        title: 'Welcome to ApplyToMation!',
        message: 'Click the extension icon to set up your profile and start auto-filling job applications.'
      });
    }
  }

  async setDefaultSettings() {
    const defaultSettings = {
      autoDetectForms: true,
      showNotifications: true,
      autoFillConfirm: true,
      theme: 'light'
    };

    await chrome.storage.local.set({ 'app.settings': defaultSettings });
  }

  handleUpdate(previousVersion) {
    console.log(`Updated from version ${previousVersion}`);
    
    // Handle version-specific migrations here
    chrome.notifications.create('updated', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('assets/icon48.png'),
      title: 'ApplyToMation Updated!',
      message: 'Your extension has been updated with new features.'
    });
  }
}

// Initialize the background service
new ApplyToMationBackground();