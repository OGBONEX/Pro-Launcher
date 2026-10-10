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
  };
});

// ============================================================
// PLAY BUTTON
// ============================================================
document.getElementById('play').onclick = async () => {
  const btn = document.getElementById('play');
  const status = document.getElementById('status');
  const version = document.getElementById('version-select').value;

  // Get active account
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

// Update home version label
document.getElementById('version-select').onchange = (e) => {
  document.getElementById('home-version').textContent = e.target.value;
};

// ============================================================
// CONTENT HUB
// ============================================================
let currentContentType = 'modpack';

document.querySelectorAll('.content-type-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.content-type-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentContentType = tab.dataset.type;
    document.getElementById('content-results').innerHTML = '';
  };
});

document.getElementById('content-search-btn').onclick = async () => {
  const query = document.getElementById('content-query').value.trim();
  const sourceSelect = document.getElementById('content-source').value;
  const results = document.getElementById('content-results');
  const source = sourceSelect === 'proclient' ? 'modrinth' : 'curseforge';

  if (!query) return;

  results.innerHTML = '<p class="text-text-lo text-sm">Searching...</p>';

  const res = await window.proClient.searchContent({
    query,
    source,
    contentType: currentContentType,
    gameVersion: '1.21.4',
    loader: 'fabric'
  });

  if (!res.ok) {
    results.innerHTML = `<p class="text-brand text-sm">Error: ${res.error}</p>`;
    return;
  }
  if (!res.results || !res.results.length) {
    results.innerHTML = '<p class="text-text-lo text-sm">No results found.</p>';
    return;
  }

  const icons = { modpack: '📦', mod: '🧩', resourcepack: '🎨', datapack: '🗂️' };
  const icon = icons[currentContentType] || '📄';

  results.innerHTML = res.results.map(item => `
    <div class="glass rounded-xl p-4 hover:border-brand/40 transition">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 bg-gradient-to-br from-brand to-brand-hi rounded-lg flex items-center justify-center text-xl">
          ${icon}
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-sm truncate">${item.name}</h4>
          <p class="text-xs text-text-lo truncate">by ${item.author}</p>
        </div>
      </div>
      <p class="text-xs text-text-lo mt-3 line-clamp-2">${item.description || 'No description'}</p>
      <div class="flex justify-between items-center mt-4">
        <span class="text-[10px] text-text-dim">${(item.downloads || 0).toLocaleString()} downloads</span>
        <button class="px-3 py-1 bg-brand text-white text-xs rounded-md hover:bg-brand-hi transition font-semibold">Install</button>
      </div>
    </div>
  `).join('');
};

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

// Initialize
updateRailUsername();
