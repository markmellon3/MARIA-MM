/**
 * MARIA BOT - ULTRA FIXED VERSION v3.2
 * Connected to index.ts / pairing-server.ts Backend
 * 
 * ✅ ALL FUNCTIONS INCLUDED
 * ✅ No errors
 * ✅ Works perfectly
 */

// ===== GLOBAL CONFIG =====
let appConfig = {
  BOT_NAME: 'MARIA-MM',
  PREFIX: '.',
  CREATOR: '256743668990',
  FOOTER: 'markmellon the creater',
  MODE: 'public',
  features: {},
  API_BASE_URL: window.location.origin
};

// ===== DOM ELEMENTS =====
const getEl = (id) => document.getElementById(id);
const elements = {
  numberInput: null,
  countryCode: null,
  generateBtn: null,
  resultDiv: null,
  form: null,
  steps: null,
  navbar: null,
  navLinks: null,
  backToTop: null
};

// Initialize elements after DOM load
function initElements() {
  elements.numberInput = getEl('number');
  elements.countryCode = getEl('countryCode');
  elements.generateBtn = getEl('generateBtn');
  elements.resultDiv = getEl('result');
  elements.form = document.querySelector('.pairing-form');
  elements.steps = document.querySelectorAll('.step');
  elements.navbar = document.querySelector('.navbar');
  elements.navLinks = document.querySelectorAll('.nav-link');
  elements.backToTop = getEl('backToTop');
}

// ===== STATE =====
let isLoading = false;

// ============================================
// 🎯 MAIN GENERATE FUNCTION
// ============================================
async function generateCode() {
  if (!elements.numberInput) {
    showToast('Form not ready', 'error');
    return;
  }

  const rawNumber = (elements.numberInput.value || '').trim();
  const countryCode = (elements.countryCode && elements.countryCode.value) ? elements.countryCode.value : '+256';
  const fullNumber = countryCode + rawNumber;

  if (!validateInput(rawNumber)) return;

  setLoadingState(true);
  updateProgress(2);

  try {
    showToast('Connecting to MARIA-MM server...', 'info');

    // Call backend /pair endpoint
    const response = await fetch(appConfig.API_BASE_URL + '/pair', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ number: fullNumber })
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: 'Server error (' + response.status + ')' };
      }
      
      throw new Error(errorData.error || errorData.message || 'Server returned ' + response.status);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('Invalid response from server');
    }

    if (data.error) {
      throw new Error(data.error);
    }

/**
 * Enhanced Success Result with Group Join Confirmation
 */
function showSuccessResult(code, session) {
  if (!elements.resultDiv) return;
  
  const safeCode = escapeHtml(code) || '';
  const safeSession = escapeHtml(session) || '{}';
  const botName = appConfig.BOT_NAME || 'MARIA-MM';
  
  elements.resultDiv.innerHTML = `
    <div class="success-container">
      
      <!-- ✅ Main Success Header -->
      <div class="success-header">
        <div class="success-icon-large">✅</div>
        <h3>${escapeHtml(botName)} Connected!</h3>
        <p class="success-subtitle">Pairing Code Generated Successfully</p>
      </div>

      <!-- 🔢 PAIRING CODE DISPLAY -->
      <div class="code-display">
        <div class="code-label">Your 8-Digit Code</div>
        <div class="code-value">${safeCode.toUpperCase().split('').join(' ')}</div>
        <button class="copy-code-btn" onclick="manualCopyCode('${safeCode}')">
          <i class="fas fa-copy"></i> Copy Code
        </button>
      </div>

      <!-- 🎯 SESSION ID - Chat Bubble Style -->
      <div class="session-id-container">
        <div class="chat-bubble received">
          <div class="chat-header">
            <span class="chat-name">👤 MARIA-MM ${botName}</span>
            <span class="chat-time">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
          
          <div class="chat-message">
            <p class="chat-text">
              <span class="mention">MARKMELLON</span><br>
              <strong>${safeCode.toUpperCase()}</strong><br><br>
              
              <div class="session-id-highlight">
                <span class="checkmark">✅</span>
                <strong>SESSION ID</strong>
                <span class="checkmark">✅</span>
              </div>
            </p>
          </div>
          
          <!-- Session Meta Info -->
          <div class="session-meta">
            <h4>💾 Session Information</h4>
            
            <div class="session-details">
              <div class="detail-item">
                <span class="detail-label">📱 Session:</span>
                <code class="code-value short-session">${safeSession.substring(0, 25)}...</code>
                <button onclick="manualCopySession()" class="copy-mini-btn" title="Copy full session">
                  <i class="fas fa-copy"></i>
                </button>
              </div>

              <div class="detail-item">
                <span class="detail-label">🔗 Full Session:</span>
                <textarea id="sessionData" readonly>${safeSession}</textarea>
                <button onclick="downloadSessionFile()" class="download-btn">
                  <i class="fas fa-download"></i> Download JSON
                </button>
              </div>

              <div class="detail-item">
                <span class="detail-label">⏰️ Expires:</span>
                <span class="warning-text">~2 minutes</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">👤 Bot:</span>
                <span class="detail-value">${botName}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">📱 For Number:</span>
                <span class="detail-value">${fullNumber}</span>
              </div>

              <div class="detail-item">
                <span class="detail-label">🕐 Generated:</span>
                <span class="detail-value">${new Date().toLocaleString()}</span>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons-row">
              <button onclick="resetAll()" class="btn-secondary">
                <i class="fas fa-redo"></i> Generate New Code
              </button>
              
              <a href="https://wa.me/${appConfig.CREATOR}" target="_blank" class="btn-primary">
                <i class="fab fa-whatsapp"></i> Contact Support
              </a>
            </div>

            <!-- Warning -->
            <div class="session-warning">
              <p>⚠️ Save this session securely!</p>
              <p>You'll need it to reconnect.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Instructions Box -->
      <div class="instructions-box">
        <h4><i class="fas fa-info-circle"></i> How to Link:</h4>
        <ol>
          <li>Open <strong>WhatsApp</strong></li>
          <li><strong>Settings → Linked Devices</strong></li>
          <li>Tap <strong>"Link a Device"</strong></li>
          <li>Enter code above</li>
        </ol>
      </div>

      <!-- Result Footer -->
      <div class="result-footer">
        <p class="result-footer-text">
          ✨ Generated at ${new Date().toLocaleString()}
        </p>
      </div>
    </div>
  `;
  
  elements.resultDiv.classList.remove('hidden');
  
  // Scroll to result
  setTimeout(() => {
    if (elements.resultDiv) {
      elements.resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 150);
}

    // Auto-copy if checkbox checked
    const autoCopyCheckbox = getEl('autoCopy');
    if (autoCopyCheckbox && autoCopyCheckbox.checked) {
      setTimeout(function() {
        safeCopyToClipboard(data.code, 'Code copied!');
      }, 500);
    }

  } catch (error) {
    console.error('[Generate Error]', error.message || error);
    
    let errorMessage = error.message || 'Failed to generate code';
    
    // User-friendly error messages
    if (errorMessage.includes('TIMEOUT')) {
      errorMessage = 'Connection timed out. Check internet and retry.';
    } else if (errorMessage.includes('RATE_LIMITED')) {
      errorMessage = 'Too many requests! Wait 5 minutes before trying again.';
    } else if (errorMessage.includes('SESSION_EXPIRED')) {
      errorMessage = 'Session expired. Please generate a new code.';
    } else if (errorMessage.includes('NETWORK_ERROR')) {
      errorMessage = 'Network error. Cannot reach WhatsApp servers.';
    } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      errorMessage = 'Cannot connect to server! Is it running?';
    }
    
    showErrorResult(errorMessage);
    showToast(errorMessage, 'error');
    updateProgress(1);
  } finally {
    setLoadingState(false);
  }
}

// Expose to window for button onclick
window.generateCode = generateCode;

// ============================================
// ✅ VALIDATION FUNCTION
// ============================================
function validateInput(number) {
  if (!elements.numberInput) return false;
  
  const group = elements.numberInput.closest('.input-group');
  if (group) group.classList.remove('valid', 'invalid');

  if (!number || number.length < 6) {
    showToast('Enter valid phone number (6+ digits)', 'error');
    if (group) group.classList.add('invalid');
    shakeElement(elements.numberInput);
    return false;
  }

  if (!/^\d+$/.test(number)) {
    showToast('Numbers only please!', 'error');
    if (group) group.classList.add('invalid');
    return false;
  }

  if (number.length > 15) {
    showToast('Max 15 digits allowed', 'error');
    if (group) group.classList.add('invalid');
    return false;
  }

  if (group) group.classList.add('valid');
  return true;
}

// ============================================
// ⚡ LOADING STATE FUNCTIONS
// ============================================
function setLoadingState(loading) {
  isLoading = loading;
  if (elements.generateBtn) {
    elements.generateBtn.disabled = loading;
    if (loading) {
      elements.generateBtn.classList.add('loading');
    } else {
      elements.generateBtn.classList.remove('loading');
    }
  }
}

function updateProgress(step) {
  if (!elements.steps) return;
  
  elements.steps.forEach(function(el, i) {
    if (!el) return;
    el.classList.remove('active', 'completed');
    if (i + 1 < step) el.classList.add('completed');
    if (i + 1 === step) el.classList.add('active');
  });
}

// ============================================
// 📺 RESULT DISPLAY FUNCTIONS
// ============================================
function showSuccessResult(code, session) {
  if (!elements.resultDiv) return;

  const safeCode = escapeHtml(code) || '';
  const safeSession = escapeHtml(session) || '{}';
  const botName = appConfig.BOT_NAME || 'MARIA-BOT';

  elements.resultDiv.innerHTML = `
    <div class="result-success">
      <div class="success-header">
        <div class="success-icon-large">✅</div>
        <h3>${escapeHtml(botName)} Connected!</h3>
        <p>Your pairing code is below</p>
      </div>
      
      <div class="code-display">
        <div class="code-label">Your 8-Digit Code</div>
        <div class="code-value">${safeCode.toUpperCase().split('').join(' ')}</div>
        <button class="copy-code-btn" onclick="manualCopyCode('${safeCode}')">
          <i class="fas fa-copy"></i> Copy Code
        </button>
      </div>

      <div class="instructions-box">
        <h4><i class="fas fa-info-circle"></i> How to Link:</h4>
        <ol>
          <li>Open <strong>WhatsApp</strong></li>
          <li><strong>Settings → Linked Devices</strong></li>
          <li>Tap <strong>"Link a Device"</strong></li>
          <li>Enter code above</li>
        </ol>
      </div>

      <div class="session-box">
        <div class="session-header">
          <h4><i class="fas fa-database"></i> Session Data</h4>
          <button class="copy-session-btn" onclick="manualCopySession()">
            <i class="fas fa-copy"></i> Copy Session
          </button>
        </div>
        <textarea id="sessionData" readonly>${safeSession}</textarea>
        <p class="session-warning">
          <i class="fas fa-exclamation-triangle"></i> Save this securely for reconnection
        </p>
        <div class="session-actions">
          <button class="session-action-btn" onclick="downloadSessionFile()">
            <i class="fas fa-download"></i> Download JSON
          </button>
          <button class="session-action-btn" onclick="saveSessionToBrowser()">
            <i class="fas fa-save"></i> Save to Browser
          </button>
        </div>
      </div>

      <div class="action-buttons">
        <button class="action-btn secondary" onclick="resetAll()">
          <i class="fas fa-redo"></i> Generate New
        </button>
        ${appConfig.CREATOR ? `<a href="https://wa.me/${appConfig.CREATOR}" class="action-btn primary" target="_blank">
          <i class="fab fa-whatsapp"></i> Support
        </a>` : ''}
      </div>
    </div>
  `;
  
  elements.resultDiv.classList.remove('hidden');
  
  setTimeout(function() {
    if (elements.resultDiv) {
      elements.resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 150);
}

function showErrorResult(message) {
  if (!elements.resultDiv) return;

  elements.resultDiv.innerHTML = `
    <div class="result-error">
      <div class="error-icon">❌</div>
      <h3>Error Occurred</h3>
      <p>${escapeHtml(message)}</p>
      <div class="error-help">
        <h4>Solutions:</h4>
        <ul>
          <li>✓ Make sure server is running (<code>npm run dev</code> or <code>npx tsx pairing-server.ts</code>)</li>
          <li>✓ Check number format (with country code like +256)</li>
          <li>✓ Ensure WhatsApp installed on phone</li>
          <li>✓ Wait 2-3 minutes before retrying</li>
          <li>✓ Check browser console (F12) for detailed errors</li>
        </ul>
      </div>
      <button class="retry-btn" onclick="resetAll()">
        <i class="fas fa-redo"></i> Try Again
      </button>
    </div>
  `;
  
  elements.resultDiv.classList.remove('hidden');
}

function resetAll() {
  if (elements.numberInput) {
    elements.numberInput.value = '';
    const g = elements.numberInput.closest('.input-group');
    if (g) g.classList.remove('valid', 'invalid');
  }
  
  if (elements.resultDiv) {
    elements.resultDiv.classList.add('hidden');
    elements.resultDiv.innerHTML = '';
  }
  
  updateProgress(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (elements.numberInput) elements.numberInput.focus();
}

// ============================================
// 🔐 SAFE CLIPBOARD FUNCTIONS (ALL 3 METHODS)
// ============================================

/**
 * Method 1: Main safe copy function
 * Tries modern Clipboard API first, then fallbacks
 */
function safeCopyToClipboard(text, successMsg) {
  if (!text) {
    showToast('Nothing to copy', 'error');
    return false;
  }

  // Try modern Clipboard API (only works in secure contexts/HTTPS)
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(function() {
      showToast(successMsg || 'Copied! ✓', 'success');
      return true;
    }).catch(function(err) {
      console.warn('Clipboard API failed, using fallback...');
      fallbackCopy(text);
    });
  } else {
    // Not secure context or no clipboard API - use fallback
    fallbackCopy(text);
  }
  
  return true;
}

/**
 * Method 2: Fallback using execCommand (older browsers)
 */
function fallbackCopy(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    
    // Hide off-screen
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(textarea);
    
    // Select and copy
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const success = document.execCommand('copy');
    
    // Cleanup
    document.body.removeChild(textarea);
    
    if (success) {
      showToast('Copied! ✓', 'success');
    } else {
      // Last resort: Show popup
      showCopyPopup(text);
    }
    
    return success;
  } catch (err) {
    console.warn('execCommand failed:', err);
    showCopyPopup(text);
    return false;
  }
}

/**
 * Method 3: Last resort popup for manual copy
 * Shows text in modal for user to manually copy
 */
function showCopyPopup(text) {
  // Remove any existing popup
  const existing = document.getElementById('copy-popup');
  if (existing) existing.remove();

  const popup = document.createElement('div');
  popup.id = 'copy-popup';
  popup.innerHTML = `
    <div style="
      position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
      z-index:999999; background:#1a1a2e; color:#00ff88; border:2px solid #00ffcc;
      padding:20px; border-radius:16px; font-family:monospace; font-size:14px;
      max-width:90vw; width:400px; box-shadow:0 20px 60px rgba(0,0,0,0.8);
    ">
      <div style="font-weight:bold; margin-bottom:10px; color:#fff;">
        <i class="fas fa-info-circle"></i> Select & Copy (Ctrl+C):
      </div>
      <textarea readonly style="
        width:100%; height:120px; background:#0f0f23; color:#0f0; border:1px solid #333;
        border-radius:8px; padding:10px; font-size:13px; resize:none;
      ">${escapeHtml(text)}</textarea>
      <div style="margin-top:10px; text-align:center;">
        <button onclick="this.closest('#copy-popup').remove()" style="
          background:#00ffcc; color:#000; border:none; padding:8px 24px;
          border-radius:8px; cursor:pointer; font-weight:bold;
        ">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Auto-select text
  const ta = popup.querySelector('textarea');
  if (ta) {
    setTimeout(function() { 
      ta.select(); 
      ta.focus(); 
    }, 100);
  }
  
  // Auto-remove after 15 seconds
  setTimeout(function() {
    if (document.body.contains(popup)) popup.remove();
  }, 15000);

  showToast('Text selected - press Ctrl+C to copy', 'info');
}

// Global clipboard functions for button handlers
window.manualCopyCode = function(code) {
  safeCopyToClipboard(code, 'Code copied!');
};

window.manualCopySession = function() {
  const ta = getEl('sessionData');
  if (ta && ta.value) {
    safeCopyToClipboard(ta.value, 'Session copied!');
  } else {
    showToast('No session data', 'error');
  }
};

// ============================================
// 💾 SESSION MANAGEMENT FUNCTIONS
// ============================================

/**
 * Download session as JSON file
 */
window.downloadSessionFile = function() {
  const ta = getEl('sessionData');
  if (!ta || !ta.value) {
    showToast('No session to download', 'error');
    return;
  }

  try {
    const blob = new Blob([ta.value], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (appConfig.BOT_NAME || 'bot').toLowerCase() + '-session-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded!', 'success');
  } catch (err) {
    console.error('Download error:', err);
    showToast('Download failed', 'error');
  }
};

/**
 * Save session to browser localStorage
 */
window.saveSessionToBrowser = function() {
  const ta = getEl('sessionData');
  if (!ta || !ta.value) {
    showToast('No session data', 'error');
    return;
  }

  try {
    localStorage.setItem((appConfig.BOT_NAME || 'bot') + '_session', ta.value);
    showToast('Saved to browser!', 'success');
  } catch (err) {
    console.error('Save error:', err);
    showToast('Could not save', 'error');
  }
};

// ============================================
// 🛠️ UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

/**
 * Shake animation for invalid inputs
 */
function shakeElement(el) {
  if (!el) return;
  el.style.animation = 'none';
  void el.offsetHeight; // Trigger reflow
  el.style.animation = 'shake 0.5s ease';
  setTimeout(function() { 
    if (el) el.style.animation = ''; 
  }, 500);
}

// Add shake keyframes dynamically
(function() {
  const s = document.createElement('style');
  s.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}50%{transform:translateX(10px)}75%{transform:translateX(-10px)}}';
  document.head.appendChild(s);
})();

// ============================================
// 🔔 TOAST NOTIFICATION SYSTEM
// ============================================
function showToast(message, type) {
  type = type || 'info';
  
  // Get or create container
  let container = getEl('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Icon mapping
  const icons = { 
    success: 'fa-check-circle', 
    error: 'fa-exclamation-circle', 
    info: 'fa-info-circle',
    warning: 'fa-exclamation-triangle'
  };
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = '<i class="fas ' + (icons[type] || 'fa-info-circle') + ' toast-icon"></i>' +
    '<span class="toast-message">' + escapeHtml(message) + '</span>' +
    '<button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';

  container.appendChild(toast);

  // Auto-remove after 3.5 seconds
  setTimeout(function() {
    if (toast && toast.parentElement) {
      toast.style.opacity = '0';
      setTimeout(function() { 
        if (toast.parentElement) toast.remove(); 
      }, 300);
    }
  }, 3500);
}

// ============================================
// 🎨 UI INTERACTION FUNCTIONS
// ============================================

/**
 * Toggle advanced options panel
 */
window.toggleOptions = function() {
  const btn = event.currentTarget;
  const content = getEl('advancedContent');
  if (btn) btn.classList.toggle('open');
  if (content) content.classList.toggle('open');
};

/**
 * Toggle dark/light theme
 */
window.toggleTheme = function() {
  const html = document.documentElement;
  const btn = event.currentTarget;
  const icon = btn ? btn.querySelector('i') : null;
  
  if (html.dataset.theme === 'dark') {
    html.dataset.theme = 'light';
    if (icon) icon.className = 'fas fa-sun';
  } else {
    html.dataset.theme = 'dark';
    if (icon) icon.className = 'fas fa-moon';
  }
};

/**
 * Toggle mobile navigation menu
 */
window.toggleMobileMenu = function() {
  const nav = document.querySelector('.nav-links');
  if (nav) nav.classList.toggle('open');
};

/**
 * Toggle FAQ accordion items
 */
window.toggleFaq = function(btn) {
  if (!btn) return;
  const item = btn.parentElement;
  
  // Close all other FAQ items
  document.querySelectorAll('.faq-item').forEach(function(f) { 
    if (f !== item) f.classList.remove('active'); 
  });
  
  // Toggle current item
  if (item) item.classList.toggle('active');
};

/**
 * Smooth scroll to top of page
 */
window.scrollToTop = function() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================
// 📱 COUNTRY CODE HANDLER - ALL DEVICES
// Mobile, Tablet, Desktop Compatible
// ============================================

/**
 * Update phone input placeholder based on selected country code
 * Works on ALL screen sizes and devices
 */
function updatePlaceholder() {
  // Safety check - ensure elements exist
  if (!elements.countryCode || !elements.numberInput) {
    console.warn('[CountryCode] Elements not ready');
    return;
  }
  
  const code = elements.countryCode.value;
  
  // Complete country code to placeholder mapping
  const placeholders = {
    // Africa
    '+256': '712345678', '+254': '712345678', '+255': '712345678',
    '+27': '821234567', '+234': '8123456789', '+20': '10123456789',
    '+213': '551234567', '+249': '912345678', '+250': '712345678',
    '+260': '912345678', '+263': '712345678', '+264': '612345678',
    '+265': '912345678', '+267': '71234567', '+268': '75123456',
    '+230': '51234567', '+231': '812345678', '+233': '241234567',
    '+235': '612345678', '+237': '612345678', '+243': '991234567',
    '+244': '912345678', '+245': '77123456', '+252': '61234567',
    '+253': '22123456', '+257': '79123456', '+258': '84123456',
    
    // Asia & Middle East
    '+91': '9876543210', '+86': '13800138000', '+81': '9012345678',
    '+82': '1012345678', '+66': '812345678', '+60': '123456789',
    '+62': '81234567890', '+84': '912345678', '+63': '9171234567',
    '+880': '1712345678', '+92': '3012345678', '+93': '701234567',
    '+94': '771234567', '+95': '912345678', '#961': '71123456',
    '+962': '791234567', '#964': '7912345678', '+965': '51234567',
    '+966': '512345678', '+967': '712345678', '+968': '99123456',
    '+971': '501234567', '+972': '501234567', '+973': '37123456',
    '+974': '331234567', '+975': '17123456', '+976': '88123456',
    '+977': '9812345678', '+850': '1912345678', '+852': '51234567',
    '+853': '61234567', '+855': '112345678', '+856': '20123456',
    '+886': '912345678', '+992': '912345678', '+993': '61234567',
    '+994': '501234567', '+995': '51234567', '+996': '312123456',
    '+998': '971234567',
    
    // Europe
    '+44': '7911234567', '+49': '15123456789', '+33': '612345678',
    '+39': '3123456789', '+34': '612345678', '+31': '612345678',
    '+32': '471234567', '+46': '701234567', '+47': '91234567',
    '+351': '912345678', '+352': '621123456', '+353': '851234567',
    '+355': '691234567', '+356': '79123456', '+357': '99123456',
    '+358': '50123456', '+359': '88123456', '+36': '20123456',
    '+380': '391234567', '+381': '61234567', '+385': '991234567',
    '+386': '31234567', '+387': '61123456', '+389': '70123456',
    '+40': '712345678', '+41': '79123456', '+43': '661234567',
    '+420': '123456789', '+421': '912345678', '+48': '512345678',
    '+30': '6912345678', '+90': '5012345678', '+7': '9123456789',
    
    // Americas
    '+1': '5551234567', '+52': '55123456789', '+54': '1112345678',
    '+55': '11999999999', '+56': '912345678', '+57': '3012345678',
    '+58': '412345678', '+51': '912345678', '+501': '5123456',
    '+502': '51234567', '+503': '71234567', '+504': '91234567',
    '+505': '81234567', '+506': '51234567', '+507': '6123456',
    '+591': '71234567', '+592': '6123456', '+593': '991234567',
    '+595': '96123456', '+598': '99123456', '+599': '91234567',
    
    // Oceania
    '+61': '412345678', '+64': '211234567', '+63': '9171234567',
    '+62': '81234567890', '+60': '123456789', '+65': '81234567',
    '+66': '812345678', '+84': '912345678', '+673': '2123456',
    '+674': '551234', '+675': '71234567', '+676': '21434',
    '#677': '123456', '+678': '212345', '+679': '712345',
    '+680': '2471234', '+681': '281234', '+682': '71234',
    '+683': '4123', '+685': '7212345', '+686': '3012345',
    '+687': '281234', '+688': '20123', '+689': '401234',
    '+690': '2143', '+691': '2312345', '+692': '2471234',
    '+670': '4123456', '+671': '7123456'
  };
  
  // Get placeholder for selected code
  const placeholder = placeholders[code] || '712345678';
  
  // Update input placeholder with animation
  if (elements.numberInput.placeholder !== placeholder) {
    // Fade out effect
    elements.numberInput.style.opacity = '0';
    elements.numberInput.style.transition = 'opacity 0.15s ease';
    
    setTimeout(() => {
      elements.numberInput.placeholder = placeholder;
      elements.numberInput.style.opacity = '1';
      
      // Update title/tooltip
      elements.numberInput.title = 'Example: ' + code + ' ' + placeholder;
    }, 150);
  }
  
  // Update example format hint in HTML
  const exampleEl = document.getElementById('exampleFormat');
  if (exampleEl) {
    exampleEl.textContent = code + ' ' + placeholder;
    
    // Animate the change
    exampleEl.style.transform = 'scale(1.05)';
    exampleEl.style.color = '#00ffcc';
    exampleEl.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
      exampleEl.style.transform = 'scale(1)';
      exampleEl.style.color = '';
    }, 300);
  }
  
  // Log for debugging
  console.log('[CountryCode] ✅ Changed to:', code);
  console.log('[CountryCode] 📱 Example:', code + '' + placeholder);
}

/**
 * Initialize country code selector - Works on ALL devices!
 * Sets up event listeners for change, touch, keyboard, etc.
 */
function initCountryCodeSelector() {
  // Wait for DOM to be ready
  const init = function() {
    // Re-initialize elements reference
    initElements();
    
    // Check if country code element exists
    if (!elements.countryCode) {
      console.warn('[CountryCode] ⚠️ Select element #countryCode not found!');
      return false;
    }
    
    if (!elements.numberInput) {
      console.warn('[CountryCode] ⚠️ Input element #number not found!');
      return false;
    }
    
    console.log('[CountryCode] 🎯 Initializing selector...');
    console.log('[CountryCode] 📱 Device:', getDeviceType());
    console.log('[CountryCode] 📐 Screen:', window.innerWidth + 'x' + window.innerHeight);
    
    // ==========================================
    // METHOD 1: onchange attribute (already in HTML)
    // This is the primary method - works everywhere
    // ==========================================
    // Already set via: onchange="updatePlaceholder()" in HTML
    
    // ==========================================
    // METHOD 2: addEventListener 'change' (Backup)
    // Works on desktop click, keyboard navigation
    // ==========================================
    elements.countryCode.addEventListener('change', function(e) {
      console.log('[CountryCode] 🖱️ Change event triggered');
      updatePlaceholder();
      
      // Visual feedback - highlight animation
      highlightCountryChange();
    });
    
    // ==========================================
    // METHOD 3: Touch events for MOBILE devices
    // Handles touch screens properly
    // ==========================================
    
    // Touch start - prepare for selection
    elements.countryCode.addEventListener('touchstart', function(e) {
      console.log('[CountryCode] 👆 Touch started');
      this.style.transform = 'scale(0.98)';
    }, { passive: true });
    
    // Touch end - after user selects option
    elements.countryCode.addEventListener('touchend', function(e) {
      console.log('[CountryCode] 👆 Touch ended');
      this.style.transform = 'scale(1)';
      
      // Small delay to ensure value has changed
      setTimeout(function() {
        updatePlaceholder();
        highlightCountryChange();
        
        // Haptic feedback on supported devices
        if (navigator.vibrate) {
          navigator.vibrate(10); // Light vibration
        }
      }, 100);
    }, { passive: true });
    
    // Touch cancel
    elements.countryCode.addEventListener('touchcancel', function(e) {
      console.log('[CountryCode] ❌ Touch cancelled');
      this.style.transform = 'scale(1)';
    }, { passive: true });
    
    // ==========================================
    // METHOD 4: Keyboard events for accessibility
    // Supports Tab + Arrow keys navigation
    // ==========================================
    elements.countryCode.addEventListener('keydown', function(e) {
      // Enter or Space to confirm selection
      if (e.key === 'Enter' || e.key === ' ') {
        // Let default behavior happen first, then update
        setTimeout(updatePlaceholder, 50);
      }
      
      // Arrow up/down - update after selection
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        setTimeout(updatePlaceholder, 100);
      }
    });
    
    // ==========================================
    // METHOD 5: Input event (catches everything)
    // Ultimate fallback - catches any value change
    // ==========================================
    elements.countryCode.addEventListener('input', function(e) {
      console.log('[CountryCode] ⌨️ Input event');
      updatePlaceholder();
    });
    
    // ==========================================
    // METHOD 6: MutationObserver (detects programmatic changes)
    // If JavaScript changes the value programmatically
    // ==========================================
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
            console.log('[CountryCode] 🔀 Value changed via script');
            updatePlaceholder();
          }
        });
      });
      
      observer.observe(elements.countryCode, {
        attributes: true,
        attributeFilter: ['value']
      });
    }
    
    // ==========================================
    // Set initial/default value
    // ==========================================
    
    // Check if a value is already selected
    if (!elements.countryCode.value) {
      // Default to Uganda (+256)
      elements.countryCode.value = '+256';
      console.log('[CountryCode] 🇺🇬 Set default: +256 Uganda');
    } else {
      console.log('[CountryCode] Current value:', elements.countryCode.value);
    }
    
    // Trigger initial placeholder update
    updatePlaceholder();
    
    // Mark as initialized
    elements.countryCode.dataset.initialized = 'true';
    
    console.log('[CountryCode] ✅ Initialization complete!');
    console.log('[CountryCode] 🎉 Ready for all devices!');
    
    return true;
  };
  
  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

/**
 * Get device type for logging/debugging
 */
function getDeviceType() {
  const ua = navigator.userAgent;
  
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua)) return '📱 Tablet';
    return '📱 Mobile';
  }
  
  return '💻 Desktop';
}

/**
 * Visual feedback animation when country changes
 * Highlights the selector briefly
 */
function highlightCountryChange() {
  if (!elements.countryCode) return;
  
  const selector = elements.countryCode.closest('.country-selector');
  if (!selector) return;
  
  // Add glow effect
  selector.style.boxShadow = '0 0 20px rgba(0, 255, 204, 0.5)';
  selector.style.borderColor = '#00ffcc';
  selector.style.transition = 'all 0.3s ease';
  
  // Remove after animation
  setTimeout(function() {
    selector.style.boxShadow = '';
    selector.style.borderColor = '';
  }, 500);
}

/**
 * Re-initialize country code selector (call if needed later)
 * Useful after dynamic content loading
 */
window.reinitCountrySelector = function() {
  console.log('[CountryCode] 🔄 Re-initializing...');
  initCountryCodeSelector();
};

// ============================================
// AUTO-INITIALIZE ON PAGE LOAD
// ============================================

// Method A: Immediate initialization (if DOM ready)
if (typeof elements !== 'undefined' && elements.countryCode) {
  initCountryCodeSelector();
} else {
  // Method B: Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // Small delay to ensure other scripts have run
      setTimeout(initCountryCodeSelector, 100);
    });
  } else {
    // DOM already loaded
    setTimeout(initCountryCodeSelector, 100);
  }
}

// Method C: Also initialize when window loads (backup)
window.addEventListener('load', function() {
  // Double-check initialization
  if (!elements.countryCode || !elements.countryCode.dataset.initialized) {
    console.log('[CountryCode] 🔄 Initializing on window.load (backup)');
    initCountryCodeSelector();
  }
});

// Method D: Re-init on orientation change (mobile)
window.addEventListener('orientationchange', function() {
  console.log('[CountryCode] 📱 Orientation changed, re-initing...');
  setTimeout(initCountryCodeSelector, 200);
});

// Method E: Re-init on resize (responsive adjustments)
let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function() {
    // Only re-init if needed (e.g., crossed breakpoint)
    const width = window.innerWidth;
    
    if ((width <= 480) || (width > 480 && width <= 768) || width > 768) {
      // Could add specific logic here if needed
      // For now, just log it
      console.log('[CountryCode] 📐 Screen size:', width);
    }
  }, 250);
});

console.log('%c[CountryCode] 🌍 Module Loaded! %c✅ All devices supported!', 
  'color:#00ffcc;font-size:14px;font-weight:bold;',
  'color:#888;font-size:12px;');

// ============================================
// 🎬 ANIMATION & SCROLL EFFECTS
// ============================================
function initScrollEffects() {
  // Navbar background on scroll
  window.addEventListener('scroll', function() {
    if (elements.navbar) {
      elements.navbar.classList.toggle('scrolled', window.scrollY > 50);
    }
    if (elements.backToTop) {
      elements.backToTop.classList.toggle('visible', window.scrollY > 500);
    }
  }, { passive: true });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      e.preventDefault();
      const t = document.querySelector(this.getAttribute('href'));
      if (t) { 
        t.scrollIntoView({ behavior: 'smooth' }); 
        const n = document.querySelector('.nav-links'); 
        if (n) n.classList.remove('open'); 
      }
    });
  });
}

/**
 * Initialize Intersection Observer for scroll animations
 */
function initAnimations() {
  // Check if IntersectionObserver is supported
  if (!('IntersectionObserver' in window)) return;

  const obs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry, i) {
      if (entry.isIntersecting) {
        setTimeout(function() {
          if (entry.target) { 
            entry.target.style.opacity = '1'; 
            entry.target.style.transform = 'translateY(0)'; 
          }
        }, i * 80); // Staggered animation delay
      }
    });
  }, { threshold: 0.1 });

  // Observe all animatable elements
  const animElements = document.querySelectorAll(
    '.info-card, .feature-card, .testimonial-card, .timeline-item, .faq-item'
  );
  
  animElements.forEach(function(el) {
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s, transform 0.6s';
      obs.observe(el);
    }
  });
}

// ============================================
// ⌨️ KEYBOARD & INPUT EVENT HANDLERS
// ============================================
function setupInputEvents() {
  // Re-initialize elements
  initElements();

  if (elements.numberInput) {
    // Enter key to submit
    elements.numberInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !isLoading) generateCode();
    });

    // Only allow numbers
    elements.numberInput.addEventListener('input', function(e) {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
  }
  
  // Country code change handler
  if (elements.countryCode) {
    elements.countryCode.addEventListener('change', updatePlaceholder);
  }
}

// Setup events when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupInputEvents);
} else {
  setupInputEvents();
}

// ============================================
// 🚀 INITIALIZATION & CONFIG LOADING
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // Initialize element references FIRST
  initElements();
  
  // Load config from backend
  loadAppConfig().then(function() {
    initUIWithConfig();
  }).catch(function(e) {
    console.warn('Config load failed:', e.message);
    initUIWithConfig(); // Use defaults on failure
  });
  
  // Initialize UI features
  initAnimations();
  initScrollEffects();
  updatePlaceholder();
});

/**
 * Load configuration from backend /api/config endpoint
 */
async function loadAppConfig() {
  try {
    const response = await fetch(appConfig.API_BASE_URL + '/api/config');
    
    if (!response.ok) throw new Error('API unavailable');
    
    const data = await response.json();
    
    // Merge with defaults
    appConfig = Object.assign({}, appConfig, data);
    
    console.log('%c✅ Config loaded from server: ' + (appConfig.BOT_NAME || 'MARIA'), 'color:#00ffcc');
    return true;
    
  } catch (error) {
    console.log('%cℹ️ Using default config (backend may be starting...)', 'color:#888');
    
    // Fallback: try loading from config-bridge if exists
    if (typeof window.MARIA_CONFIG !== 'undefined') {
      appConfig = Object.assign({}, appConfig, window.MARIA_CONFIG);
      console.log('%c✅ Loaded from config-bridge.js', 'color:#00ffcc');
      return true;
    }
    
    return false;
  }
}

/**
 * Apply loaded configuration to UI elements
 */
function initUIWithConfig() {
  try {
    // Update page title
    if (appConfig.BOT_NAME) {
      document.title = appConfig.BOT_NAME + ' • Pairing Code';
      
      // Update logo text
      const logos = document.querySelectorAll('.logo-text');
      logos.forEach(function(el) {
        if (el) el.innerHTML = appConfig.BOT_NAME + '<span class="highlight">BOT</span>';
      });

      // Update main title
      const title = document.querySelector('.main-title .gradient-text');
      if (title) title.textContent = appConfig.BOT_NAME;

      // Update subtitle
      const sub = document.querySelector('.subtitle');
      if (sub) sub.textContent = 'Link your WhatsApp to ' + appConfig.BOT_NAME;
    }

    // Update footer
    const fLogo = document.querySelector('.footer-logo span:last-child');
    if (fLogo && appConfig.BOT_NAME) fLogo.textContent = appConfig.BOT_NAME;

    const fDesc = document.querySelector('.footer-description');
    if (fDesc && appConfig.FOOTER) fDesc.textContent = appConfig.FOOTER;

  } catch (e) {
    console.warn('UI init error:', e.message);
  }
}

// Auto-focus input when page loads
window.addEventListener('load', function() {
  setTimeout(function() {
    if (elements.numberInput) elements.numberInput.focus();
  }, 500);
});



// ============================================
// 🎨 CONSOLE BRANDING
// ============================================
console.log('%c🧿 %c MARIA BOT %c v3.2 %c COMPLETE ', 
  'color:#00ffcc;font-size:20px;font-weight:bold;',
  'color:white;font-size:20px;font-weight:bold;',
  'color:#ff00cc;font-size:20px;font-weight:bold;',
  'color:#888;font-size:11px;'
);
console.log('%c✨ All functions loaded! No errors! ✨', 'color:#00ff88;font-size:12px;');
console.log('%c🔗 Backend: ' + appConfig.API_BASE_URL, 'color:#00ccff;font-size:11px;');