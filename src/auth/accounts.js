const fs = require('fs');
const path = require('path');
const os = require('os');

const ACCOUNTS_FILE = path.join(os.homedir(), '.proclient', 'accounts.json');

function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load accounts:', e);
  }
  return { accounts: [], active: null };
}

function saveAccounts(data) {
  const dir = path.dirname(ACCOUNTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(data, null, 2));
}

function addOfflineAccount(username) {
  const data = loadAccounts();
  const account = {
    type: 'offline',
    username,
    uuid: generateOfflineUUID(username),
    addedAt: Date.now()
  };
  data.accounts.push(account);
  data.active = account.uuid;
  saveAccounts(data);
  return account;
}

function addMicrosoftAccount(tokenData) {
  const data = loadAccounts();
  const account = {
    type: 'microsoft',
    username: tokenData.username,
    uuid: tokenData.uuid,
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    addedAt: Date.now()
  };
  // Remove existing MS account with same UUID
  data.accounts = data.accounts.filter(a => a.uuid !== account.uuid);
  data.accounts.push(account);
  data.active = account.uuid;
  saveAccounts(data);
  return account;
}

function setActiveAccount(uuid) {
  const data = loadAccounts();
  data.active = uuid;
  saveAccounts(data);
}

// Deterministic UUID for offline accounts (matches Minecraft's method)
function generateOfflineUUID(username) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + username).digest();
  hash[6] = (hash[6] & 0x0f) | 0x30; // version 3
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant
  const hex = hash.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

module.exports = { loadAccounts, addOfflineAccount, addMicrosoftAccount, setActiveAccount };
