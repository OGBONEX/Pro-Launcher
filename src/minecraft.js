const { Client } = require('minecraft-launcher-core');
const path = require('path');
const os = require('os');
const { ensureJava } = require('./java');

const MC_PATH = path.join(os.homedir(), '.proclient');
const launcher = new Client();

async function launchGame(versionId, username = 'Player', customJavaPath = null) {
  // Use custom Java if provided, else auto-download one
  const javaPath = customJavaPath || await ensureJava();
  console.log('[Minecraft] Using Java at:', javaPath);

  const auth = {
    access_token: 'offline',
    client_token: 'offline',
    uuid: '00000000-0000-0000-0000-000000000000',
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

  launcher.on('debug', (e) => console.log('[MC Debug]', e));
  launcher.on('data', (e) => console.log('[MC Data]', e));
  launcher.on('progress', (e) => console.log('[MC Progress]', e));
  launcher.on('error', (e) => console.error('[MC Error]', e));
  launcher.on('close', (code) => console.log('[MC Closed]', code));

  return { started: true };
}

module.exports = { launchGame };
