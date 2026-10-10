const DiscordRPC = require('discord-rpc');

// Replace with your real Discord App ID from
// https://discord.com/developers/applications
const clientId = '1234567890123456789';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

DiscordRPC.register(clientId);

async function setActivity(version = '1.21.4') {
  if (!rpc) return;
  try {
    await rpc.setActivity({
      details: 'Playing Pro Client',
      state: `Minecraft ${version}`,
      startTimestamp: new Date(),
      largeImageKey: 'pro_client_logo',
      largeImageText: 'Pro Client',
      instance: false
    });
  } catch (e) {
    // Discord not running or assets missing — silently ignore
  }
}

rpc.on('ready', () => {
  console.log('[Discord RPC] Connected');
  setActivity();
  // Discord rate-limits to 1 update per 15 seconds
  setInterval(() => setActivity(), 15000);
});

rpc.login({ clientId }).catch(err => {
  console.warn('[Discord RPC] Not connected:', err.message);
});

module.exports = { setActivity, rpc };
