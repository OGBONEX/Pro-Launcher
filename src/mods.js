const MODRINTH_BASE = 'https://api.modrinth.com/v2';
const USER_AGENT = 'ProClient/1.1.1 (github.com/OGBONEX/Pro-Launcher)';

const PROJECT_TYPE_MAP = {
  modpack: 'modpack',
  mod: 'mod',
  resourcepack: 'resourcepack',
  datapack: 'datapack'
};

async function searchModrinthContent(query, contentType, gameVersion, loader) {
  const facets = JSON.stringify([
    [`project_type:${PROJECT_TYPE_MAP[contentType] || 'mod'}`],
    gameVersion ? [`versions:${gameVersion}`] : [],
    loader ? [`categories:${loader}`] : []
  ].filter(f => f.length));

  const url = `${MODRINTH_BASE}/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}&limit=20`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Modrinth search failed: ${res.status}`);

  const data = await res.json();
  return data.hits.map(hit => ({
    id: hit.project_id,
    name: hit.title,
    description: hit.description,
    author: hit.author,
    downloads: hit.downloads,
    icon: hit.icon_url,
    type: contentType,
    source: 'modrinth'
  }));
}

module.exports = { searchModrinthContent };
