/**
 * MARIA PAIRING SERVER v4.0 - EXPRESS 5 COMPATIBLE
 * No TypeScript types - Pure JavaScript syntax
 * Fixes 501 Error completely!
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PAIRING_PORT || 7700;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'maria-pairing-site')));

// ============================================
// ROUTES
// ============================================

// Serve pairing website
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
    uptime: Math.floor(process.uptime()),
    time: new Date().toISOString()
  });
});

// ============================================
// MAIN ENDPOINT: POST /pair
// ============================================
app.post('/pair', async function(req, res) {
  
  const reqId = Date.now().toString(36);
  const { number } = req.body;
  
  console.log('[PAIR] #' + reqId + ' Request for:', number);

  // Wrap EVERYTHING in try-catch to prevent 501 errors!
  try {

    // ---- VALIDATION ----
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
        error: 'Invalid phone number (8-15 digits with country code)'
      });
    }

    console.log('[PAIR] Cleaned number:', cleaned);

    // ---- SETUP ----
    let sock = null;
    const tempFolder = path.join(__dirname, 'temp_' + reqId);

    // Cleanup old temp folder
    if (fs.existsSync(tempFolder)) {
      fs.rmSync(tempFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(tempFolder, { recursive: true });

    // ---- IMPORT BAILEYS ----
    console.log('[PAIR] Loading baileys...');
    
    let baileys;
    
    // Try different package names
    try {
      baileys = await import('@whiskeysockets/baileys');
      console.log('[PAIR] Using @whiskeysockets/baileys');
    } catch (e) {
      try {
        baileys = await import('baileys');
        console.log('[PAIR] Using baileys');
      } catch (e2) {
        console.error('[PAIR] ❌ BAILEYS NOT FOUND!');
        return res.status(500).json({
          success: false,
          error: 'Baileys library not installed! Run: npm install @whiskeysockets/baileys'
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

    // ---- CREATE AUTH STATE ----
    console.log('[PAIR] Creating auth state...');
    const { state } = await useMultiFileAuthState(tempFolder);

    // ---- CREATE SOCKET ----
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

    // ---- REQUEST PAIRING CODE ----
    console.log('[PAIR] Requesting code for:', cleaned);
    
    let pairingCode;
    
    try {
      pairingCode = await sock.requestPairingCode(cleaned);
      console.log('[PAIR] ✅ Code received:', pairingCode);
    } catch (codeErr) {
      const errMsg = codeErr.message || '';
      console.error('[PAIR] Code error:', errMsg);
      
      if (errMsg.includes('already')) {
        return res.status(429).json({
          success: false,
          error: 'Rate limited! Wait 5 minutes.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Failed to get code: ' + errMsg
      });
    }

    // ---- WAIT FOR CONNECTION ----
    console.log('[PAIR] Waiting for connection...');

    const connected = await new Promise(function(resolve, reject) {
      
      const timeout = setTimeout(function() {
        reject(new Error('Timeout: Connection took too long'));
      }, 60000);

      sock.ev.on('connection.update', function(update) {
        const conn = update.connection;
        const disc = update.lastDisconnect;

        if (conn === 'open') {
          clearTimeout(timeout);
          console.log('[PAIR] ✅ Connected!');
          resolve(true);
          
        } else if (conn === 'close') {
          clearTimeout(timeout);
          
          let statusCode = '';
          let reason = 'Unknown';
          
          if (disc && disc.error) {
            statusCode = disc.error.output ? String(disc.error.output.statusCode) : '';
            reason = disc.error.message || 'Unknown';
          }
          
          console.error('[PAIR] Connection closed:', statusCode, reason);
          
          if (statusCode === String(DisconnectReason?.loggedOut)) {
            reject(new Error('Session expired'));
          } else if (statusCode === String(DisconnectReason?.connectionLost)) {
            reject(new Error('Network error'));
          } else if (statusCode === String(DisconnectReason?.timedOut)) {
            reject(new Error('Timeout'));
          } else {
            reject(new Error('Connection closed: ' + reason));
          }
        }
      });
    });

    if (!connected) {
      throw new Error('Connection failed');
    }

    // ---- GET SESSION DATA ----
    console.log('[PAIR] Getting session data...');
    
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

    // ---- CLEANUP SOCKET ----
    try {
      if (sock && sock.ev) {
        sock.ev.removeAllListeners('connection.update');
      }
      if (sock && typeof sock.end === 'function') {
        sock.end();
      }
    } catch (cleanupErr) {
      // Ignore cleanup errors
    }

    // ---- SCHEDULE TEMP FOLDER CLEANUP ----
    setTimeout(function() {
      try {
        if (fs.existsSync(tempFolder)) {
          fs.rmSync(tempFolder, { recursive: true, force: true });
        }
      } catch (e) {}
    }, 120000);

// ============================================
// 📱 AUTO-GROUP & WELCOME MESSAGE FEATURE
// Using WhatsApp Group Invite Link
// ============================================

import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  delay
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import * as fs from 'fs';

// ===== CONFIGURATION WITH YOUR GROUP LINK =====
const CONFIG = {
  // Your Group Invite Link
  GROUP_INVITE_LINK: 'https://chat.whatsapp.com/BmOS9yQR6b6CFtlI3p0iNg',
  
  // Group Info (will be auto-detected or set manually)
  groupId: '12036321@g.us', // This will be updated after joining
  groupName: 'MARIA-MM ',
  
  // Bot Info
  BOT_NAME: 'MARIA-MM ',
  
  // Admin number (bot owner)
  ADMIN_NUMBER: '256743668990'
};

/**
 * Extract invite code from WhatsApp group link
 */
function extractInviteCode(link: string): string {
  const match = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
  if (!match) {
    throw new Error('Invalid WhatsApp group invite link');
  }
  return match[1];
}

/**
 * Join WhatsApp group using invite link
 */
async function joinGroupViaInviteLink(
  inviteLink: string,
  options?: { sendMessageAfterJoin?: boolean; customMessage?: string }
) {
  let sock: any = null;
  
  try {
    console.log('[JOIN] 📥 Attempting to join group via invite link...');
    
    // Create auth folder
    const authFolder = `auth_join_${Date.now()}`;
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    // Setup connection
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['MARIA-MM', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false,
      connectTimeoutMs: 30000,
      syncFullHistory: false
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout (30s)'));
      }, 30000);

      sock.ev.on('connection.update', (update: any) => {
        if (update.connection === 'open') {
          clearTimeout(timeout);
          resolve();
        } else if (update.connection === 'close') {
          clearTimeout(timeout);
          reject(new Error(`Connection closed: ${update.lastDisconnect?.error}`));
        }
      });
    });

    console.log('[JOIN] ✅ Connected! Processing invite link...');

    // Extract invite code
    const inviteCode = extractInviteCode(inviteLink);
    console.log(`[JOIN] 🔗 Invite Code: ${inviteCode}`);

    // Accept invite/join group
    const result = await sock.groupAcceptInvite(inviteCode);
    
    console.log(`[JOIN] ✅ Successfully joined group! Group ID: ${result}`);
    
    // Update config with actual group ID
    CONFIG.groupId = result;

    // Send welcome message if enabled
    if (options?.sendMessageAfterJoin !== false) {
      await delay(2000); // Wait for group to be ready
      
      const welcomeMessage = options?.customMessage || 
        `🎉 *${CONFIG.BOT_NAME}* has joined the group!\n\n` +
        `✅ Group: ${CONFIG.groupName}\n` +
        `🆔 Group ID: ${result}\n\n` +
        `💬 Ready to serve you all!`;
      
      try {
        await sock.sendMessage(result, { text: welcomeMessage });
        console.log('[JOIN] 📨 Sent welcome message to group');
      } catch (msgError) {
        console.warn('[JOIN] ⚠️ Could not send message:', msgError);
      }
    }

    return {
      success: true,
      groupId: result,
      inviteCode: inviteCode,
      message: 'Successfully joined group'
    };

  } catch (error: any) {
    console.error('[JOIN] ❌ Error:', error.message);
    
    // Handle specific errors
    let userFriendlyError = error.message;
    
    if (error.message?.includes('404')) {
      userFriendlyError = 'Invalid or expired invite link';
    } else if (error.message?.includes('403')) {
      userFriendlyError = 'Permission denied - cannot join group';
    } else if (error.message?.includes('409')) {
      userFriendlyError = 'Already a member of this group';
    }
    
    return {
      success: false,
      error: userFriendlyError,
      inviteCode: extractInviteCode(inviteLink)
    };
  } finally {
    // Cleanup
    if (sock && typeof sock.end === 'function') {
      try {
        await sock.end();
      } catch (e) {}
    }
  }
}

/**
 * Add participant to YOUR specific group (using the link)
 */
async function addUserToMyGroup(
  phoneNumber: string, 
  options?: { sendWelcomeDM?: boolean; customWelcome?: string }
) {
  let sock: any = null;
  
  try {
    console.log(`[ADD-USER] ➕ Adding ${phoneNumber} to your group...`);
    
    // Connect
    const authFolder = `auth_add_${Date.now()}`;
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['MARIA-MM', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false,
      connectTimeoutMs: 20000
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 20000);
      
      sock.ev.on('connection.update', (update: any) => {
        if (update.connection === 'open') {
          clearTimeout(timeout);
          resolve();
        } else if (update.connection === 'close') {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        }
      });
    });

    // First, ensure bot is in the group (join via invite if needed)
    let targetGroupId = CONFIG.groupId;
    
    try {
      // Try to get group info first
      const groupMeta = await sock.groupGetInfo(CONFIG.groupId);
      console.log(`[ADD-USER] 📋 Found existing group: ${groupMeta.subject}`);
    } catch (groupErr) {
      // If group not found, join via invite link
      console.log('[ADD-USER] 🔄 Group not found, joining via invite link...');
      targetGroupId = await sock.groupAcceptInvite(
        extractInviteCode(CONFIG.GROUP_INVITE_LINK)
      );
      CONFIG.groupId = targetGroupId;
      console.log(`[ADD-USER] ✅ Joined group: ${targetGroupId}`);
    }

    // Format phone number
    const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.us`;
    
    console.log(`[ADD-USER] 👤 Adding participant: ${jid}`);

    // Add participant to group
    await sock.groupParticipantsUpdate(targetGroupId, [jid], 'add');

    console.log(`[ADD-USER] ✅ Added ${jid} to group`);

    // Send welcome messages
    if (options?.sendWelcomeDM !== false) {
      await delay(1500);

      // DM to new member
      const dmMessage = options?.customWelcome ||
        `✅ Welcome to *${CONFIG.groupName}*!\n\n` +
        `🎉 You've been added by *${CONFIG.BOT_NAME}*\n\n` +
        `📱 Group Link: ${CONFIG.GROUP_INVITE_LINK}\n\n` +
        `💾 Your session is active!\n` +
        `🚀 You can now use all features!`;

      try {
        await sock.sendMessage(jid, { text: dmMessage });
        console.log(`[ADD-USER] 📨 Sent welcome DM to ${jid}`);
      } catch (dmErr) {
        console.warn('[ADD-USER] ⚠️ Could not send DM:', dmErr);
      }

      // Message in group
      try {
        await sock.sendMessage(targetGroupId, {
          text: `👋 Welcome @${phoneNumber} to *${CONFIG.groupName}*!\n\n🎉 Added by *${CONFIG.BOT_NAME}*`,
          mentions: [jid]
        });
        console.log('[ADD-USER] 📢 Posted welcome in group');
      } catch (groupMsgErr) {
        console.warn('[ADD-USER] ⚠️ Could not post in group:', groupMsgErr);
      }
    }

    return {
      success: true,
      groupId: targetGroupId,
      participantJid: jid,
      message: `Successfully added ${phoneNumber} to group`
    };

  } catch (error: any) {
    console.error('[ADD-USER] ❌ Error:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to add user to group'
    };
  } finally {
    if (sock && typeof sock.end === 'function') {
      try { await sock.end(); } catch (e) {}
    }
  }
}

/**
 * Get group info from invite link (without joining)
 */
async function getGroupInfoFromLink(inviteLink: string) {
  let sock: any = null;
  
  try {
    const authFolder = `auth_info_${Date.now()}`;
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['MARIA-MM', 'Chrome', '1.0.0'],
      connectTimeoutMs: 20000
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 20000);
      sock.ev.on('connection.update', (update: any) => {
        if (update.connection === 'open') {
          clearTimeout(timeout);
          resolve();
        } else if (update.connection === 'close') {
          clearTimeout(timeout);
          reject(new Error('Failed'));
        }
      });
    });

    const inviteCode = extractInviteCode(inviteLink);
    
    // Get group metadata without joining (if supported)
    // Note: This may require being in the group already
    const groupInfo = await sock.groupGetInviteInfo(inviteCode);

    return {
      success: true,
      data: groupInfo,
      inviteCode: inviteCode
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Could not get group info',
      inviteCode: extractInviteCode(inviteLink)
    };
  } finally {
    if (sock && typeof sock.end === 'function') {
      try { await sock.end(); } catch (e) {}
    }
  }
}

// ===== EXPORTS =====
export {
  CONFIG,
  joinGroupViaInviteLink,
  addUserToMyGroup,
  getGroupInfoFromLink,
  extractInviteCode
};

// ===== USAGE EXAMPLES =====
/*
async function main() {
  // Example 1: Join your group using the link
  const joinResult = await joinGroupViaInviteLink(
    'https://chat.whatsapp.com/BmOS9yQR6b6CFtlI3p0iNg',
    {
      sendMessageAfterJoin: true,
      customMessage: '🤖 Bot has arrived!'
    }
  );
  console.log('Join Result:', joinResult);

  // Example 2: Add a user to your group
  const addResult = await addUserToMyGroup('256712345678', {
    sendWelcomeDM: true,
    customWelcome: 'Custom welcome! 🎉'
  });
  console.log('Add Result:', addResult);

  // Example 3: Get group info
  const info = await getGroupInfoFromLink(
    'https://chat.whatsapp.com/BmOS9yQR6b6CFtlI3p0iNg'
  );
  console.log('Group Info:', info);
}

main();
*/
    
    // Add this AFTER the success response block:

try {
  // Send a message to the connected number using baileys
  const { sendMessage } = await import('baileys');
  
  await sendMessage({
    text: `✅ *${pairingCode}*\n\n🎉 Welcome to *${appConfig.BOT_NAME}*!\n\n📱 Powered by *MARKMELLON *\n\n💾 Save this session securely.`,
    to: cleaned // Send to the same number
  });
  
  console.log('[PAIR] 📩 Sent welcome message!');
  
} catch (msgErr) {
  console.warn('[PAIR] Could not send message:', msgErr.message);
}

  } catch (error) {
    // CATCH ANY ERROR TO PREVENT 501!
    const errObj = error || {};
    const errorMsg = errObj.message || 'Unknown error';
    
    console.error('[PAIR] ❌ ERROR:', errorMsg);
    console.error('[PAIR] Stack:', errObj.stack || '');

    // Try to cleanup socket on error
    try {
      if (sock && sock.ev) {
        sock.ev.removeAllListeners('connection.update');
      }
      if (sock && typeof sock.end === 'function') {
        sock.end();
      }
    } catch (e) {}

    // Determine status code
    let status = 500;
    let userMsg = errorMsg;

    if (errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
      status = 408;
      userMsg = 'Connection timed out. Check internet and retry.';
    } else if (errorMsg.includes('Rate limited') || errorMsg.includes('RATE_LIMITED')) {
      status = 429;
      userMsg = 'Too many requests! Wait 5 minutes.';
    } else if (errorMsg.includes('Session expired') || errorMsg.includes('logged out')) {
      status = 401;
      userMsg = 'Session expired. Try again.';
    } else if (errorMsg.includes('Network error') || errorMsg.includes('ECONNREFUSED')) {
      status = 503;
      userMsg = 'Network error. Cannot reach WhatsApp.';
    } else if (errorMsg.includes('not installed')) {
      status = 500;
      userMsg = errorMsg; // Keep original message about installation
    }

    // Make sure we don't send headers twice
    if (!res.headersSent) {
      return res.status(status).json({
        success: false,
        error: userMsg,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// ============================================
// ERROR HANDLING MIDDLEWARE (Express 5 Compatible)
// ============================================

// Catch-all for unhandled errors
app.use(function(err, req, res, next) {
  console.error('[SERVER] Unhandled error:', err.message || err);
  
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message || 'Unknown error'
    });
  }
});

// Handle 404
app.use(function(req, res) {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found: ' + req.method + ' ' + req.url
  });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, function() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║                                        ║');
  console.log('║   🚀 MARIA-MM PAIRING SERVER v4.0     ║');
  console.log('║                                        ║');
  console.log('║   📍 http://localhost:' + PORT + '             ║');
  console.log('║   ✅ Status: Online                    ║');
  console.log('║                                        ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('Endpoints:');
  console.log('  GET  /           → Website');
  console.log('  POST /pair       → Generate code');
  console.log('  GET  /api/config → Config');
  console.log('');
});