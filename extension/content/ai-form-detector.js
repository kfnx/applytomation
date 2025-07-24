// AI-Powered Form Detection and Filling

console.log('AI Form Detector: Script loaded on', window.location.href);

class AIFormDetector {
  constructor() {
    console.log('AI Form Detector: Initializing...');
    this.detectedFields = [];
    this.userData = null;
    this.init();
  }

  init() {
    console.log('AI Form Detector: Setting up message listener...');
    
    // Listen for messages from the sidebar panel
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('AI Form Detector: Received message:', message);
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Auto-detect forms on page load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('AI Form Detector: DOM loaded, auto-detecting forms...');
        setTimeout(() => this.autoDetectForms(), 1000);
      });
    } else {
      console.log('AI Form Detector: DOM already loaded, auto-detecting forms...');
      setTimeout(() => this.autoDetectForms(), 1000);
    }
  }

  handleMessage(message, sender, sendResponse) {
    console.log('AI Form Detector: Handling message:', message.action);
    
    switch (message.action) {
      case 'ping':
        console.log('AI Form Detector: Ping received');
        sendResponse({ status: 'ok', message: 'AI Form Detector is ready' });
        break;
        
      case 'scanPage':
        console.log('AI Form Detector: Starting page scan...');
        this.scanForForms().then(fields => {
          console.log('AI Form Detector: Scan complete, sending response with', fields.length, 'fields');
          sendResponse({ fields });
        }).catch(error => {
          console.error('AI Form Detector: Scan error:', error);
          sendResponse({ error: error.message });
        });
        break;
        
      case 'fillForm':
        console.log('AI Form Detector: Starting form fill...');
        this.fillFormWithAI(message.data, message.fields).then(result => {
          console.log('AI Form Detector: Fill complete:', result);
          sendResponse(result);
        }).catch(error => {
          console.error('AI Form Detector: Fill error:', error);
          sendResponse({ error: error.message });
        });
        break;
        
      default:
        console.warn('AI Form Detector: Unknown action:', message.action);
        sendResponse({ error: 'Unknown action' });
    }
  }

  async scanForForms() {
    this.detectedFields = [];
    
    console.log('AI Form Detector: Starting form scan...');
    
    // Get all form elements and inputs
    const forms = document.querySelectorAll('form');
    const allInputs = document.querySelectorAll('input, textarea, select');
    
    console.log(`Found ${forms.length} forms and ${allInputs.length} total inputs`);
    
    const targetInputs = forms.length > 0 
      ? Array.from(forms).flatMap(form => Array.from(form.querySelectorAll('input, textarea, select')))
      : Array.from(allInputs);

    console.log(`Analyzing ${targetInputs.length} target inputs`);

    // Analyze each input field
    for (const element of targetInputs) {
      if (this.isValidFormField(element)) {
        console.log('Analyzing field:', {
          name: element.name,
          id: element.id,
          type: element.type,
          placeholder: element.placeholder
        });
        
        const fieldInfo = await this.analyzeField(element);
        if (fieldInfo) {
          console.log('Detected field:', fieldInfo);
          this.detectedFields.push(fieldInfo);
        }
      }
    }

    // Sort by relevance and position
    this.detectedFields.sort((a, b) => {
      if (a.confidence > b.confidence) return -1;
      if (a.confidence < b.confidence) return 1;
      
      const aRect = a.element.getBoundingClientRect();
      const bRect = b.element.getBoundingClientRect();
      return aRect.top - bRect.top;
    });

    console.log('AI detected fields:', this.detectedFields);
    
    return this.detectedFields.map(field => ({
      type: field.type,
      selector: field.selector,
      inputType: field.inputType,
      name: field.name,
      placeholder: field.placeholder,
      label: field.label,
      confidence: field.confidence,
      visible: field.visible
    }));
  }

  async analyzeField(element) {
    // Extract field context
    const context = this.extractFieldContext(element);
    
    // Use AI to determine field type and confidence
    const analysis = await this.analyzeFieldWithAI(context);
    
    if (analysis.confidence > 0.3) { // Only include fields with reasonable confidence
      return {
        element: element,
        type: analysis.type,
        selector: this.getElementSelector(element),
        inputType: element.type || element.tagName.toLowerCase(),
        name: element.name || element.id || '',
        placeholder: element.placeholder || '',
        label: context.label,
        confidence: analysis.confidence,
        visible: this.isElementVisible(element)
      };
    }
    
    return null;
  }

  extractFieldContext(element) {
    // Get label text
    let label = '';
    const labelElement = this.findLabelForElement(element);
    if (labelElement) {
      label = labelElement.textContent.trim();
    }

    // Get nearby text context
    const nearbyText = this.getNearbyText(element);

    // Get aria-label and aria-describedby
    const ariaLabel = element.getAttribute('aria-label') || '';
    const ariaDescribedby = element.getAttribute('aria-describedby') || '';

    return {
      name: element.name || '',
      id: element.id || '',
      placeholder: element.placeholder || '',
      type: element.type || '',
      label: label,
      nearbyText: nearbyText,
      ariaLabel: ariaLabel,
      ariaDescribedby: ariaDescribedby,
      tagName: element.tagName.toLowerCase()
    };
  }

  findLabelForElement(element) {
    // Check for explicit label association
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label;
    }

    // Check for implicit label (element inside label)
    let parent = element.parentElement;
    while (parent && parent.tagName !== 'BODY') {
      if (parent.tagName === 'LABEL') {
        return parent;
      }
      parent = parent.parentElement;
    }

    // Look for nearby label-like elements
    const siblings = Array.from(element.parentElement?.children || []);
    for (const sibling of siblings) {
      if (sibling.tagName === 'LABEL' || 
          sibling.classList.contains('label') ||
          sibling.textContent.match(/^(name|email|phone|address|city|state|zip|title|experience|skills)/i)) {
        return sibling;
      }
    }

    return null;
  }

  getNearbyText(element) {
    // Get text from nearby elements
    const parent = element.parentElement;
    if (!parent) return '';

    const textElements = parent.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
    let nearbyText = '';
    
    for (const textEl of textElements) {
      if (textEl !== element && textEl.textContent.trim()) {
        nearbyText += textEl.textContent.trim() + ' ';
      }
    }

    return nearbyText.trim();
  }

  async analyzeFieldWithAI(context) {
    // Create a prompt for AI analysis
    const prompt = this.createAnalysisPrompt(context);
    
    // For now, use a rule-based approach that mimics AI
    // In a real implementation, you'd call an AI API here
    return this.ruleBasedAnalysis(context);
  }

  createAnalysisPrompt(context) {
    return `
    Analyze this form field and determine what type of data it expects:
    
    Field Context:
    - Name: ${context.name}
    - ID: ${context.id}
    - Placeholder: ${context.placeholder}
    - Type: ${context.type}
    - Label: ${context.label}
    - Nearby Text: ${context.nearbyText}
    - Aria Label: ${context.ariaLabel}
    
    Possible field types: firstName, lastName, fullName, email, phone, address, city, state, zipCode, currentTitle, summary, yearsExperience, skills
    
    Return JSON with: {"type": "fieldType", "confidence": 0.0-1.0}
    `;
  }

  ruleBasedAnalysis(context) {
    const text = `${context.name} ${context.id} ${context.placeholder} ${context.label} ${context.nearbyText} ${context.ariaLabel}`.toLowerCase();
    
    const patterns = {
      firstName: {
        patterns: ['first', 'fname', 'given name', 'first name'],
        confidence: 0.9
      },
      lastName: {
        patterns: ['last', 'lname', 'surname', 'family name', 'last name'],
        confidence: 0.9
      },
      fullName: {
        patterns: ['name', 'full name', 'complete name'],
        confidence: 0.8
      },
      email: {
        patterns: ['email', 'e-mail', 'mail'],
        confidence: 0.95
      },
      phone: {
        patterns: ['phone', 'mobile', 'cell', 'telephone', 'contact'],
        confidence: 0.9
      },
      address: {
        patterns: ['address', 'street', 'location'],
        confidence: 0.85
      },
      city: {
        patterns: ['city', 'town', 'municipality'],
        confidence: 0.9
      },
      state: {
        patterns: ['state', 'province', 'region'],
        confidence: 0.9
      },
      zipCode: {
        patterns: ['zip', 'postal', 'zipcode', 'postcode'],
        confidence: 0.9
      },
      currentTitle: {
        patterns: ['title', 'position', 'job title', 'current title', 'role'],
        confidence: 0.85
      },
      summary: {
        patterns: ['summary', 'bio', 'about', 'description', 'tell us about', 'describe'],
        confidence: 0.8
      },
      yearsExperience: {
        patterns: ['experience', 'years', 'work experience', 'professional experience'],
        confidence: 0.8
      },
      skills: {
        patterns: ['skills', 'technologies', 'programming', 'languages', 'tools'],
        confidence: 0.8
      }
    };

    let bestMatch = { type: 'unknown', confidence: 0 };

    for (const [fieldType, config] of Object.entries(patterns)) {
      for (const pattern of config.patterns) {
        if (text.includes(pattern)) {
          if (config.confidence > bestMatch.confidence) {
            bestMatch = { type: fieldType, confidence: config.confidence };
          }
        }
      }
    }

    // Special handling for input types
    if (context.type === 'email' && bestMatch.confidence < 0.5) {
      bestMatch = { type: 'email', confidence: 0.9 };
    }
    if (context.type === 'tel' && bestMatch.confidence < 0.5) {
      bestMatch = { type: 'phone', confidence: 0.9 };
    }

    return bestMatch;
  }

  async fillFormWithAI(data, detectedFields) {
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
            value: value,
            confidence: fieldInfo.confidence
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

    // Trigger events
    this.triggerEvents(element, ['input', 'change', 'blur']);
    
    return true;
  }

  fillSelectField(element, value) {
    const options = Array.from(element.options);
    
    let matchedOption = options.find(option => 
      option.value.toLowerCase().includes(value.toLowerCase()) ||
      option.text.toLowerCase().includes(value.toLowerCase())
    );

    if (matchedOption) {
      element.value = matchedOption.value;
      this.triggerEvents(element, ['change', 'input']);
      return true;
    }

    return false;
  }

  fillCheckboxField(element, value) {
    const shouldCheck = value === true || value === 'true' || value === 'yes' || value === '1';
    element.checked = shouldCheck;
    this.triggerEvents(element, ['change', 'click']);
    return true;
  }

  triggerEvents(element, eventTypes) {
    eventTypes.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true });
      element.dispatchEvent(event);
    });
  }

  isValidFormField(element) {
    if (!element || element.disabled || element.readOnly) {
      return false;
    }

    if (element.type === 'hidden') {
      return false;
    }

    if (['submit', 'button', 'reset', 'image'].includes(element.type)) {
      return false;
    }

    return this.isElementVisible(element) || this.isElementInViewport(element);
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
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.name) {
      return `[name="${element.name}"]`;
    }
    
    // Generate a unique selector based on position
    const path = [];
    let current = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        selector += '.' + current.className.split(' ').join('.');
      }
      
      const siblings = Array.from(current.parentElement?.children || []);
      const index = siblings.indexOf(current);
      
      if (index > 0) {
        selector += `:nth-child(${index + 1})`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  autoDetectForms() {
    console.log('AI Form Detector: Auto-detecting forms...');
    this.scanForForms().then(fields => {
      if (fields.length > 0) {
        console.log(`AI detected ${fields.length} form fields automatically`);
      }
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the AI form detector
if (!window.aiFormDetector) {
  try {
    window.aiFormDetector = new AIFormDetector();
    console.log('AI Form Detector: Successfully initialized');
  } catch (error) {
    console.error('AI Form Detector: Failed to initialize:', error);
  }
} else {
  console.log('AI Form Detector: Already initialized');
}

// Add a test function to verify the script is working
window.testAIFormDetector = function() {
  console.log('AI Form Detector: Test function called');
  console.log('Current URL:', window.location.href);
  console.log('Detected fields:', window.aiFormDetector?.detectedFields || []);
  return 'AI Form Detector is working!';
}; 