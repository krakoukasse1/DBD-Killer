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
// Remplacer toute la fonction buildHistory() dans profile.js

function buildHistory(history) {
  const container = document.querySelector('.history-scroll');
  if (!container) return;

  container.innerHTML = `
    <div class="history-tabs">
      <button class="htab active" data-mode="all">Tous</button>
      <button class="htab" data-mode="character">🎭 Personnages</button>
      <button class="htab" data-mode="perks">⚙️ Perks</button>
      <button class="htab" data-mode="double">🎲 Double</button>
    </div>
    <div id="historyCards"></div>
  `;

  // On récupère la liste globale pour corriger les chemins d'images à la volée si besoin
  fetch('data.json')
    .then(r => r.json())
    .then(data => {
      const globalImgIndex = {};
      // On associe le NOM du perso à sa vraie image et son type
      data.killers.forEach(c => { globalImgIndex[c.name] = { img: c.img, type: 'Killer' }; });
      data.survivors.forEach(c => { globalImgIndex[c.name] = { img: c.img, type: 'Survivor' }; });

      function getCorrectImgSrc(item) {
        if (!item.name) return '';
        // Si la DB a déjà stocké un nom de fichier propre (ex: Marchande.png)
        if (item.img && item.img.set && (item.img.includes('.png') || item.img.includes('.jpg')) && !item.img.includes(item.name)) {
          let cleanImg = item.img.split('/').pop();
          let type = item.characterType === 'Killer' || item.characterType === 'killer' ? 'Killer' : 'Survivor';
          return `assets/${type}/${cleanImg}`;
        }
        // Sinon, on cherche dans le dictionnaire data.json via le nom du personnage
        const match = globalImgIndex[item.name];
        if (match) {
          return `assets/${match.type}/${match.img}`;
        }
        return '';
      }

      function renderCards(mode) {
        const wrap = document.getElementById('historyCards');
        const filtered = mode === 'all' ? history : history.filter(h => h.drawMode === mode);

        if (!filtered.length) {
          wrap.innerHTML = '<p class="history-empty-msg">Aucun tirage dans cette catégorie</p>';
          return;
        }

        wrap.innerHTML = '';
        filtered.forEach(item => {
          const m = item.drawMode || 'character';
          const card = document.createElement('div');
          card.className = 'hcard';

          // Nettoyage de l'affichage du type
          let displayType = item.characterType ? item.characterType.charAt(0).toUpperCase() + item.characterType.slice(1).toLowerCase() : '?';

          if (m === 'character') {
            const imgSrc = getCorrectImgSrc(item);
            card.innerHTML = `
              <div class="hcard-left">
                ${imgSrc ? `<img class="hcard-char-img" src="${imgSrc}" onerror="this.style.display='none'">` : '<span class="hcard-char-fallback">🎭</span>'}
                <div>
                  <span class="hcard-mode">🎭 ${displayType}</span>
                  <span class="hcard-name">${item.name}</span>
                  <span class="hcard-date">${item.date}</span>
                </div>
              </div>`;

          } else if (m === 'perks') {
            const perksHTML = (item.perks || []).map(p => {
              const img = typeof p === 'object' && p.img
                ? `<img src="assets/${p.img}" onerror="this.style.display='none'">`
                : `<span class="hcard-perk-fallback">⚙️</span>`;
              const name = typeof p === 'object' ? p.name : p;
              return `<div class="hcard-perk-item">${img}<span>${name}</span></div>`;
            }).join('');
            
            card.innerHTML = `
              <div class="hcard-top">
                <span class="hcard-mode">⚙️ Perks ${displayType}</span>
                <span class="hcard-date">${item.date}</span>
              </div>
              <div class="hcard-perks-row">${perksHTML}</div>`;

          } else if (m === 'double') {
            const imgSrc = getCorrectImgSrc(item);
            const perksHTML = (item.perks || []).map(p => {
              const img = typeof p === 'object' && p.img
                ? `<img src="assets/${p.img}" onerror="this.style.display='none'">`
                : `<span class="hcard-perk-fallback">⚙️</span>`;
              const name = typeof p === 'object' ? p.name : p;
              return `<div class="hcard-perk-item">${img}<span>${name}</span></div>`;
            }).join('');
            
            card.innerHTML = `
              <div class="hcard-left" style="margin-bottom:10px">
                ${imgSrc ? `<img class="hcard-char-img" src="${imgSrc}" onerror="this.style.display='none'">` : '<span class="hcard-char-fallback">🎲</span>'}
                <div>
                  <span class="hcard-mode">🎲 Double ${displayType}</span>
                  <span class="hcard-name">${item.name}</span>
                  <span class="hcard-date">${item.date}</span>
                </div>
              </div>
              <div class="hcard-perks-row">${perksHTML}</div>`;
          }

          wrap.appendChild(card);
        });
      }

      renderCards('all');

      container.querySelectorAll('.htab').forEach(tab => {
        tab.addEventListener('click', () => {
          container.querySelectorAll('.htab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          renderCards(tab.dataset.mode);
        });
      });
    })
    .catch(err => console.error("Erreur lors du rendu de l'historique:", err));
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

// --- Suppression du compte ---
document.getElementById('deleteBtn').addEventListener('click', async () => {
  const confirmed = confirm(
    'Supprimer toutes vos données ? Cette action est irréversible.'
  );
  if (!confirmed) return;

  const resp = await fetch('/api/delete-account', {
    method: 'DELETE',
    credentials: 'include'
  });

  if (resp.ok) {
    alert('Vos données ont été supprimées. Vous allez être redirigé.');
    window.location.href = '/';
  } else {
    alert('Une erreur est survenue. Réessayez.');
  }
});

init();