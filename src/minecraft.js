const { Client, Authenticator } = require('minecraft-launcher-core');
const path = require('path');
const os = require('os');

const MC_PATH = path.join(os.homedir(), '.proclient');
const launcher = new Client();

async function launchGame(versionId, username = 'Player') {
  // Offline auth — for real servers, replace with Microsoft auth
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
    }
  };

  launcher.launch(opts);

  // Forward launcher events to console so we can see what's happening
  launcher.on('debug', (e) => console.log('[MC Debug]', e));
  launcher.on('data', (e) => console.log('[MC Data]', e));
  launcher.on('progress', (e) => console.log('[MC Progress]', e));
  launcher.on('error', (e) => console.error('[MC Error]', e));
  launcher.on('close', (code) => console.log('[MC Closed]', code));

  return { started: true };
}

module.exports = { launchGame };
