// character-modal.js — Fenêtre d'infos d'un personnage (sans changer de page)
(function () {
  let perksData = null;
  let loreData = null;
  let lastFocus = null;

  async function loadData() {
    if (!perksData) {
      try { perksData = await fetch('perks.json').then(r => r.json()); }
      catch (_) { perksData = { killerPerks: { characters: [] }, survivorPerks: { characters: [] } }; }
    }
    if (!loreData) {
      try { loreData = await fetch('lore.json').then(r => r.json()); }
      catch (_) { loreData = {}; }
    }
  }

  // --- Construction du DOM (une seule fois) ---
  const overlay = document.createElement('div');
  overlay.className = 'cm-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="cm-modal">
      <button class="cm-close" aria-label="Fermer">✕</button>
      <div class="cm-visual"><img alt=""></div>
      <div class="cm-info">
        <h2 class="cm-name"></h2>
        <h3 class="cm-title">Perks</h3>
        <div class="cm-perks"></div>
        <h3 class="cm-title">Histoire</h3>
        <div class="cm-story"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const $ = s => overlay.querySelector(s);
  const imgEl = $('.cm-visual img');

  function close() {
    overlay.classList.remove('open');
    document.body.classList.remove('cm-lock');
    if (lastFocus) lastFocus.focus();
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  $('.cm-close').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  // Détourage en pied si dispo (assets/<Type>/full/<img>), sinon le portrait
  function setVisual(basePath, character) {
    const full = `${basePath}full/${character.img}`;
    const portrait = `${basePath}${character.img}`;
    imgEl.alt = character.name;
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = encodeURI(portrait); };
    imgEl.src = encodeURI(full);
  }

  async function open(character, type, basePath) {
    lastFocus = document.activeElement;
    await loadData();

    overlay.classList.toggle('survivor', type === 'survivor');
    $('.cm-name').textContent = character.name;
    setVisual(basePath, character);

    // Perks
    const list = type === 'killer' ? perksData.killerPerks : perksData.survivorPerks;
    const entry = (list.characters || []).find(c => c.character === character.name);
    const perksBox = $('.cm-perks');
    perksBox.innerHTML = '';
    if (entry && entry.perks.length) {
      entry.perks.forEach(p => {
        const row = document.createElement('div');
        row.className = 'cm-perk';
        const icon = document.createElement('div');
        icon.className = 'cm-perk-icon';
        const im = document.createElement('img');
        im.alt = '';
        im.loading = 'lazy';
        im.onerror = () => im.remove(); // icône absente → on garde juste le nom
        im.src = encodeURI('assets/' + p.img);
        icon.appendChild(im);
        const name = document.createElement('span');
        name.className = 'cm-perk-name';
        name.textContent = p.name;
        row.append(icon, name);
        perksBox.appendChild(row);
      });
    } else {
      perksBox.innerHTML = '<p class="cm-empty">Aucun perk renseigné.</p>';
    }

    // Histoire
    const story = $('.cm-story');
    const text = loreData[character.name];
    story.textContent = text || 'Histoire à venir…';
    story.classList.toggle('empty', !text);
    story.scrollTop = 0;

    overlay.classList.add('open');
    document.body.classList.add('cm-lock');
    $('.cm-close').focus();
  }

  window.CharacterModal = { open, close };
})();
