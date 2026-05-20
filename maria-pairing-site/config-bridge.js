/**
 * Config Bridge
 * Connects maria-pairing-site to root config.ts
 * 
 * File: maria-pairing-site/config-bridge.js
 */

const path = require('path');
const fs = require('fs');

class ConfigBridge {
 constructor() {
  this.config = null;
  // Root is ONE level up from maria-pairing-site/
  this.rootDir = path.join(__dirname, '..');
 }
 
 /**
  * Attempt to load config
  * Strategy order: Compiled JS → Env vars → Defaults
  */
 async load() {
  console.log('[Bridge] Looking for config...');
  
  // Strategy 1: Look for compiled JavaScript version
  const jsPaths = [
   path.join(this.rootDir, 'config.js'), // Root level compiled
   path.join(this.rootDir, 'dist', 'config.js'), // Dist folder
   path.join(this.rootDir, 'lib', 'config.js'), // Lib folder
   path.join(this.rootDir, 'out', 'config.js'), // Tsconfig outDir
  ];
  
  for (const p of jsPaths) {
   if (this.tryLoad(p)) return this.config;
  }
  
  // Strategy 2: Build from environment variables
  this.buildFromEnv();
  return this.config;
 }
 
 tryLoad(filePath) {
  try {
   if (!fs.existsSync(filePath)) return false;
   
   console.log(`[Bridge] Found: ${filePath}`);
   delete require.cache[require.resolve(filePath)];
   
   const mod = require(filePath);
   this.config = mod.default || mod;
   
   console.log('[Bridge] ✅ Loaded successfully!');
   return true;
  } catch (err) {
   console.log(`[Bridge] ⚠️ Failed: ${err.message}`);
   return false;
  }
 }
 
 buildFromEnv() {
  console.log('[Bridge] Building from environment...');
  
  this.config = {
   PREFIX: process.env.PREFIX || '.',
   BOT_NAME: process.env.BOT_NAME || 'MARIA-MM',
   CREATOR: process.env.CREATOR || '256743668990',
   MODE: process.env.MODE || 'public',
   FOOTER: process.env.FOOTER || '©powered by MARKMELLON',
   BOT_IMAGE: process.env.BOT_IMAGE || '',
   OWNER_NUMBERS: this.parseArray(process.env.OWNER_NUMBERS, ['256743668990']),
   AUTOREACT: process.env.AUTOREACT === 'true',
   AUTOVIEW_STATUS: process.env.AUTOVIEW_STATUS === 'true',
   AUTOLIKE_STATUS: process.env.AUTOLIKE_STATUS === 'true',
   ALWAYS_ONLINE: process.env.ALWAYS_ONLINE === 'true',
   ANTIDELETE_MODE: process.env.ANTIDELETE_MODE || 'off'
  };
  
  console.log('[Bridge] ✅ Built from environment');
 }
 
 parseArray(val, def) {
  if (!val) return def;
  try {
   const p = JSON.parse(val);
   return Array.isArray(p) ? p : def;
  } catch (e) {
   return val.includes(',') ? val.split(',').map(s => s.trim()) : [val];
  }
 }
 
 get(key, fallback = null) {
  if (!this.config) return fallback;
  const resolved = this.config.default || this.config;
  return resolved[key.toUpperCase()] || fallback;
 }
 
 getAllPublic() {
  return {
   BOT_NAME: this.get('BOT_NAME', 'MARIA-BOT'),
   PREFIX: this.get('PREFIX', '.'),
   CREATOR: this.get('CREATOR', ''),
   FOOTER: this.get('FOOTER', ''),
   MODE: this.get('MODE', 'public')
  };
 }
}

module.exports = new ConfigBridge();