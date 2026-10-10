const { install, getVersionList } = require('@xmcl/installer');
const { launch, Version } = require('@xmcl/core');
const path = require('path');
const os = require('os');

const MC_PATH = path.join(os.homedir(), '.proclient');

async function getVersions() {
  const list = await getVersionList();
  return list.versions
    .filter(v => v.type === 'release')
    .slice(0, 20)
    .map(v => v.id);
}

async function installVersion(versionId) {
  const list = await getVersionList();
  const target = list.versions.find(v => v.id === versionId);
  if (!target) throw new Error(`Version ${versionId} not found`);
  await install(target, MC_PATH);
}

async function launchGame(versionId, username = 'Player') {
  // Parse the version to ensure it's installed and valid [citation:24]
  const resolved = await Version.parse(MC_PATH, versionId);
  
  // Launch Minecraft as a detached process so it survives launcher closing [citation:24]
  const proc = await launch({
    gamePath: MC_PATH,
    javaPath: 'java', // Assumes Java is in system PATH
    version: resolved,
    username: username,
    uuid: '00000000-0000-0000-0000-000000000000',
    accessToken: 'offline',
    userType: 'legacy', // Offline/legacy account type
    extraJVMArgs: ['-Xmx2G'],
    extraExecOption: { detached: true }
  });
  
  return proc;
}

module.exports = { getVersions, installVersion, launchGame };
