// Modrinth: works at runtime with no API key
// CurseForge: requires CURSEFORGE_API_KEY in env (build-time) or user-supplied

const MODRINTH_BASE = 'https://api.modrinth.com/v2';
const CURSEFORGE_BASE = 'https://api.curseforge.com/v1';
const MINECRAFT_GAME_ID = 432;

const cfKey = process.env.CURSEFORGE_API_KEY || '';

// ---------- Modrinth ----------

async function searchModrinth(query, gameVersion, loader = 'fabric', limit = 20) {
  const facets = JSON.stringify([
    ['project_type:mod'],
    gameVersion ? [`versions:${gameVersion}`] : [],
    loader ? [`categories:${loader}`] : []
  ].filter(f => f.length));

  const url = `${MODRINTH_BASE}/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}&limit=${limit}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ProClient/1.0.2 (github.com/OGBONEX/Pro-Launcher)' }
  });
  if (!res.ok) throw new Error(`Modrinth search failed: ${res.status}`);

  const data = await res.json();
  return data.hits.map(hit => ({
    id: hit.project_id,
    name: hit.title,
    description: hit.description,
    author: hit.author,
    downloads: hit.downloads,
    icon: hit.icon_url,
    source: 'modrinth'
  }));
}

async function getModrinthVersions(projectId, gameVersion, loader = 'fabric') {
  const loaders = JSON.stringify([loader]);
  const versions = JSON.stringify([gameVersion]);
  const url = `${MODRINTH_BASE}/project/${projectId}/version?loaders=${encodeURIComponent(loaders)}&game_versions=${encodeURIComponent(versions)}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'ProClient/1.0.2 (github.com/OGBONEX/Pro-Launcher)' }
  });
  if (!res.ok) throw new Error(`Modrinth versions failed: ${res.status}`);
  return await res.json();
}

// ---------- CurseForge ----------

async function searchCurseForge(query, gameVersion, modLoaderType = 4, limit = 20) {
  // modLoaderType: 1=Forge, 4=Fabric, 5=Quilt, 6=NeoForge
  if (!cfKey) {
    console.warn('[CurseForge] No API key — search disabled');
    return [];
  }

  const params = new URLSearchParams({
    gameId: MINECRAFT_GAME_ID,
    searchFilter: query,
    gameVersion: gameVersion || '',
    modLoaderType: modLoaderType,
    pageSize: limit
  });

  const res = await fetch(`${CURSEFORGE_BASE}/mods/search?${params}`, {
    headers: {
      'x-api-key': cfKey,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`CurseForge search failed: ${res.status}`);

  const data = await res.json();
  return data.data.map(mod => ({
    id: mod.id,
    name: mod.name,
    description: mod.summary,
    author: mod.authors?.[0]?.name || 'Unknown',
    downloads: mod.downloadCount,
    icon: mod.logo?.thumbnailUrl || null,
    source: 'curseforge'
  }));
}

async function getCurseForgeFiles(modId, gameVersion, modLoaderType = 4) {
  if (!cfKey) return [];

  const params = new URLSearchParams({
    gameVersion: gameVersion || '',
    modLoaderType: modLoaderType
  });

  const res = await fetch(`${CURSEFORGE_BASE}/mods/${modId}/files?${params}`, {
    headers: {
      'x-api-key': cfKey,
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`CurseForge files failed: ${res.status}`);

  const data = await res.json();
  return data.data;
}

module.exports = {
  searchModrinth,
  getModrinthVersions,
  searchCurseForge,
  getCurseForgeFiles
};
