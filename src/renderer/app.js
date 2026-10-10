// ============================================================
// WINDOW CONTROLS
// ============================================================
document.getElementById('min').onclick = () => window.proClient.minimize();
document.getElementById('max').onclick = () => window.proClient.maximize();
document.getElementById('close').onclick = () => window.proClient.close();

// ============================================================
// TAB SWITCHING
// ============================================================
document.querySelectorAll('.rail-btn[data-tab]').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.rail-btn[data-tab]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.remove('hidden');

    if (btn.dataset.tab === 'library') loadInstances();
  };
});

// ============================================================
// VERSION LOADING
// ============================================================
async function loadVersions() {
  const versionSelect = document.getElementById('version-select');
  versionSelect.innerHTML = '<option value="">Loading versions...</option>';

  const res = await window.proClient.getVersions();

  if (!res.ok) {
    versionSelect.innerHTML = '<option value="1.21.4">1.21.4 (fallback)</option>';
    console.error('Failed to load versions:', res.error);
    return;
  }

  const releases = res.versions.filter(v => v.type === 'release').slice(0, 15);
  const latestSnapshot = res.versions.find(v => v.type === 'snapshot');

  let html = '';
  if (latestSnapshot) {
    html += `<optgroup label="Latest Snapshot">`;
    html += `<option value="${latestSnapshot.id}">🧪 ${latestSnapshot.id}</option>`;
    html += `</optgroup>`;
  }
  html += `<optgroup label="Releases">`;
  for (const v of releases) {
    html += `<option value="${v.id}">${v.id}</option>`;
  }
  html += `</optgroup>`;

  versionSelect.innerHTML = html;
  document.getElementById('home-version').textContent = releases[0]?.id || '1.21.4';
}

document.getElementById('version-select').onchange = (e) => {
  document.getElementById('home-version').textContent = e.target.value;
};

loadVersions();

// ============================================================
// PLAY BUTTON
// ============================================================
document.getElementById('play').onclick = async () => {
  const btn = document.getElementById('play');
  const status = document.getElementById('status');
  const version = document.getElementById('version-select').value;

  if (!version) {
    status.textContent = '❌ No version selected.';
    status.className = 'text-brand text-sm mb-6';
    return;
  }

  const accountsData = await window.proClient.listAccounts();
  const active = accountsData.accounts.find(a => a.uuid === accountsData.active);

  if (!active) {
    status.textContent = '❌ No account selected. Click the account button to add one.';
    status.className = 'text-brand text-sm mb-6';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Launching...';
  status.textContent = `Preparing Minecraft ${version} for ${active.username}...`;
  status.className = 'text-text-lo text-sm mb-6';

  const result = await window.proClient.launchGame({
    version,
    username: active.username
  });

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

// ============================================================
// LIBRARY / INSTANCES
// ============================================================
const newInstanceModal = document.getElementById('new-instance-modal');

async function loadInstances() {
  const grid = document.getElementById('library-grid');
  const res = await window.proClient.listInstances();

  if (!res.ok || !res.instances.length) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-20">
        <div class="text-5xl mb-4">📚</div>
        <p class="text-text-lo text-sm">No instances yet</p>
        <p class="text-text-dim text-xs mt-2">Click "New Instance" to create one</p>
      </div>`;
    return;
  }

  const loaderBadges = {
    vanilla:  '<span class="px-2 py-0.5 rounded bg-bg-raised text-text-dim text-[10px] font-bold">VANILLA</span>',
    fabric:   '<span class="px-2 py-0.5 rounded bg-accent/20 text-accent text-[10px] font-bold">FABRIC</span>',
    quilt:    '<span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold">QUILT</span>',
    forge:    '<span class="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-bold">FORGE</span>',
    neoforge: '<span class="px-2 py-0.5 rounded bg-pink-500/20 text-pink-
