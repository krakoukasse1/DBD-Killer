// profile.js — logique complète de la page profil

let selectedKillers = [];
let selectedSurvivors = [];
let currentUser = null;

async function init() {
  // 1. Vérif connexion
  const user = await fetch('/api/twitch-user', { credentials: 'include' }).then(r => r.json());

  if (!user.connected) {
    window.location.href = '/';
    return;
  }

  currentUser = user;

  // 2. Afficher avatar + username dans le hero
  document.getElementById('avatar').src = user.avatar;
  document.getElementById('username-display').textContent = user.display_name;

  // 3. Charger les persos + le profil sauvegardé en parallèle
  const [data, profile] = await Promise.all([
    fetch('data.json').then(r => r.json()),
    fetch('/api/profile', { credentials: 'include' }).then(r => r.json())
  ]);

  // 4. Initialiser les sélections depuis le profil sauvegardé
  selectedKillers = profile.killers || [];
  selectedSurvivors = profile.survivors || [];

  // 5. Afficher les listes de persos avec la sélection
  buildCharGrid('killer-list', data.killers, 'Killer', selectedKillers, 'killer-count');
  buildCharGrid('survivor-list', data.survivors, 'Survivor', selectedSurvivors, 'survivor-count');

  // 6. Paramètres
  document.getElementById('streamerMode').checked = profile.streamerMode || false;
  document.getElementById('anonymousMode').checked = profile.anonymousMode || false;

  // 7. Historique
  buildHistory(profile.history || []);
}

// --- Construction de la grille de personnages ---
function buildCharGrid(containerId, characters, type, selectedList, countId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  updateCount(countId, selectedList.length);

  characters.forEach(char => {
    const wrap = document.createElement('div');
    wrap.className = 'char-item';
    if (selectedList.includes(char.name)) wrap.classList.add('selected');

    const img = document.createElement('img');
    img.src = `assets/${type}/${char.img}`;
    img.alt = char.name;
    img.loading = 'lazy';

    const label = document.createElement('span');
    label.className = 'char-name';
    label.textContent = char.name;

    wrap.appendChild(img);
    wrap.appendChild(label);
    container.appendChild(wrap);

    wrap.addEventListener('click', () => {
      const isSelected = wrap.classList.toggle('selected');

      if (isSelected) {
        if (!selectedList.includes(char.name)) selectedList.push(char.name);
      } else {
        const idx = selectedList.indexOf(char.name);
        if (idx !== -1) selectedList.splice(idx, 1);
      }

      updateCount(countId, selectedList.length);
    });
  });
}

function updateCount(countId, n) {
  const el = document.getElementById(countId);
  if (el) el.textContent = n;
}

// --- Historique ---
function buildHistory(history) {
  const tbody = document.querySelector('#history tbody');
  tbody.innerHTML = '';

  if (!history.length) {
    tbody.innerHTML = '<tr class="history-empty"><td colspan="3">Aucun tirage pour l\'instant</td></tr>';
    return;
  }

  history.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.date}</td>
      <td>${item.characterType || item.type || "?"}</td>
      <td>${item.name}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Sauvegarde ---
document.getElementById('saveBtn').addEventListener('click', async () => {
  const body = {
    killers: selectedKillers,
    survivors: selectedSurvivors,
    streamerMode: document.getElementById('streamerMode').checked,
    anonymousMode: document.getElementById('anonymousMode').checked
  };

  const resp = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });

  const feedback = document.getElementById('save-feedback');
  if (resp.ok) {
    feedback.textContent = '✓ Profil sauvegardé !';
    feedback.style.color = '#00ff88';
  } else {
    feedback.textContent = '✗ Erreur lors de la sauvegarde';
    feedback.style.color = '#ff4444';
  }
  feedback.classList.add('visible');
  setTimeout(() => feedback.classList.remove('visible'), 3000);
});

init();