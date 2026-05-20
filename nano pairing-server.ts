/**
 * MARIA PAIRING SERVER - Android/Termux Compatible
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PAIRING_PORT || 7700;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'maria-pairing-site')));

// Serve website
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'maria-pairing-site', 'index.html'));
});

// Config endpoint
app.get('/api/config', function(req, res) {
  res.json({
    BOT_NAME: 'MARIA-MM',
    PREFIX: '.',
    CREATOR: '256743668990',
    FOOTER: 'markmellon the creater',
    features: {},
    status: 'online'
  });
});

// Health check
app.get('/health', function(req, res) {
  res.json({
    status: 'ok',
    service: 'MARIA-MM Pairing Server',
    time: new Date().toISOString()
  });
});

// MAIN: Generate pairing code
app.post('/pair', async function(req, res) {
  
  const reqId = Date.now().toString(36);
  const { number } = req.body;
  
  console.log('[PAIR] #' + reqId + ' Request for:', number);

  try {

    // Validate
    if (!number) {
      return res.status(400).json({
        success: false,
        error: 'Phone number required'
      });
    }

    const cleaned = String(number).replace(/[^0-9]/g, '');
    
    if (!cleaned || cleaned.length < 8 || cleaned.length > 15) {
      return res.status(400).json({
        success: false,
        error: 'Invalid number (8-15 digits)'
      });
    }

    console.log('[PAIR] Number:', cleaned);

    // Setup temp folder
    let sock = null;
    const tempFolder = path.join(__dirname, 'temp_' + reqId);

    if (fs.existsSync(tempFolder)) {
      fs.rmSync(tempFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(tempFolder, { recursive: true });

    // Import baileys
    console.log('[PAIR] Loading baileys...');
    
    let baileys;
    
    try {
      baileys = await import('@whiskeysockets/baileys');
      console.log('[PAIR] ✅ Using @whiskeysockets/baileys');
    } catch (e) {
      try {
        baileys = await import('baileys');
        console.log('[PAIR] ✅ Using baileys');
      } catch (e2) {
        console.error('[PAIR] ❌ BAILEYS NOT INSTALLED!');
        return res.status(500).json({
          success: false,
          error: 'Baileys not installed! Run: npm install @whiskeysockets/baileys'
        });
      }
    }

    const makeWASocket = baileys.default || baileys.makeWASocket;
    const useMultiFileAuthState = baileys.useMultiFileAuthState;
    const DisconnectReason = baileys.DisconnectReason;
    const Browsers = baileys.Browsers;

    if (!makeWASocket || !useMultiFileAuthState) {
      return res.status(500).json({
        success: false,
        error: 'Invalid baileys installation'
      });
    }

    // Create auth state
    console.log('[PAIR] Creating auth...');
    const { state } = await useMultiFileAuthState(tempFolder);

    // Create socket
    console.log('[PAIR] Creating socket...');
    
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: { level: 'silent' },
      browser: Browsers ? Browsers.ubuntu('MARIA-MM') : ['MARIA-MM', 'Chrome', '1.0'],
      markOnlineOnConnect: false,
      connectTimeoutMs: 30000,
      keepAliveIntervalMs: 25000,
      connectionTimeoutMs: 60000
    });

    // Request code
    console.log('[PAIR] Requesting code...');
    
    let pairingCode;
    
    try {
      pairingCode = await sock.requestPairingCode(cleaned);
      console.log('[PAIR] ✅ Code:', pairingCode);
    } catch (codeErr) {
      const errMsg = codeErr.message || '';
      
      if (errMsg.includes('already')) {
        return res.status(429).json({
          success: false,
          error: 'Rate limited! Wait 5 minutes.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Code error: ' + errMsg
      });
    }

    // Wait for connection
    console.log('[PAIR] Connecting...');

    await new Promise(function(resolve, reject) {
      
      const timeout = setTimeout(function() {
        reject(new Error('Timeout'));
      }, 60000);

      sock.ev.on('connection.update', function(update) {
        
        if (update.connection === 'open') {
          clearTimeout(timeout);
          console.log('[PAIR] ✅ Connected!');
          resolve(true);
          
        } else if (update.connection === 'close') {
          clearTimeout(timeout);
          
          const disc = update.lastDisconnect;
          let statusCode = '';
          let reason = 'Unknown';
          
          if (disc && disc.error) {
            statusCode = disc.error.output ? String(disc.error.output.statusCode) : '';
            reason = disc.error.message || 'Unknown';
          }
          
          reject(new Error('Connection closed (' + statusCode + '): ' + reason));
        }
      });
    });

    // Get session data
    console.log('[PAIR] Getting session...');
    
    await new Promise(function(r) { setTimeout(r, 1500); });

    let sessionData;
    
    try {
      const credsPath = path.join(tempFolder, 'creds.json');
      
      if (fs.existsSync(credsPath)) {
        sessionData = fs.readFileSync(credsPath, 'utf-8');
      } else {
        sessionData = JSON.stringify(state.creds || {}, null, 2);
      }
    } catch (e) {
      sessionData = JSON.stringify(state.creds || {}, null, 2);
    }

    // Cleanup
    try {
      if (sock && sock.ev) {
        sock.ev.removeAllListeners('connection.update');
      }
      if (sock && typeof sock.end === 'function') {
        sock.end();
      }
    } catch (cleanupErr) {}

    // Cleanup temp folder later
    setTimeout(function() {
      try {
        if (fs.existsSync(tempFolder)) {
          fs.rmSync(tempFolder, { recursive: true, force: true });
        }
      } catch (e) {}
    }, 120000);

    // SUCCESS!
    console.log('[PAIR] ✅✅✅ SUCCESS!');
    
    return res.status(200).json({
      success: true,
      code: pairingCode,
      session: sessionData,
      message: 'Pairing code generated!',
      instructions: [
        'Open WhatsApp → Settings → Linked Devices',
        'Tap "Link a Device"',
        'Enter code: ' + pairingCode.toUpperCase()
      ]
    });

  } catch (error) {
    
    const errObj = error || {};
    const errorMsg = errObj.message || 'Unknown error';
    
    console.error('[PAIR] ❌ ERROR:', errorMsg);

    // Cleanup on error
    try {
      if (sock && sock.ev) {
        sock.ev.removeAllListeners('connection.update');
      }
      if (sock && typeof sock.end === 'function') {
        sock.end();
      }
    } catch (e) {}

    // Determine status
    let status = 500;
    let userMsg = errorMsg;

    if (errorMsg.includes('Timeout')) {
      status = 408;
      userMsg = 'Timed out. Check internet.';
    } else if (errorMsg.includes('Rate limited')) {
      status = 429;
      userMsg = 'Wait 5 minutes.';
    } else if (errorMsg.includes('Session expired')) {
      status = 401;
      userMsg = 'Session expired. Retry.';
    } else if (errorMsg.includes('Network')) {
      status = 503;
      userMsg = 'Network error.';
    } else if (errorMsg.includes('not installed')) {
      userMsg = errorMsg; // Keep original
    }

    if (!res.headersSent) {
      return res.status(status).json({
        success: false,
        error: userMsg,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Error handler
app.use(function(err, req, res, next) {
  console.error('[SERVER] Error:', err.message);
  
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// 404 handler
app.use(function(req, res) {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// START!
app.listen(PORT, function() {
  console.log('');
  console.log('╔══════════════════════════╗');
  console.log('║  🚀 MARIA-MM SERVER v4.0  ║');
  console.log('║  📍 localhost:' + PORT + '         ║');
  console.log('║  ✅ Online                ║');
  console.log('╚══════════════════════════╝');
  console.log('');
});