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
      <div class="cm-layer cm-bg"></div>
      <div class="cm-layer cm-tint"></div>
      <div class="cm-layer cm-glowfloor"></div>
      <div class="cm-layer cm-fog"></div>
      <div class="cm-layer cm-fog two"></div>
      <div class="cm-layer cm-grain"></div>
      <div class="cm-layer cm-vignette"></div>
      <div class="cm-layer cm-embers"></div>
      <div class="cm-blood"></div>
      <span class="cm-corner tl"></span><span class="cm-corner tr"></span>
      <span class="cm-corner bl"></span><span class="cm-corner br"></span>

      <button class="cm-close" aria-label="Fermer"><span>✕</span></button>

      <div class="cm-visual">
        <div class="cm-watermark"></div>
        <div class="cm-halo"></div>
        <img alt="">
      </div>

      <div class="cm-info">
        <div class="cm-tag"><span></span></div>
        <h2 class="cm-name"></h2>
        <div class="cm-divider"></div>
        <h3 class="cm-title">Perks</h3>
        <div class="cm-perks"></div>
        <h3 class="cm-title">Histoire</h3>
        <div class="cm-story"></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const $ = s => overlay.querySelector(s);
  const imgEl = $('.cm-visual img');

  // Braises / poussières : générées une seule fois
  const embers = $('.cm-embers');
  for (let i = 0; i < 26; i++) {
    const e = document.createElement('span');
    e.className = 'cm-ember';
    const size = 2 + Math.random() * 4;
    e.style.cssText =
      `left:${Math.random() * 100}%;width:${size}px;height:${size}px;` +
      `animation-duration:${7 + Math.random() * 9}s;animation-delay:${-Math.random() * 14}s;` +
      `--dx:${(Math.random() * 120 - 60).toFixed(0)}px;`;
    embers.appendChild(e);
  }

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

    const name = character.name.trim();
    overlay.classList.toggle('survivor', type === 'survivor');
    $('.cm-name').textContent = name;
    $('.cm-tag span').textContent = type === 'killer' ? 'Tueur' : 'Survivant';

    // Grand nom en filigrane (taille adaptée à la longueur)
    const wm = $('.cm-watermark');
    const bigWord = name.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');
    wm.textContent = bigWord;
    wm.style.fontSize = Math.max(64, Math.min(190, 900 / bigWord.length)) + 'px';

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
        const inner = document.createElement('div');
        inner.className = 'inner';
        const im = document.createElement('img');
        im.alt = '';
        im.loading = 'lazy';
        im.onerror = () => im.remove(); // icône absente → on garde le losange + le nom
        im.src = encodeURI('assets/' + p.img);
        inner.appendChild(im);
        icon.appendChild(inner);

        const pname = document.createElement('span');
        pname.className = 'cm-perk-name';
        pname.textContent = p.name;
        row.append(icon, pname);
        perksBox.appendChild(row);
      });
    } else {
      perksBox.innerHTML = '<p class="cm-empty">Aucun perk renseigné.</p>';
    }

    // Histoire
    const story = $('.cm-story');
    const text = loreData[name];
    story.textContent = text || 'Histoire à venir…';
    story.classList.toggle('empty', !text);
    $('.cm-info').scrollTop = 0;

    // Relance les animations d'entrée à chaque ouverture
    overlay.classList.remove('open');
    void overlay.offsetWidth;
    overlay.classList.add('open');
    document.body.classList.add('cm-lock');
    $('.cm-close').focus();
  }

  window.CharacterModal = { open, close };
})();
