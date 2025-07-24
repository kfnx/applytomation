// ApplyToMation Form Detection and Filling Content Script

// Prevent multiple initializations
if (window.applyToMationInjected) {
  console.log('ApplyToMation already injected, skipping initialization');
} else {
  window.applyToMationInjected = true;

  class FormDetector {
    constructor() {
      this.detectedFields = [];
      this.fieldMappings = this.getFieldMappings();
      this.currentSite = this.getCurrentSite();
      
      this.init();
    }

  init() {
    // Listen for messages from the sidebar panel
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async response
    });

    // Auto-detect forms on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.autoDetectForms(), 1000);
      });
    } else {
      setTimeout(() => this.autoDetectForms(), 1000);
    }

    // Watch for dynamic form changes
    this.observeFormChanges();
  }

  getCurrentSite() {
    const hostname = window.location.hostname.toLowerCase();
    
    const siteMap = {
      'linkedin.com': 'linkedin',
      'indeed.com': 'indeed',
      'glassdoor.com': 'glassdoor',
      'monster.com': 'monster',
      'ziprecruiter.com': 'ziprecruiter',
      'jobvite.com': 'jobvite',
      'workday.com': 'workday',
      'greenhouse.io': 'greenhouse',
      'lever.co': 'lever',
      'bamboohr.com': 'bamboohr',
      'careers-page.com': 'careers-page'
    };

    for (const [domain, site] of Object.entries(siteMap)) {
      if (hostname.includes(domain)) {
        return site;
      }
    }

    return 'generic';
  }

  getFieldMappings() {
    return {
      // Personal Information
      firstName: [
        'input[name*="first" i]:not([name*="last" i])',
        'input[id*="first" i]:not([id*="last" i])',
        'input[placeholder*="first name" i]',
        'input[aria-label*="first name" i]',
        'input[name="fname"]',
        'input[name="firstname"]'
      ],
      
      lastName: [
        'input[name*="last" i]:not([name*="first" i])',
        'input[id*="last" i]:not([id*="first" i])',
        'input[placeholder*="last name" i]',
        'input[aria-label*="last name" i]',
        'input[name="lname"]',
        'input[name="lastname"]'
      ],
      
      fullName: [
        'input[name*="name" i]:not([name*="first" i]):not([name*="last" i]):not([name*="company" i]):not([name*="user" i])',
        'input[id*="name" i]:not([id*="first" i]):not([id*="last" i]):not([id*="company" i])',
        'input[placeholder*="full name" i]',
        'input[placeholder*="your name" i]',
        'input[name="name"]'
      ],
      
      email: [
        'input[type="email"]',
        'input[name*="email" i]',
        'input[id*="email" i]',
        'input[placeholder*="email" i]',
        'input[aria-label*="email" i]'
      ],
      
      phone: [
        'input[type="tel"]',
        'input[name*="phone" i]',
        'input[id*="phone" i]',
        'input[placeholder*="phone" i]',
        'input[aria-label*="phone" i]',
        'input[name*="mobile" i]',
        'input[name*="contact" i]'
      ],
      
      // Address Information
      address: [
        'input[name*="address" i]:not([name*="email" i])',
        'input[id*="address" i]',
        'input[placeholder*="address" i]',
        'textarea[name*="address" i]'
      ],
      
      city: [
        'input[name*="city" i]',
        'input[id*="city" i]',
        'input[placeholder*="city" i]'
      ],
      
      state: [
        'input[name*="state" i]',
        'input[id*="state" i]',
        'select[name*="state" i]',
        'select[id*="state" i]'
      ],
      
      zipCode: [
        'input[name*="zip" i]',
        'input[name*="postal" i]',
        'input[id*="zip" i]',
        'input[id*="postal" i]',
        'input[placeholder*="zip" i]'
      ],
      
      // Professional Information
      currentTitle: [
        'input[name*="title" i]:not([name*="job" i])',
        'input[name*="position" i]',
        'input[id*="title" i]',
        'input[placeholder*="current title" i]',
        'input[placeholder*="job title" i]'
      ],
      
      summary: [
        'textarea[name*="summary" i]',
        'textarea[name*="bio" i]',
        'textarea[name*="about" i]',
        'textarea[id*="summary" i]',
        'textarea[placeholder*="tell us about" i]',
        'textarea[placeholder*="describe yourself" i]'
      ],

      // LinkedIn specific selectors
      ...(this.currentSite === 'linkedin' && {
        firstName: [
          'input[name="firstName"]',
          '#single-line-text-form-component-profileEditFormElement-FIRST_NAME-firstName input'
        ],
        lastName: [
          'input[name="lastName"]',
          '#single-line-text-form-component-profileEditFormElement-LAST_NAME-lastName input'
        ]
      }),

      // Indeed specific selectors
      ...(this.currentSite === 'indeed' && {
        fullName: [
          'input[name="applicant.name"]',
          'input[data-testid="name-input"]'
        ],
        email: [
          'input[name="applicant.emailAddress"]',
          'input[data-testid="email-input"]'
        ],
        phone: [
          'input[name="applicant.phoneNumber"]',
          'input[data-testid="phone-input"]'
        ]
      }),

      // Workday specific selectors
      ...(this.currentSite === 'workday' && {
        firstName: ['input[data-automation-id="firstName"]'],
        lastName: ['input[data-automation-id="lastName"]'],
        email: ['input[data-automation-id="email"]'],
        phone: ['input[data-automation-id="phone"]']
      }),

      // Careers-page.com specific selectors
      ...(this.currentSite === 'careers-page' && {
        firstName: [
          'input[name*="first" i]',
          'input[id*="first" i]',
          'input[placeholder*="first" i]'
        ],
        lastName: [
          'input[name*="last" i]',
          'input[id*="last" i]',
          'input[placeholder*="last" i]'
        ],
        email: [
          'input[type="email"]',
          'input[name*="email" i]',
          'input[id*="email" i]'
        ],
        phone: [
          'input[type="tel"]',
          'input[name*="phone" i]',
          'input[name*="mobile" i]',
          'input[id*="phone" i]'
        ],
        address: [
          'input[name*="address" i]',
          'textarea[name*="address" i]'
        ],
        city: [
          'input[name*="city" i]',
          'select[name*="city" i]'
        ],
        state: [
          'input[name*="state" i]',
          'select[name*="state" i]'
        ],
        zipCode: [
          'input[name*="zip" i]',
          'input[name*="postal" i]'
        ],
        currentTitle: [
          'input[name*="title" i]',
          'input[name*="position" i]',
          'input[placeholder*="current title" i]'
        ],
        summary: [
          'textarea[name*="summary" i]',
          'textarea[name*="bio" i]',
          'textarea[name*="about" i]',
          'textarea[placeholder*="tell us about" i]'
        ],
        yearsExperience: [
          'input[name*="experience" i]',
          'select[name*="experience" i]',
          'input[name*="years" i]'
        ],
        skills: [
          'textarea[name*="skills" i]',
          'input[name*="skills" i]',
          'textarea[placeholder*="skills" i]'
        ]
      })
    };
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'scanPage':
        this.scanForForms().then(fields => {
          sendResponse({ fields });
        });
        break;
        
      case 'fillForm':
        this.fillForm(message.data, message.fields).then(result => {
          sendResponse(result);
        });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
        break;
    }
  }

  async scanForForms() {
    this.detectedFields = [];
    
    // Look for form elements
    const forms = document.querySelectorAll('form');
    const allInputs = document.querySelectorAll('input, textarea, select');
    
    // If we have forms, focus on inputs within forms
    const targetInputs = forms.length > 0 
      ? Array.from(forms).flatMap(form => Array.from(form.querySelectorAll('input, textarea, select')))
      : Array.from(allInputs);

    // Detect field types
    for (const [fieldType, selectors] of Object.entries(this.fieldMappings)) {
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          
          for (const element of elements) {
            if (this.isValidFormField(element) && !this.isFieldAlreadyDetected(element)) {
              this.detectedFields.push({
                type: fieldType,
                element: element,
                selector: this.getElementSelector(element),
                inputType: element.type || element.tagName.toLowerCase(),
                name: element.name || element.id || '',
                placeholder: element.placeholder || '',
                visible: this.isElementVisible(element)
              });
              break; // Only take the first match for each field type
            }
          }
        } catch (error) {
          console.warn('Invalid selector:', selector, error);
        }
      }
    }

    // Sort by visibility and position
    this.detectedFields.sort((a, b) => {
      if (a.visible && !b.visible) return -1;
      if (!a.visible && b.visible) return 1;
      
      const aRect = a.element.getBoundingClientRect();
      const bRect = b.element.getBoundingClientRect();
      return aRect.top - bRect.top;
    });

    console.log('ApplyToMation detected fields:', this.detectedFields);
    
    return this.detectedFields.map(field => ({
      type: field.type,
      selector: field.selector,
      inputType: field.inputType,
      name: field.name,
      placeholder: field.placeholder,
      visible: field.visible
    }));
  }

  isValidFormField(element) {
    // Check if element is a valid form field
    if (!element || element.disabled || element.readOnly) {
      return false;
    }

    // Skip hidden fields, but allow password fields
    if (element.type === 'hidden') {
      return false;
    }

    // Skip submit buttons and other non-data fields
    if (['submit', 'button', 'reset', 'image'].includes(element.type)) {
      return false;
    }

    // Must be visible or at least in the viewport
    return this.isElementVisible(element) || this.isElementInViewport(element);
  }

  isFieldAlreadyDetected(element) {
    return this.detectedFields.some(field => field.element === element);
  }

  isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 &&
           element.offsetHeight > 0;
  }

  isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  getElementSelector(element) {
    // Generate a reliable selector for the element
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.name) {
      return `[name="${element.name}"]`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `.${classes.join('.')}`;
      }
    }
    
    // Fallback to a more complex selector
    let selector = element.tagName.toLowerCase();
    let parent = element.parentElement;
    let index = Array.from(parent.children).indexOf(element);
    
    return `${selector}:nth-child(${index + 1})`;
  }

  async fillForm(data, detectedFields) {
    const filledFields = [];
    const errors = [];

    for (const fieldInfo of detectedFields || this.detectedFields) {
      try {
        const element = document.querySelector(fieldInfo.selector);
        
        if (!element) {
          console.warn('Element not found for selector:', fieldInfo.selector);
          continue;
        }

        const value = data[fieldInfo.type];
        if (!value) {
          continue; // Skip fields without data
        }

        const success = await this.fillField(element, value, fieldInfo.type);
        
        if (success) {
          filledFields.push({
            type: fieldInfo.type,
            selector: fieldInfo.selector,
            value: value
          });
        }

      } catch (error) {
        console.error('Error filling field:', fieldInfo.type, error);
        errors.push({
          type: fieldInfo.type,
          error: error.message
        });
      }
    }

    // Notify about completion
    chrome.runtime.sendMessage({
      action: 'fillComplete',
      filledFields,
      errors
    });

    return {
      success: filledFields.length > 0,
      filledFields,
      errors
    };
  }

  async fillField(element, value, fieldType) {
    if (!element || !value) return false;

    try {
      // Focus the element first
      element.focus();
      
      // Wait a bit for any dynamic behavior
      await this.sleep(100);

      if (element.tagName.toLowerCase() === 'select') {
        return this.fillSelectField(element, value);
      } else if (element.type === 'checkbox' || element.type === 'radio') {
        return this.fillCheckboxField(element, value);
      } else {
        return this.fillTextField(element, value);
      }

    } catch (error) {
      console.error('Error filling field:', error);
      return false;
    }
  }

  fillTextField(element, value) {
    // Clear existing value
    element.value = '';
    element.setAttribute('value', '');
    
    // Set new value
    element.value = value;
    element.setAttribute('value', value);

    // Trigger events to ensure the change is registered
    this.triggerEvents(element, ['input', 'change', 'blur']);
    
    // For React/Vue applications, also try setting the value directly
    if (element._valueTracker) {
      element._valueTracker.setValue('');
    }

    return true;
  }

  fillSelectField(element, value) {
    // Try to find matching option by value or text
    const options = Array.from(element.options);
    
    let matchedOption = options.find(option => 
      option.value.toLowerCase() === value.toLowerCase() ||
      option.text.toLowerCase() === value.toLowerCase()
    );

    // If no exact match, try partial matching
    if (!matchedOption) {
      matchedOption = options.find(option => 
        option.text.toLowerCase().includes(value.toLowerCase()) ||
        value.toLowerCase().includes(option.text.toLowerCase())
      );
    }

    if (matchedOption) {
      element.selectedIndex = matchedOption.index;
      this.triggerEvents(element, ['change']);
      return true;
    }

    return false;
  }

  fillCheckboxField(element, value) {
    const shouldCheck = ['true', '1', 'yes', 'on'].includes(value.toString().toLowerCase());
    
    if (element.checked !== shouldCheck) {
      element.checked = shouldCheck;
      this.triggerEvents(element, ['change']);
    }
    
    return true;
  }

  triggerEvents(element, eventTypes) {
    eventTypes.forEach(eventType => {
      // Try both native events and React synthetic events
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
      
      // For React components
      if (eventType === 'input') {
        const inputEvent = new InputEvent('input', { bubbles: true, cancelable: true });
        element.dispatchEvent(inputEvent);
      }
    });
  }

  autoDetectForms() {
    // Automatically detect forms when the page loads
    this.scanForForms().then(fields => {
      if (fields.length > 0) {
        chrome.runtime.sendMessage({
          action: 'formDetected',
          fields,
          site: this.currentSite,
          url: window.location.href
        });
      }
    });
  }

  observeFormChanges() {
    // Watch for dynamic form additions (for SPAs)
    const observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasFormElements = addedNodes.some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node.tagName === 'FORM' || node.querySelector('form, input, textarea, select'))
          );
          
          if (hasFormElements) {
            shouldRescan = true;
          }
        }
      });
      
      if (shouldRescan) {
        // Debounce rescanning
        clearTimeout(this.rescanTimeout);
        this.rescanTimeout = setTimeout(() => {
          this.autoDetectForms();
        }, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Initialize the form detector
  new FormDetector();
}