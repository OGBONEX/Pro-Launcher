const { fabric, quilt, forge, neoforge, vanilla } = require('tomate-loaders');

const LOADERS = { fabric, quilt, forge, neoforge, vanilla };

/**
 * Install a mod loader for a given Minecraft version into an instance path.
 * tomate-loaders handles downloading the loader profile + installer automatically.
 */
async function installLoader(loaderId, gameVersion, instancePath) {
  const loader = LOADERS[loaderId];
  if (!loader) throw new Error(`Unknown loader: ${loaderId}`);

  console.log(`[Loader] Installing ${loaderId} for MC ${gameVersion}...`);

  // For vanilla, nothing to install
  if (loaderId === 'vanilla') {
    return { ok: true, loader: 'vanilla' };
  }

  try {
    // getMCLCLaunchConfig downloads the loader profile and returns the config
    // We don't need the config yet — just calling it triggers the download
    await loader.getMCLCLaunchConfig({
      gameVersion,
      rootPath: instancePath
    });
    console.log(`[Loader] ${loaderId} installed successfully`);
    return { ok: true, loader: loaderId };
  } catch (err) {
    console.error(`[Loader] Failed to install ${loaderId}:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Build MCLC launch options using the loader's config.
 */
async function getLoaderLaunchConfig(loaderId, gameVersion, instancePath) {
  const loader = LOADERS[loaderId] || vanilla;
  return await loader.getMCLCLaunchConfig({
    gameVersion,
    rootPath: instancePath
  });
}

module.exports = { installLoader, getLoaderLaunchConfig, LOADERS };
