// ============================================================
// CONTENT HUB 
// ============================================================
let currentContentType = 'modpack';
let pendingInstall = null;

// Type tab switching
document.querySelectorAll('.content-type-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.content-type-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentContentType = tab.dataset.type;
    // Reset results to empty state
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

// Search
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
    <div class="glass rounded-xl overflow-hidden hover:border-brand/40 transition group">
      <div class="h-24 bg-gradient-to-br from-brand/20 to-brand-hi/10 flex items-center justify-center text-4xl">
        ${item.icon ? `<img src="${item.icon}" class="w-16 h-16 rounded-lg object-cover" onerror="this.style.display='none';this.parentNode.textContent='${icon}'"/>` : icon}
      </div>
      <div class="p-4">
        <h4 class="font-bold text-sm truncate">${item.name}</h4>
        <p class="text-xs text-text-lo truncate mb-3">by ${item.author}</p>
        <p class="text-xs text-text-lo line-clamp-2 mb-4 h-8">${item.description || 'No description'}</p>
        <div class="flex justify-between items-center">
          <span class="text-[10px] text-text-dim">⬇ ${(item.downloads || 0).toLocaleString()}</span>
          <button class="install-btn px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded-md font-semibold transition"
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

function openInstallWizard(btn) {
  pendingInstall = {
    projectId: btn.dataset.id,
    contentType: btn.dataset.type,
    name: btn.dataset.name,
    author: btn.dataset.author,
    icon: btn.dataset.icon
  };

  // Populate preview
  document.getElementById('install-name').textContent = pendingInstall.name;
  document.getElementById('install-author').textContent = 'by ' + pendingInstall.author;

  const iconEl = document.getElementById('install-icon');
  const icons = { modpack: '📦', mod: '🧩', resourcepack: '🎨', datapack: '🗂️' };
  if (pendingInstall.icon) {
    iconEl.innerHTML = `<img src="${pendingInstall.icon}" class="w-full h-full rounded-lg object-cover" />`;
  } else {
    iconEl.textContent = icons[pendingInstall.contentType] || '📄';
  }

  // Default version/loader to what user selected in filter
  document.getElementById('install-version').value = document.getElementById('content-version').value;
  document.getElementById('install-loader').value = document.getElementById('content-loader').value;

  // Reset progress
  document.getElementById('install-progress-wrap').classList.add('hidden');
  document.getElementById('install-progress-bar').style.width = '0%';
  document.getElementById('install-percent').textContent = '0%';
  document.getElementById('install-stage').textContent = 'Preparing...';

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

  const confirmBtn = document.getElementById('confirm-install-btn');
  const cancelBtn = document.getElementById('cancel-install-btn');
  const progressWrap = document.getElementById('install-progress-wrap');

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Installing...';
  cancelBtn.disabled = true;
  progressWrap.classList.remove('hidden');

  // Live progress handler (registered once globally)
  const progressHandler = (data) => {
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
  };

  const listener = window.proClient.onInstallProgress(progressHandler);

  const result = await window.proClient.installContent({
    source: 'modrinth',
    projectId: pendingInstall.projectId,
    contentType: pendingInstall.contentType,
    gameVersion,
    loader
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
