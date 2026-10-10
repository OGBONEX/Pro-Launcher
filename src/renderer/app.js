// ----- Window controls -----
document.getElementById('min').onclick = () => window.proClient.minimize();
document.getElementById('max').onclick = () => window.proClient.maximize();
document.getElementById('close').onclick = () => window.proClient.close();

// ----- Rail tab switching -----
document.querySelectorAll('.rail-btn[data-tab]').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.rail-btn[data-tab]').forEach(b => b.classList.remove('active'));
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
  const usernameInput = document.getElementById('username-input');

  const version = versionSelect ? versionSelect.value : '1.21.4';
  const username = usernameInput ? usernameInput.value.trim() || 'Player' : 'Player';

  btn.disabled = true;
  btn.textContent = '⏳ Launching...';
  status.textContent = `Preparing Minecraft ${version} for ${username}...`;

  const result = await window.proClient.launchGame({ version, username });

  btn.disabled = false;
  btn.textContent = '▶ PLAY';

  if (result.ok) {
    status.textContent = '✅ Minecraft is starting...';
    status.className = 'text-green-400 text-sm mb-6';
  } else {
    status.textContent = '❌ Error: ' + result.error;
    status.className = 'text-brand text-sm mb-6';
  }
};

// ----- Mods tab -----
const modsTab = document.getElementById('mods');
if (modsTab) {
  modsTab.innerHTML = `
    <div class="flex h-full">
      <aside class="w-60 bg-bg-panel/50 p-4 border-r border-border-dim">
        <h3 class="font-bold mb-4 text-sm uppercase tracking-widest text-text-dim">Filters</h3>
        <label class="text-xs text-text-lo">Source</label>
        <select id="mod-source" class="w-full mt-1 p-2 bg-bg-raised/80 rounded-lg border border-border-dim text-text-hi focus:border-brand outline-none text-sm">
          <option value="proclient">Pro Client Library</option>
          <option value="community">Community Mods</option>
        </select>
      </aside>
      <div class="flex-1 p-6 overflow-y-auto">
        <div class="flex gap-2 mb-6">
          <input id="mod-query" placeholder="Search mods..." class="flex-1 p-3 bg-bg-raised/80 rounded-xl border border-border-dim text-text-hi focus:border-brand outline-none text-sm" />
          <button id="mod-search-btn" class="px-6 py-3 bg-brand rounded-xl font-semibold text-white hover:bg-brand-hi transition text-sm">Search</button>
        </div>
        <div id="mod-results" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"></div>
      </div>
    </div>
  `;

  document.getElementById('mod-search-btn').onclick = async () => {
    const query = document.getElementById('mod-query').value.trim();
    const sourceSelect = document.getElementById('mod-source').value;
    const results = document.getElementById('mod-results');
    const source = sourceSelect === 'proclient' ? 'modrinth' : 'curseforge';

    if (!query) return;
    results.innerHTML = '<p class="text-text-lo text-sm">Searching...</p>';

    const res = await window.proClient.searchMods({
      query, source, gameVersion: '1.21.4', loader: 'fabric'
    });

    if (!res.ok) {
      results.innerHTML = `<p class="text-brand text-sm">Error: ${res.error}</p>`;
      return;
    }
    if (!res.results.length) {
      results.innerHTML = '<p class="text-text-lo text-sm">No results.</p>';
      return;
    }

    results.innerHTML = res.results.map(m => `
      <div class="glass rounded-xl p-4 hover:border-brand/40 transition">
        <div class="flex items-start gap-3">
          <div class="w-11 h-11 bg-gradient-to-br from-brand to-brand-hi rounded-lg flex items-center justify-center text-xl">🧩</div>
          <div class="flex-1 min-w-0">
            <h4 class="font-bold text-sm truncate">${m.name}</h4>
            <p class="text-xs text-text-lo truncate">by ${m.author}</p>
          </div>
        </div>
        <p class="text-xs text-text-lo mt-3 line-clamp-2">${m.description || 'No description'}</p>
        <div class="flex justify-between items-center mt-4">
          <span class="text-[10px] text-text-dim">${(m.downloads || 0).toLocaleString()} downloads</span>
          <button class="px-3 py-1 bg-brand text-white text-xs rounded-md hover:bg-brand-hi transition font-semibold">Install</button>
        </div>
      </div>
    `).join('');
  };
}
