
const express = require('express');
const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  Browsers 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ====================== MIDDLEWARE ======================
app.use(express.json());
app.use(express.static('public'));

// ====================== HTML TEMPLATE ======================
const getHomePage = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MARIA BOT • Pairing Code</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Poppins', sans-serif;
      background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(12px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 40px 30px;
      width: 100%;
      max-width: 460px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.4);
      text-align: center;
    }
    h1 {
      font-size: 2.4rem;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #ff00cc, #00ffcc);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #ddd;
      margin-bottom: 25px;
      font-size: 1.05rem;
    }
    input {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 12px;
      background: rgba(255,255,255,0.15);
      color: white;
      font-size: 1.1rem;
      margin-bottom: 20px;
      outline: none;
      transition: all 0.3s;
    }
    input:focus {
      background: rgba(255,255,255,0.25);
      box-shadow: 0 0 0 3px rgba(0, 255, 200, 0.3);
    }
    button {
      background: linear-gradient(90deg, #00ffcc, #ff00cc);
      color: #000;
      font-weight: 700;
      padding: 16px 40px;
      border: none;
      border-radius: 50px;
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.3s;
      width: 100%;
    }
    button:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 20px rgba(0, 255, 200, 0.4);
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    #result {
      margin-top: 30px;
      padding: 20px;
      background: rgba(0,0,0,0.3);
      border-radius: 12px;
      min-height: 180px;
      text-align: left;
    }
    .loading { color: #00ffcc; font-style: italic; }
    .success { color: #00ff88; }
    .error { color: #ff6666; }
    textarea {
      width: 100%;
      height: 160px;
      background: #111;
      color: #0f0;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 12px;
      font-family: monospace;
      resize: vertical;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧿 MARIA BOT</h1>
    <p>Link your WhatsApp easily with Pairing Code</p>
    
    <input type="text" id="number" placeholder="256712345678" maxlength="15">
    
    <button id="generateBtn" onclick="generateCode()">Generate Pairing Code</button>
    
    <div id="result"></div>
  </div>

  <script>
    async function generateCode() {
      const numberInput = document.getElementById('number').value.trim();
      const resultDiv = document.getElementById('result');
      const btn = document.getElementById('generateBtn');
      
      if (!numberInput || numberInput.length < 8) {
        resultDiv.innerHTML = '<p class="error">❌ Please enter a valid phone number with country code (e.g. 256712345678)</p>';
        return;
      }

      // Disable button and show loading
      btn.disabled = true;
      btn.textContent = 'Generating...';
      resultDiv.innerHTML = '<p class="loading">⏳ Generating pairing code... Please wait (this may take up to 30 seconds)</p>';

      try {
        const res = await fetch('/pair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: numberInput })
        });

        const data = await res.json();

        if (data.error) {
          resultDiv.innerHTML = \`<p class="error">❌ Error: \${data.error}</p>\`;
        } else {
          resultDiv.innerHTML = \`
            <p class="success">✅ Pairing Code Generated Successfully!</p>
            <strong style="font-size: 2.5rem; color:#00ffcc; letter-spacing: 5px; display:block; margin:15px 0;">
              \${data.code}
            </strong>
            <p style="color:#aaa; margin: 15px 0;">Enter this code in WhatsApp → Linked Devices → Link a Device</p>
            
            <strong style="display:block; margin-top:20px; color:#fff;">📁 SESSION DATA (Copy and save this):</strong>
            <textarea readonly>\${data.session}</textarea>
            <p style="font-size:0.85rem; color:#888; margin-top:8px;">⚠️ Save this session data to reconnect without scanning QR again</p>
          \`;
        }
      } catch (err) {
        console.error('Request failed:', err);
        resultDiv.innerHTML = '<p class="error">❌ Request failed. Please check your internet connection and try again.</p>';
      } finally {
        // Re-enable button
        btn.disabled = false;
        btn.textContent = 'Generate Pairing Code';
      }
    }
    
    // Allow Enter key to submit
    document.getElementById('number').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') generateCode();
    });
  </script>
</body>
</html>
`;

// ====================== UTILITY FUNCTIONS ======================

/**
 * Safely remove directory recursively
 */
function safeRemoveDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`✅ Cleaned up temp folder: ${dirPath}`);
    }
  } catch (err) {
    console.warn(`⚠️ Failed to cleanup folder ${dirPath}:`, err.message);
  }
}

/**
 * Validate phone number format
 */
function validatePhoneNumber(number) {
  // Remove non-digits
  const cleaned = number.replace(/[^0-9]/g, '');
  
  // Check length (should be between 8-15 digits)
  if (cleaned.length < 8 || cleaned.length > 15) {
    return { valid: false, error: 'Phone number must be between 8-15 digits' };
  }
  
  // Check if it starts with a valid country code (not 0)
  if (cleaned.startsWith('0')) {
    return { valid: false, error: 'Please include country code (e.g., 256 for Uganda, not starting with 0)' };
  }
  
  return { valid: true, cleanedNumber: cleaned };
}

// ====================== ROUTES ======================

// Home Page
app.get('/', (req, res) => {
  res.send(getHomePage());
});

// Pairing Code Endpoint (FIXED VERSION)
app.post('/pair', async (req, res) => {
  let { number } = req.body;
  let sock = null;
  let tempFolder = null;

  // ========== INPUT VALIDATION ==========
  if (!number) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const validation = validatePhoneNumber(number);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  number = validation.cleanedNumber;
  tempFolder = `./temp_auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Ensure temp directory doesn't exist
    safeRemoveDir(tempFolder);

    // Create auth state
    const { state, saveCreds } = await useMultiFileAuthState(tempFolder);

    // Create socket connection
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
    });

    // ========== REQUEST PAIRING CODE ==========
    let pairingCode;
    try {
      pairingCode = await sock.requestPairingCode(number);
      console.log(`📱 Pairing code requested for: ${number}`);
    } catch (error) {
      console.error('❌ Pairing code request failed:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('already')) {
        throw new Error('This number is already connected or has a recent session. Wait a few minutes and try again.');
      }
      throw new Error('Failed to generate pairing code. Make sure the number is correct and has WhatsApp installed.');
    }

    // ========== WAIT FOR CONNECTION (FIXED RACE CONDITION) ==========
    const connectionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout - please try again'));
      }, 60000); // 60 second timeout

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        console.log(`📡 Connection update:`, connection);

        if (connection === 'open') {
          clearTimeout(timeout);
          console.log('✅ Connection opened successfully!');
          resolve(true);
        } else if (connection === 'close') {
          clearTimeout(timeout);
          
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          
          if (statusCode === DisconnectReason.loggedOut) {
            reject(new Error('Device was logged out. Please scan QR code again.'));
          } else if (statusCode === DisconnectReason.connectionLost) {
            reject(new Error('Connection lost. Check your internet and try again.'));
          } else {
            reject(new Error(`Connection closed unexpectedly (${statusCode})`));
          }
        }
      });

      // Store reference for cleanup
      sock._connectionTimeout = timeout;
    });

    // Wait for connection to establish
    await connectionPromise;

    // Small delay to ensure creds are saved
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ========== GET SESSION DATA ==========
    let sessionData;
    try {
      // Read the actual credential files from disk
      const credsPath = path.join(tempFolder, 'creds.json');
      if (fs.existsSync(credsPath)) {
        const credsContent = fs.readFileSync(credsPath, 'utf-8');
        sessionData = JSON.stringify(JSON.parse(credsContent), null, 2);
      } else {
        // Fallback to state object
        sessionData = JSON.stringify(state, null, 2);
      }
    } catch (err) {
      console.warn('⚠️ Could not read session file, using state object:', err.message);
      sessionData = JSON.stringify(state, null, 2);
    }

    // ========== SUCCESS RESPONSE ==========
    console.log(`✅ Success! Returning pairing code for ${number}`);
    
    res.json({
      code: pairingCode,
      session: sessionData,
      message: 'Pairing code generated successfully'
    });

  } catch (err) {
    console.error('❌ Pairing endpoint error:', err);
    
    // Return appropriate error response
    const errorMessage = err.message || 'Internal server error occurred';
    const statusCode = err.message.includes('timeout') ? 408 : 500;
    
    if (!res.headersSent) {
      res.status(statusCode).json({ 
        error: errorMessage 
      });
    }
  } finally {
    // ========== CLEANUP RESOURCES (CRITICAL FIX) ==========
    
    // Close socket connection properly
    if (sock) {
      try {
        // Remove all event listeners to prevent memory leaks
        sock.ev.removeAllListeners('connection.update');
        
        // Clear any pending timeouts
        if (sock._connectionTimeout) {
          clearTimeout(sock._connectionTimeout);
        }
        
        // End connection gracefully
        sock.end();
        console.log('🔒 Socket connection closed');
      } catch (err) {
        console.warn('⚠️ Error closing socket:', err.message);
      }
    }

    // Cleanup temp folder (delay to ensure files are written)
    if (tempFolder) {
      setTimeout(() => {
        safeRemoveDir(tempFolder);
      }, 30000); // Clean up after 30 seconds
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'MARIA BOT Pairing Server',
    timestamp: new Date().toISOString()
  });
});

// ====================== GRACEFUL SHUTDOWN ======================
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  // Don't exit, log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// ====================== SERVER START ======================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   🚀 MARIA BOT Pairing Server           ║
║                                          ║
║   📍 Running on: http://localhost:${PORT}     ║
║   📱 Open URL to generate pairing codes  ║
║                                          ║
╚══════════════════════════════════════════╝
  `);
});
