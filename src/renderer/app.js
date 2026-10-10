// ----- Window controls -----
document.getElementById('min').onclick = () => window.proClient.minimize();
document.getElementById('max').onclick = () => window.proClient.maximize();
document.getElementById('close').onclick = () => window.proClient.close();

// ----- Sidebar tab switching -----
document.querySelectorAll('.sidebar button').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  };
});

// ----- PLAY button (real Minecraft launch) -----
document.getElementById('play').onclick = async () => {
  const btn = document.getElementById('play');

  // Create or reuse a status line under the button
  let status = document.getElementById('status');
  if (!status) {
    status = document.createElement('p');
    status.id = 'status';
    status.style.marginTop = '12px';
    status.style.color = '#a0a0b8';
    status.style.fontSize = '14px';
    btn.parentNode.appendChild(status);
  }

  btn.textContent = '⏳ Launching...';
  btn.disabled = true;
  status.textContent = 'Downloading Minecraft (first launch may take several minutes)...';
  status.style.color = '#a0a0b8';

  const result = await window.proClient.launchGame({
    version: '1.21.4',
    username: 'Player'
  });

  btn.textContent = '▶ PLAY';
  btn.disabled = false;

  if (result.ok) {
    status.textContent = '✅ Minecraft is starting...';
    status.style.color = '#4ade80';
  } else {
    status.textContent = '❌ Error: ' + result.error;
    status.style.color = '#ff3b3b';
  }
};

// ----- Mods tab (search) -----
const modsTab = document.getElementById('mods');
if (modsTab) {
  modsTab.innerHTML = `
    <h2>Mods</h2>
    <div style="display:flex;gap:8px;margin:16px 0;">
      <input id="mod-query" placeholder="Search mods..." style="flex:1;padding:8px;border-radius:6px;border:1px solid #22222e;background:#10101a;color:#fff;" />
      <select id="mod-source" style="padding:8px;border-radius:6px;border:1px solid #22222e;background:#10101a;color:#fff;">
        <option value="modrinth">Modrinth</option>
        <option value="curseforge">CurseForge</option>
      </select>
      <button id="mod-search-btn" style="padding:8px 16px;border-radius:6px;border:none;background:#3b7bff;color:#fff;cursor:pointer;">Search</button>
    </div>
    <div id="mod-results"></div>
  `;

  document.getElementById('mod-search-btn').onclick = async () => {
    const query = document.getElementById('mod-query').value.trim();
    const source = document.getElementById('mod-source').value;
    const results = document.getElementById('mod-results');

    if (!query) return;
    results.innerHTML = '<p style="color:#a0a0b8;">Searching...</p>';

    const res = await window.proClient.searchMods({
      query,
      source,
      gameVersion: '1.21.4',
      loader: 'fabric'
    });

    if (!res.ok) {
      results.innerHTML = `<p style="color:#ff3b3b;">Error: ${res.error}</p>`;
      return;
    }
    if (!res.results.length) {
      results.innerHTML = '<p style="color:#a0a0b8;">No results.</p>';
      return;
    }

    results.innerHTML = res.results.map(m => `
      <div style="padding:12px;margin:8px 0;background:#10101a;border-radius:8px;border:1px solid #22222e;">
        <strong>${m.name}</strong>
        <p style="color:#a0a0b8;font-size:13px;margin:4px 0;">${m.description || ''}</p>
        <small style="color:#666;">by ${m.author} • ${(m.downloads || 0).toLocaleString()} downloads</small>
      </div>
    `).join('');
  };
}
