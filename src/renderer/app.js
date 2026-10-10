// ----- Window controls -----
document.getElementById('min').onclick = () => window.proClient.minimize();
document.getElementById('max').onclick = () => window.proClient.maximize();
document.getElementById('close').onclick = () => window.proClient.close();

// ----- Sidebar tab switching -----
document.querySelectorAll('.sidebar-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.remove('hidden');
  };
});

// ----- PLAY button -----
document.getElementById('play').onclick = async () => {
  const btn = document.getElementById('play');
  const status = document.getElementById('status');
  const versionSelect = document.getElementById('version-select');
  const version = versionSelect ? versionSelect.value : '1.21.4';

  btn.disabled = true;
  btn.textContent = '⏳ Launching...';
  status.textContent = 'Downloading Minecraft (first launch may take several minutes)...';

  const result = await window.proClient.launchGame({
    version,
    username: 'Player'
  });

  btn.disabled = false;
  btn.textContent = '▶ PLAY';

  if (result.ok) {
    status.textContent = '✅ Minecraft is starting...';
  } else {
    status.textContent = '❌ Error: ' + result.error;
  }
};

// ----- Mods tab -----
const modsTab = document.getElementById('mods');
if (modsTab) {
  modsTab.innerHTML = `
    <div class="flex h-full">
      <aside class="w-64 bg-surface-2 p-4 border-r border-surface-4">
        <h3 class="font-bold mb-4">Filters</h3>
        <label class="text-sm text-text-secondary">Source</label>
        <select id="mod-source" class="w-full mt-1 p-2 bg-surface-3 rounded-lg border border-surface-4 text-text-primary focus:border-brand outline-none">
          <option value="proclient">Pro Client Library</option>
          <option value="community">Community Mods</option>
        </select>
      </aside>
      <div class="flex-1 p-6 overflow-y-auto">
        <div class="flex gap-2 mb-6">
          <input id="mod-query" placeholder="Search mods..." class="flex-1 p-3 bg-surface-3 rounded-lg border border-surface-4 text-text-primary focus:border-brand outline-none" />
          <button id="mod-search-btn" class="px-6 py-3 bg-brand rounded-lg font-semibold text-white hover:bg-brand-dark transition">Search</button>
        </div>
        <div id="mod-results" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
      </div>
    </div>
  `;

  document.getElementById('mod-search-btn').onclick = async () => {
    const query = document.getElementById('mod-query').value.trim();
    const sourceSelect = document.getElementById('mod-source').value;
    const results = document.getElementById('mod-results');

    // Map UI labels to backend source keys
    const source = sourceSelect === 'proclient' ? 'modrinth' : 'curseforge';

    if (!query) return;
    results.innerHTML = '<p class="text-text-secondary">Searching...</p>';

    const res = await window.proClient.searchMods({
      query,
      source,
      gameVersion: '1.21.4',
      loader: 'fabric'
    });

    if (!res.ok) {
      results.innerHTML = `<p class="text-brand">Error: ${res.error}</p>`;
      return;
    }
    if (!res.results.length) {
      results.innerHTML = '<p class="text-text-secondary">No results.</p>';
      return;
    }

    results.innerHTML = res.results.map(m => `
      <div class="bg-surface-3 rounded-xl p-4 border border-surface-4 hover:border-brand transition">
        <div class="flex items-start gap-3">
          <div class="w-12 h-12 bg-brand rounded-lg flex items-center justify-center text-xl text-white">🧩</div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold truncate">${m.name}</h4>
            <p class="text-sm text-text-secondary truncate">by ${m.author}</p>
          </div>
        </div>
        <p class="text-sm text-text-secondary mt-3 line-clamp-2">${m.description || 'No description'}</p>
        <div class="flex justify-between items-center mt-4">
          <span class="text-xs text-text-secondary">${(m.downloads || 0).toLocaleString()} downloads</span>
          <button class="px-3 py-1 bg-brand text-white text-xs rounded-md hover:bg-brand-dark transition">Install</button>
        </div>
      </div>
    `).join('');
  };
}
