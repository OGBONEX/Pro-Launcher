const { Client } = require('minecraft-launcher-core');
const path = require('path');
const os = require('os');
const { ensureJava } = require('./java');

const MC_PATH = path.join(os.homedir(), '.proclient');
const launcher = new Client();

async function launchGame(versionId, username = 'Player', customJavaPath = null) {
  const javaPath = customJavaPath || await ensureJava();
  console.log('[Minecraft] Using Java at:', javaPath);

  // Offline account — generates a local UUID from the username
  const auth = {
    access_token: 'offline',
    client_token: 'offline',
    uuid: generateOfflineUUID(username),
    name: username,
    user_properties: '{}'
  };

  const opts = {
    authorization: auth,
    root: MC_PATH,
    version: {
      number: versionId,
      type: 'release'
    },
    memory: {
      max: '2G',
      min: '1G'
    },
    javaPath: javaPath
  };

  launcher.launch(opts);
  // ... event listeners stay the same
}

// Generate a deterministic UUID from a username (like offline accounts do)
function generateOfflineUUID(username) {
  // Simple hash-based UUID generation
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = ((hash << 5) - hash) + username.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hex.slice(0,8)}-${hex.slice(0,4)}-${hex.slice(0,4)}-${hex.slice(0,4)}-${hex.slice(0,8)}0000`;
}

module.exports = { launchGame };
