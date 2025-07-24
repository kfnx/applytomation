// ApplyToMation Sidebar Panel JavaScript

class ApplyToMationPanel {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.userProfile = null;
    this.currentTab = 'fill';
    this.detectedFields = [];
    
    this.init();
  }

  async init() {
    try {
      console.log('Starting ApplyToMation initialization...');
      
      // Wait for Supabase library to be available
      await this.waitForSupabase();
      
      // Initialize Supabase client
      console.log('Initializing Supabase client...');
      this.supabase = new SupabaseClient();
      await this.supabase.init();
      
      // Check for existing session
      console.log('Checking authentication...');
      await this.checkAuthentication();
      
      // Set up event listeners
      console.log('Setting up event listeners...');
      this.setupEventListeners();
      
      // Hide loading screen
      console.log('Initialization complete, hiding loading screen...');
      this.hideLoading();
      
      // Ensure at least one screen is visible
      this.ensureScreenVisibility();
      
    } catch (error) {
      console.error('Failed to initialize ApplyToMation:', error);
      
      // Show detailed error information
      let errorMessage = 'Failed to initialize. Please refresh and try again.';
      let errorDetails = error.message;
      
      if (error.message.includes('Supabase library failed to load')) {
        errorMessage = 'Failed to load required libraries. Please check your internet connection and refresh.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and refresh.';
      }
      
      this.showDetailedError(errorMessage, errorDetails);
      this.hideLoading();
    }
  }

  async waitForSupabase() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 50; // 5 seconds max wait
      let attempts = 0;
      
      const checkSupabase = () => {
        attempts++;
        
        if (window.supabase && window.supabase.createClient) {
          console.log('Supabase library loaded successfully');
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Supabase library failed to load'));
        } else {
          setTimeout(checkSupabase, 100);
        }
      };
      
      checkSupabase();
    });
  }



  showDetailedError(message, details) {
    const loadingScreen = document.getElementById('loading-screen');
    loadingScreen.innerHTML = `
      <div class="error-container">
        <h3>Initialization Error</h3>
        <p>${message}</p>
        <details>
          <summary>Technical Details</summary>
          <pre>${details}</pre>
        </details>
        <button onclick="location.reload()" class="btn-primary">Refresh Extension</button>
      </div>
    `;
  }

  async checkAuthentication() {
    // Skip authentication for now - go straight to main screen
    console.log('Skipping authentication, showing main screen directly');
    this.showMainScreen();
    
    // TODO: Uncomment this when ready to implement authentication
    /*
    const { session, error } = await this.supabase.getSession();
    
    if (error) {
      console.error('Session check error:', error);
      this.showAuthScreen();
      return;
    }

    if (session?.user) {
      this.currentUser = session.user;
      await this.loadUserProfile();
      this.showMainScreen();
    } else {
      this.showAuthScreen();
    }
    */
  }

  setupEventListeners() {
    // Auth tab switching
    document.getElementById('login-tab').addEventListener('click', () => this.showLoginForm());
    document.getElementById('signup-tab').addEventListener('click', () => this.showSignupForm());

    // Auth forms
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('signup-form').addEventListener('submit', (e) => this.handleSignup(e));
    
    // OAuth buttons
    document.getElementById('google-login').addEventListener('click', () => this.handleOAuthLogin('google'));
    document.getElementById('google-signup').addEventListener('click', () => this.handleOAuthLogin('google'));

    // Main navigation
    document.getElementById('fill-tab').addEventListener('click', () => this.switchTab('fill'));
    document.getElementById('profile-tab').addEventListener('click', () => this.switchTab('profile'));
    document.getElementById('history-tab').addEventListener('click', () => this.switchTab('history'));

    // Form filling controls
    document.getElementById('scan-form-btn').addEventListener('click', () => this.scanCurrentPage());
    document.getElementById('fill-form-btn').addEventListener('click', () => this.fillDetectedForm());

    // Profile management
    document.getElementById('save-profile-btn').addEventListener('click', () => this.saveProfile());
    document.getElementById('upload-resume-btn').addEventListener('click', () => this.uploadResume());

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

    // Notification close
    document.getElementById('notification-close').addEventListener('click', () => this.hideNotification());

    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleContentScriptMessage(message, sender, sendResponse);
    });
  }

  // Authentication Methods
  showLoginForm() {
    document.getElementById('login-tab').classList.add('active');
    document.getElementById('signup-tab').classList.remove('active');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('signup-form').classList.add('hidden');
  }

  showSignupForm() {
    document.getElementById('signup-tab').classList.add('active');
    document.getElementById('login-tab').classList.remove('active');
    document.getElementById('signup-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const { data, error } = await this.supabase.signIn(email, password);
      
      if (error) throw error;
      
      this.currentUser = data.user;
      await this.loadUserProfile();
      this.showMainScreen();
      this.showNotification('Successfully logged in!');
      
    } catch (error) {
      this.showAuthError(error.message);
    }
  }

  async handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;

    if (password !== confirmPassword) {
      this.showAuthError('Passwords do not match');
      return;
    }

    try {
      const { data, error } = await this.supabase.signUp(email, password);
      
      if (error) throw error;
      
      this.showNotification('Account created! Please check your email to verify your account.');
      this.showLoginForm();
      
    } catch (error) {
      this.showAuthError(error.message);
    }
  }

  async handleOAuthLogin(provider) {
    try {
      const { data, error } = await this.supabase.signInWithOAuth(provider);
      
      if (error) throw error;
      
      // OAuth will redirect, so we don't need to handle the response here
      
    } catch (error) {
      this.showAuthError(error.message);
    }
  }

  async handleLogout() {
    try {
      await this.supabase.signOut();
      this.currentUser = null;
      this.userProfile = null;
      this.showAuthScreen();
      this.showNotification('Successfully logged out');
      
    } catch (error) {
      this.showNotification('Error logging out: ' + error.message, 'error');
    }
  }

  // Profile Management
  async loadUserProfile() {
    // Skip profile loading for now - use mock data
    console.log('Using mock profile data');
    this.userProfile = {
      first_name: 'Kafin',
      last_name: 'Salim',
      email: 'kafinsalim@gmail.com',
      phone: '+6282299997322',
      address_line1: 'Leuwipanjang',
      city: 'Bandung',
      state: 'Jawa Barat',
      country: 'Indonesia',
      zip_code: '40234',
      current_title: 'Software Engineer',
      years_experience: 7,
      summary: 'Experienced software engineer with expertise in web development and automation.',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL']
    };
    this.populateProfileForm();
    await this.updateUsageInfo();
    
    // TODO: Uncomment this when ready to implement real profile loading
    /*
    if (!this.currentUser) return;

    try {
      const { data, error } = await this.supabase.getUserProfile(this.currentUser.id);
      
      if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
        throw error;
      }
      
      this.userProfile = data || {};
      this.populateProfileForm();
      await this.updateUsageInfo();
      
    } catch (error) {
      console.error('Error loading profile:', error);
      this.showNotification('Error loading profile data', 'error');
    }
    */
  }

  populateProfileForm() {
    if (!this.userProfile) return;

    const form = document.getElementById('profile-form');
    const inputs = form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
      const fieldName = input.name;
      if (fieldName && this.userProfile[fieldName]) {
        if (fieldName === 'skills' && Array.isArray(this.userProfile[fieldName])) {
          input.value = this.userProfile[fieldName].join(', ');
        } else {
          input.value = this.userProfile[fieldName];
        }
      }
    });

    // Update user email display
    document.getElementById('user-email').textContent = this.userProfile.email || 'john.doe@example.com';
  }

  async saveProfile() {
    if (!this.currentUser) return;

    try {
      const form = document.getElementById('profile-form');
      const formData = new FormData(form);
      const profileData = {};

      for (let [key, value] of formData.entries()) {
        if (key === 'skills') {
          profileData[key] = value.split(',').map(s => s.trim()).filter(s => s);
        } else if (key === 'years_experience') {
          profileData[key] = parseInt(value) || 0;
        } else {
          profileData[key] = value;
        }
      }

      const { data, error } = await this.supabase.updateUserProfile(this.currentUser.id, profileData);
      
      if (error) throw error;
      
      this.userProfile = data;
      this.showNotification('Profile saved successfully!');
      
    } catch (error) {
      console.error('Error saving profile:', error);
      this.showNotification('Error saving profile: ' + error.message, 'error');
    }
  }

  async uploadResume() {
    const fileInput = document.getElementById('resume-file-input');
    fileInput.click();
    
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const fileName = `${this.currentUser.id}/resume_${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await this.supabase.uploadFile('documents', fileName, file);
        
        if (error) throw error;
        
        // Update profile with resume URL
        const resumeUrl = await this.supabase.getFileUrl('documents', fileName);
        await this.supabase.updateUserProfile(this.currentUser.id, { resume_url: resumeUrl });
        
        this.showNotification('Resume uploaded successfully!');
        
      } catch (error) {
        console.error('Error uploading resume:', error);
        this.showNotification('Error uploading resume: ' + error.message, 'error');
      }
    };
  }

  // Form Detection and Filling
  async scanCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      console.log('Scanning page:', tab.url);
      
      // Check if we're on a supported domain
      const supportedDomains = [
        'linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com',
        'ziprecruiter.com', 'jobvite.com', 'workday.com', 'greenhouse.io',
        'lever.co', 'bamboohr.com', 'careers-page.com'
      ];
      
      const isSupported = supportedDomains.some(domain => tab.url.includes(domain));
      if (!isSupported) {
        this.showNotification('This page is not on a supported job portal.', 'error');
        return;
      }
      
      // First, test if the content script is loaded
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Content script not loaded, injecting...');
          this.injectContentScript(tab.id).then(() => {
            console.log('Content script injected, retrying scan...');
            setTimeout(() => this.scanCurrentPage(), 500);
          }).catch(error => {
            console.error('Failed to inject content script:', error);
            this.showNotification('Cannot scan this page. Please refresh the page and try again.', 'error');
          });
          return;
        }
        
        console.log('Content script is ready:', response);
        this.performScan(tab.id);
      });
      
    } catch (error) {
      console.error('Error scanning page:', error);
      this.showNotification('Error scanning page: ' + error.message, 'error');
    }
  }

  async performScan(tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'scanPage' }, (response) => {
      console.log('Scan response:', response);
      
      if (response && response.fields) {
        this.detectedFields = response.fields;
        this.displayDetectedFields();
        this.updateFormStatus('detected', `Found ${response.fields.length} fields`);
        document.getElementById('fill-form-btn').disabled = false;
        this.showNotification(`Found ${response.fields.length} form fields!`);
      } else if (response && response.error) {
        this.updateFormStatus('error', 'Error scanning page: ' + response.error);
        document.getElementById('fill-form-btn').disabled = true;
        this.showNotification('Error scanning page: ' + response.error, 'error');
      } else {
        this.updateFormStatus('error', 'No form fields detected');
        document.getElementById('fill-form-btn').disabled = true;
        this.showNotification('No form fields detected on this page.', 'warning');
      }
    });
  }

  async injectContentScript(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content/ai-form-detector.js']
      });
      console.log('Content script injected successfully');
    } catch (error) {
      console.error('Failed to inject content script:', error);
      throw error;
    }
  }

  async fillDetectedForm() {
    if (this.detectedFields.length === 0) {
      this.showNotification('No form fields detected. Please scan the page first.', 'error');
      return;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      const fillData = this.prepareFillData();
      
      console.log('Sending fill form message to content script:', {
        action: 'fillForm',
        data: fillData,
        fields: this.detectedFields
      });
      
      chrome.tabs.sendMessage(tab.id, { 
        action: 'fillForm', 
        data: fillData,
        fields: this.detectedFields 
      }, async (response) => {
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          this.showNotification('Error filling form: ' + chrome.runtime.lastError.message, 'error');
          return;
        }
        
        console.log('Fill form response:', response);
        
        if (response && response.success) {
          this.showNotification(`Form filled successfully! Filled ${response.filledFields.length} fields.`);
        } else {
          this.showNotification('Error filling some fields', 'warning');
        }
      });
      
    } catch (error) {
      console.error('Error filling form:', error);
      this.showNotification('Error filling form: ' + error.message, 'error');
    }
  }

  prepareFillData() {
    // Use hardcoded user data for testing
    const fillData = {
      firstName: 'Kafin',
      lastName: 'Salim',
      fullName: 'Kafin Salim',
      email: 'kafinsalim@gmail.com',
      phone: '+6282299997322',
      address: 'Leuwipanjang',
      city: 'Bandung',
      state: 'Jawa Barat',
      country: 'Indonesia',
      zipCode: '40234',
      currentTitle: 'Senior Software Engineer',
      summary: 'Experienced software engineer with 7+ years of experience in React, JavaScript, and modern web technologies. Passionate about creating user-friendly and performant web applications.',
      yearsExperience: '7',
      skills: 'React, JavaScript, TypeScript, HTML, CSS, Node.js, Git, Webpack, Jest, Redux',
      linkedin: "https://www.linkedin.com/in/kafinsalim/"
    };
    
    console.log('Prepared fill data:', fillData);
    return fillData;
  }

  displayDetectedFields() {
    const fieldsList = document.getElementById('fields-list');
    fieldsList.innerHTML = '';
    
    const fillData = this.prepareFillData();
    
    this.detectedFields.forEach(field => {
      const li = document.createElement('li');
      const confidencePercent = Math.round(field.confidence * 100);
      const confidenceColor = field.confidence > 0.8 ? 'green' : field.confidence > 0.6 ? 'orange' : 'red';
      const willFill = fillData[field.type];
      const fillStatus = willFill ? 'Will fill' : 'No data';
      const fillColor = willFill ? 'green' : 'gray';
      
      li.innerHTML = `
        <div class="field-info">
          <div class="field-type">${field.type}</div>
          <div class="field-details">
            <span class="field-label">${field.label || field.placeholder || field.name || 'No label'}</span>
            <div class="field-status">
              <span class="field-confidence" style="color: ${confidenceColor}">${confidencePercent}% confidence</span>
              <span class="field-fill-status" style="color: ${fillColor}">${fillStatus}</span>
            </div>
          </div>
          ${willFill ? `<div class="field-preview">Will fill: "${willFill}"</div>` : ''}
        </div>
      `;
      fieldsList.appendChild(li);
    });
    
    document.getElementById('detected-fields').classList.remove('hidden');
  }

  updateFormStatus(status, message) {
    const statusElement = document.getElementById('form-status');
    const statusText = statusElement.querySelector('.status-text');
    
    statusElement.className = `status-indicator ${status}`;
    statusText.textContent = message;
  }

  async trackApplication(url, filledFields) {
    if (!this.currentUser) return;

    try {
      const domain = new URL(url).hostname;
      const applicationData = {
        job_url: url,
        job_portal: domain,
        company_name: 'Unknown', // TODO: Extract from page
        job_title: 'Applied Position', // TODO: Extract from page
        form_data: this.prepareFillData(),
        form_fields_detected: filledFields
      };

      await this.supabase.saveApplication(this.currentUser.id, applicationData);
      
    } catch (error) {
      console.error('Error tracking application:', error);
    }
  }

  async updateUsageInfo() {
    // TODO: Implement usage tracking from subscription data
    const usageCount = document.getElementById('usage-count');
    const usageLimit = document.getElementById('usage-limit');
    const usageProgress = document.getElementById('usage-progress');
    
    // Placeholder values - replace with actual data from Supabase
    const used = 3;
    const limit = 10;
    const percentage = (used / limit) * 100;
    
    usageCount.textContent = used;
    usageLimit.textContent = limit;
    usageProgress.style.width = `${percentage}%`;
  }

  // UI Management
  switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.nav-tabs .tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    document.getElementById(`${tab}-content`).classList.remove('hidden');

    this.currentTab = tab;

    // Load tab-specific data
    if (tab === 'history') {
      this.loadApplicationHistory();
    }
  }

  async loadApplicationHistory() {
    if (!this.currentUser) return;

    try {
      const { data, error } = await this.supabase.getUserApplications(this.currentUser.id);
      
      if (error) throw error;
      
      this.displayApplicationHistory(data || []);
      
    } catch (error) {
      console.error('Error loading application history:', error);
    }
  }

  displayApplicationHistory(applications) {
    const listElement = document.getElementById('applications-list');
    
    if (applications.length === 0) {
      listElement.innerHTML = '<div class="no-applications"><p>No applications yet. Start filling forms to see your history!</p></div>';
      return;
    }

    listElement.innerHTML = applications.map(app => `
      <div class="application-item">
        <div class="application-header">
          <div>
            <div class="application-title">${app.job_title}</div>
            <div class="application-company">${app.company_name}</div>
          </div>
          <div>
            <div class="application-status status-${app.status}">${app.status}</div>
            <div class="application-date">${new Date(app.applied_at).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  hideLoading() {
    document.getElementById('loading-screen').classList.add('hidden');
  }

  showAuthScreen() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('main-screen').classList.add('hidden');
  }

  showMainScreen() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
  }

  ensureScreenVisibility() {
    const loadingScreen = document.getElementById('loading-screen');
    const authScreen = document.getElementById('auth-screen');
    const mainScreen = document.getElementById('main-screen');
    
    // If no screen is visible, show auth screen as fallback
    if (loadingScreen.classList.contains('hidden') && 
        authScreen.classList.contains('hidden') && 
        mainScreen.classList.contains('hidden')) {
      this.showAuthScreen();
    }
  }

  showAuthError(message) {
    const errorElement = document.getElementById('auth-error');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    
    setTimeout(() => {
      errorElement.classList.add('hidden');
    }, 5000);
  }

  showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notification-text');
    
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
      this.hideNotification();
    }, 5000);
  }

  hideNotification() {
    document.getElementById('notification').classList.add('hidden');
  }

  handleContentScriptMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'formDetected':
        this.detectedFields = message.fields;
        this.displayDetectedFields();
        this.updateFormStatus('detected', `Found ${message.fields.length} fields`);
        document.getElementById('fill-form-btn').disabled = false;
        break;
        
      case 'fillComplete':
        this.showNotification('Form filled successfully!');
        this.trackApplication(sender.tab.url, message.filledFields);
        break;
        
      default:
        break;
    }
  }
}

// Initialize the panel when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Add a small delay to ensure all scripts are loaded
  setTimeout(() => {
    try {
      new ApplyToMationPanel();
    } catch (error) {
      console.error('Failed to create ApplyToMation panel:', error);
      document.getElementById('loading-screen').innerHTML = `
        <div class="error-message">
          <p>Failed to initialize ApplyToMation</p>
          <p>Error: ${error.message}</p>
          <button onclick="location.reload()" class="btn-primary">Refresh</button>
        </div>
      `;
    }
  }, 100);
});