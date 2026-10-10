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
    if (btn.dataset.tab === 'settings') loadSettingsUI();
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
    neoforge: '<span class="px-2 py-0.5 rounded bg-pink-500/20 text-pink-400 text-[10px] font-bold">NEOFORGE</span>'
  };

  grid.innerHTML = res.instances.map(inst => `
    <div class="glass rounded-xl overflow-hidden hover:border-brand/40 transition">
      <div class="h-24 bg-gradient-to-br from-brand/20 to-accent/20 flex items-center justify-center text-4xl">
        ${inst.loader === 'fabric' ? '🧵' : inst.loader === 'forge' ? '🔨' : inst.loader === 'quilt' ? '🪡' : inst.loader === 'neoforge' ? '⚡' : '🌍'}
      </div>
      <div class="p-4">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-bold text-sm truncate">${inst.name}</h4>
          ${loaderBadges[inst.loader] || loaderBadges.vanilla}
        </div>
        <p class="text-xs text-text-lo mb-4">${inst.version}</p>
        <div class="flex gap-2">
          <button class="play-instance-btn flex-1 px-3 py-1.5 bg-brand hover:bg-brand-hi text-white text-xs rounded-md font-semibold transition"
                  data-folder="${inst.folder}"
                  data-version="${inst.version}"
                  data-name="${inst.name}">
            ▶ Play
          </button>
          <button class="delete-instance-btn px-3 py-1.5 bg-bg-raised hover:bg-brand/20 text-text-lo hover:text-brand text-xs rounded-md transition"
                  data-folder="${inst.folder}"
                  title="Delete">
            🗑
          </button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.play-instance-btn').forEach(btn => {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = '⏳';

      const accountsData = await window.proClient.listAccounts();
      const active = accountsData.accounts.find(a => a.uuid === accountsData.active);

      if (!active) {
        alert('No account selected. Add an account first.');
        btn.disabled = false;
        btn.textContent = '▶ Play';
        return;
      }

      // Switch to Home tab
      document.querySelectorAll('.rail-btn[data-tab]').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
      document.querySelector('.rail-btn[data-tab="home"]').classList.add('active');
      document.getElementById('home').classList.remove('hidden');

      document.getElementById('version-select').value = btn.dataset.version;
      document.getElementById('home-version').textContent = btn.dataset.version;

      // Launch directly with the instance folder
      const status = document.getElementById('status');
      status.textContent = `Preparing Minecraft ${btn.dataset.version}...`;
      status.className = 'text-text-lo text-sm mb-6';

      const result = await window.proClient.launchGame({
        version: btn.dataset.version,
        username: active.username,
        instanceFolder: btn.dataset.folder
      });

      if (result.ok) {
        status.textContent = '✅ Minecraft is starting...';
        status.className = 'text-green-400 text-sm mb-6';
      } else {
        status.textContent = '❌ Error: ' + result.error;
        status.className = 'text-brand text-sm mb-6';
      }

      btn.disabled = false;
      btn.textContent = '▶ Play';
    };
  });

  grid.querySelectorAll('.delete-instance-btn').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this instance? This cannot be undone.')) return;
      await window.proClient.deleteInstance(btn.dataset.folder);
      loadInstances();
    };
  });
}

// New Instance modal handlers
document.getElementById('new-instance-btn').onclick = async () => {
  newInstanceModal.classList.remove('hidden');

  const versionSelect = document.getElementById('new-instance-version');
  versionSelect.innerHTML = '<option value="">Loading...</option>';

  const res = await window.proClient.getVersions();
  if (res.ok) {
    const releases = res.versions.filter(v => v.type === 'release').slice(0, 15);
    versionSelect.innerHTML = releases.map(v => `<option value="${v.id}">${v.id}</option>`).join('');
  } else {
    versionSelect.innerHTML = '<option value="1.21.4">1.21.4</option>';
  }
};

document.getElementById('close-new-instance').onclick = () => newInstanceModal.classList.add('hidden');
newInstanceModal.onclick = (e) => {
  if (e.target === newInstanceModal) newInstanceModal.classList.add('hidden');
};

document.getElementById('create-instance-btn').onclick = async () => {
  const name = document.getElementById('new-instance-name').value.trim();
  const version = document.getElementById('new-instance-version').value;
  const loader = document.getElementById('new-instance-loader').value;

  if (!name) { alert('Please enter a name.'); return; }
  if (!version) { alert('Please pick a version.'); return; }

  const createBtn = document.getElementById('create-instance-btn');
  createBtn.disabled = true;
  createBtn.textContent = 'Creating...';

  const res = await window.proClient.createInstance({ name, version, loader });
  if (!res.ok) {
    alert('Failed to create instance: ' + res.error);
    createBtn.disabled = false;
    createBtn.textContent = 'Create Instance';
    return;
  }

  if (loader !== 'vanilla') {
    createBtn.textContent = `Installing ${loader}...`;
    const installRes = await window.proClient.installLoader({
      instanceFolder: res.instance.folder,
      loaderId: loader,
      version
    });
    if (!installRes.ok) {
      alert(`Instance created, but ${loader} install failed:\n\n${installRes.error}`);
    }
  }

  createBtn.disabled = false;
  createBtn.textContent = 'Create Instance';
  newInstanceModal.classList.add('hidden');
  document.getElementById('new-instance-name').value = '';
  loadInstances();
};

// ============================================================
// CONTENT HUB
// ============================================================
let currentContentType = 'modpack';
let pendingInstall = null;

document.querySelectorAll('.content-type-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.content-type-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentContentType = tab.dataset.type;
    document.getElementById('content-results').innerHTML = `
      <div class="col-span-full text-center py-20">
        <div class="text-5xl mb-4">🔎</div>
        <p class="text-text-lo text-sm">Search for content to install</p>
        <p class="text-text-dim text-xs mt-2">Powered by Modrinth</p>
      </div>
    `;
    document.getElementById('content-count').textContent = '';
  };
});

document.getElementById('content-search-btn').onclick = doContentSearch;
document.getElementById('content-query').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doContentSearch();
});

async function doContentSearch() {
  const query = document.getElementById('content-query').value.trim();
  const results = document.getElementById('content-results');
  const countEl = document.getElementById('content-count');

  const gameVersion = document.getElementById('content-version').value;
  const loader = document.getElementById('content-loader').value;

  if (!query) return;

  results.innerHTML = '<p class="col-span-full text-text-lo text-sm py-6">Searching...</p>';
  countEl.textContent = '';

  const res = await window.proClient.searchContent({
    query,
    contentType: currentContentType,
    gameVersion,
    loader
  });

  if (!res.ok) {
    results.innerHTML = `<p class="col-span-full text-brand text-sm py-6">Error: ${res.error}</p>`;
    return;
  }
  if (!res.results || !res.results.length) {
    results.innerHTML = `
      <div class="col-span-full text-center py-20">
        <div class="text-5xl mb-4">😕</div>
        <p class="text-text-lo text-sm">No results found</p>
      </div>`;
    return;
  }

  countEl.textContent = `${res.results.length} results`;

  const icons = { modpack: '📦', mod: '🧩', resourcepack: '🎨', datapack: '🗂️' };
  const icon = icons[currentContentType] || '📄';

  results.innerHTML = res.results.map(item => `
    <div class="glass rounded-xl overflow-hidden hover:border-accent/40 transition">
      <div class="h-24 bg-gradient-to-br from-brand/20 to-accent/20 flex items-center justify-center text-4xl">
        ${item.icon ? `<img src="${item.icon}" class="w-16 h-16 rounded-lg object-cover" onerror="this.style.display='none';this.parentNode.textContent='${icon}'"/>` : icon}
      </div>
      <div class="p-4">
        <h4 class="font-bold text-sm truncate">${item.name}</h4>
        <p class="text-xs text-text-lo truncate mb-3">by ${item.author}</p>
        <p class="text-xs text-text-lo line-clamp-2 mb-4 h-8">${item.description || 'No description'}</p>
        <div class="flex justify-between items-center">
          <span class="text-[10px] text-text-dim">⬇ ${(item.downloads || 0).toLocaleString()}</span>
          <button class="install-btn px-4 py-1.5 bg-accent hover:bg-accent-hi text-white text-xs rounded-md font-semibold transition"
                  data-id="${item.id}"
                  data-type="${currentContentType}"
                  data-name="${item.name}"
                  data-author="${item.author}"
                  data-icon="${item.icon || ''}">
            Install
          </button>
        </div>
      </div>
    </div>
  `).join('');

  results.querySelectorAll('.install-btn').forEach(btn => {
    btn.onclick = () => openInstallWizard(btn);
  });
}

// ============================================================
// INSTALL WIZARD
// ============================================================
const installModal = document.getElementById('install-modal');

async function populateInstallInstances() {
  const select = document.getElementById('install-instance');
  const res = await window.proClient.listInstances();

  select.innerHTML = '<option value="">Global mods folder</option>';
  if (res.ok) {
    res.instances.forEach(inst => {
      select.innerHTML += `<option value="${inst.folder}">${inst.name} (${inst.loader.toUpperCase()})</option>`;
    });
  }
}

function openInstallWizard(btn) {
  pendingInstall = {
    projectId: btn.dataset.id,
    contentType: btn.dataset.type,
    name: btn.dataset.name,
    author: btn.dataset.author,
    icon: btn.dataset.icon
  };

  document.getElementById('install-name').textContent = pendingInstall.name;
  document.getElementById('install-author').textContent = 'by ' + pendingInstall.author;

  const iconEl = document.getElementById('install-icon');
  const icons = { modpack: '📦', mod: '🧩', resourcepack: '🎨', datapack: '🗂️' };
  if (pendingInstall.icon) {
    iconEl.innerHTML = `<img src="${pendingInstall.icon}" class="w-full h-full rounded-lg object-cover" />`;
  } else {
    iconEl.textContent = icons[pendingInstall.contentType] || '📄';
  }

  document.getElementById('install-version').value = document.getElementById('content-version').value;
  document.getElementById('install-loader').value = document.getElementById('content-loader').value;

  document.getElementById('install-progress-wrap').classList.add('hidden');
  document.getElementById('install-progress-bar').style.width = '0%';
  document.getElementById('install-percent').textContent = '0%';
  document.getElementById('install-stage').textContent = 'Preparing...';
  document.getElementById('install-stage').className = '';

  populateInstallInstances();
  installModal.classList.remove('hidden');
}

document.getElementById('close-install-modal').onclick = () => installModal.classList.add('hidden');
document.getElementById('cancel-install-btn').onclick = () => installModal.classList.add('hidden');

installModal.onclick = (e) => {
  if (e.target === installModal) installModal.classList.add('hidden');
};

document.getElementById('confirm-install-btn').onclick = async () => {
  if (!pendingInstall) return;

  const gameVersion = document.getElementById('install-version').value;
  const loader = document.getElementById('install-loader').value;
  const instanceFolder = document.getElementById('install-instance').value;

  const confirmBtn = document.getElementById('confirm-install-btn');
  const cancelBtn = document.getElementById('cancel-install-btn');
  const progressWrap = document.getElementById('install-progress-wrap');

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Installing...';
  cancelBtn.disabled = true;
  progressWrap.classList.remove('hidden');

  window.proClient.onInstallProgress((data) => {
    if (data.percent !== undefined) {
      document.getElementById('install-progress-bar').style.width = data.percent + '%';
      document.getElementById('install-percent').textContent = data.percent + '%';
    }
    if (data.stage) {
      const stages = {
        downloading: 'Downloading...',
        extracting: 'Extracting...',
        mods: `Installing mods (${data.current || 0}/${data.total || 0})`
      };
      document.getElementById('install-stage').textContent = stages[data.stage] || data.stage;
    }
  });

  const result = await window.proClient.installContent({
    source: 'modrinth',
    projectId: pendingInstall.projectId,
    contentType: pendingInstall.contentType,
    gameVersion,
    loader,
    instanceFolder: instanceFolder || undefined
  });

  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Install Now';
  cancelBtn.disabled = false;

  if (result.ok) {
    document.getElementById('install-stage').textContent = '✅ Installed successfully!';
    document.getElementById('install-percent').textContent = '100%';
    document.getElementById('install-progress-bar').style.width = '100%';

    setTimeout(() => {
      installModal.classList.add('hidden');
      document.getElementById('install-progress-wrap').classList.add('hidden');
    }, 1500);
  } else {
    document.getElementById('install-stage').textContent = '❌ Error: ' + result.error;
    document.getElementById('install-stage').className = 'text-brand';
  }
};

// ============================================================
// SETTINGS
// ============================================================
async function loadSettingsUI() {
  const s = await window.proClient.getSettings();
  document.getElementById('settings-ram').value = s.ram || 2;
  document.getElementById('settings-ram-value').textContent = (s.ram || 2) + ' GB';
  document.getElementById('settings-java').value = s.javaPath || '';
  document.getElementById('settings-discord').checked = s.discord !== false;
}

document.getElementById('settings-ram').oninput = (e) => {
  document.getElementById('settings-ram-value').textContent = e.target.value + ' GB';
};

document.getElementById('save-settings-btn').onclick = async () => {
  const data = {
    ram: parseInt(document.getElementById('settings-ram').value, 10),
    javaPath: document.getElementById('settings-java').value.trim(),
    discord: document.getElementById('settings-discord').checked
  };
  await window.proClient.setSettings(data);
  const btn = document.getElementById('save-settings-btn');
  btn.textContent = '✅ Saved!';
  setTimeout(() => { btn.textContent = 'Save Settings'; }, 1500);
};

// ============================================================
// SKINS
// ============================================================
import('skinview3d').then((skinview3d) => {
  const canvas = document.getElementById('skin-canvas');
  if (!canvas) return;

  const viewer = new skinview3d.SkinViewer({
    canvas,
    width: 260,
    height: 340
  });
  viewer.animation = new skinview3d.WalkingAnimation();
  viewer.autoRotate = true;

  document.getElementById('skin-search-btn').onclick = async () => {
    const username = document.getElementById('skin-search').value.trim();
    if (!username) return;

    const res = await window.proClient.lookupSkin(username);
    if (res.ok) {
      viewer.loadSkin(res.skinUrl);
    } else {
      alert('Player not found: ' + res.error);
    }
  };

  document.getElementById('skin-upload-btn').onclick = () => {
    const fileInput = document.getElementById('skin-file');
    const file = fileInput.files[0];
    if (!file) { alert('Pick a PNG file first.'); return; }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const username = document.getElementById('rail-username').textContent;
      const res = await window.proClient.uploadSkin({ username, pngBase64: base64 });
      if (res.ok) {
        const url = URL.createObjectURL(file);
        viewer.loadSkin(url);
        alert('Custom skin saved!');
      } else {
        alert('Failed: ' + res.error);
      }
    };
    reader.readAsDataURL(file);
  };
}).catch(err => console.error('skinview3d load failed:', err));

// ============================================================
// ACCOUNT SYSTEM
// ============================================================
const accountModal = document.getElementById('account-modal');
const accountListView = document.getElementById('account-list-view');
const accountTypeView = document.getElementById('account-type-view');
const offlineView = document.getElementById('offline-view');

function showView(view) {
  [accountListView, accountTypeView, offlineView].forEach(v => v.classList.add('hidden'));
  view.classList.remove('hidden');
}

document.getElementById('open-account-modal').onclick = async () => {
  accountModal.classList.remove('hidden');
  await renderAccountList();
  showView(accountListView);
};

document.getElementById('close-account-modal').onclick = () => {
  accountModal.classList.add('hidden');
};

accountModal.onclick = (e) => {
  if (e.target === accountModal) accountModal.classList.add('hidden');
};

document.getElementById('add-account-btn').onclick = () => showView(accountTypeView);
document.getElementById('back-to-list').onclick = () => showView(accountListView);

document.getElementById('add-offline-btn').onclick = () => {
  document.getElementById('offline-username').value = '';
  document.getElementById('offline-error').classList.add('hidden');
  showView(offlineView);
  setTimeout(() => document.getElementById('offline-username').focus(), 50);
};

document.getElementById('back-to-types').onclick = () => showView(accountTypeView);

document.getElementById('add-microsoft-btn').onclick = () => {
  alert('Microsoft login coming soon!');
};

document.getElementById('confirm-offline-btn').onclick = async () => {
  const input = document.getElementById('offline-username');
  const errorEl = document.getElementById('offline-error');
  const username = input.value.trim();

  if (username.length < 3 || username.length > 16) {
    errorEl.textContent = 'Username must be 3-16 characters.';
    errorEl.classList.remove('hidden');
    return;
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errorEl.textContent = 'Only letters, numbers, and underscores.';
    errorEl.classList.remove('hidden');
    return;
  }

  await window.proClient.addOfflineAccount(username);
  await renderAccountList();
  await updateRailUsername();
  showView(accountListView);
};

async function renderAccountList() {
  const data = await window.proClient.listAccounts();
  const list = document.getElementById('account-list');

  if (!data.accounts.length) {
    list.innerHTML = '<p class="text-text-dim text-sm text-center py-4">No accounts yet</p>';
    return;
  }

  list.innerHTML = data.accounts.map(acc => `
    <div class="flex items-center gap-3 p-3 rounded-xl ${acc.uuid === data.active ? 'bg-brand/10 border border-brand/30' : 'bg-bg-raised/50 border border-border-dim'} cursor-pointer hover:border-brand/40 transition" data-uuid="${acc.uuid}">
      <div class="w-9 h-9 rounded-lg bg-brand flex items-center justify-center text-lg">👤</div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-semibold truncate">${acc.username}</div>
        <div class="text-xs text-text-dim">Offline</div>
      </div>
      ${acc.uuid === data.active ? '<span class="text-brand text-[10px] font-bold">ACTIVE</span>' : ''}
    </div>
  `).join('');

  list.querySelectorAll('[data-uuid]').forEach(el => {
    el.onclick = async () => {
      await window.proClient.setActiveAccount(el.dataset.uuid);
      await renderAccountList();
      await updateRailUsername();
    };
  });
}

async function updateRailUsername() {
  const data = await window.proClient.listAccounts();
  const active = data.accounts.find(a => a.uuid === data.active);
  const railUsername = document.getElementById('rail-username');
  if (railUsername) {
    railUsername.textContent = active ? active.username.slice(0, 8) : 'Guest';
  }
}

updateRailUsername();
