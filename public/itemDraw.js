// itemDraw.js — Tirage d'un objet de survivant + 2 accessoires compatibles
// Utilisé par index.html (tirage double) et doubleResult.html (nouveau tirage).
(function () {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  window.ItemDraw = {
    // Charge objets.json (dans public/) ; renvoie null si indisponible
    async load() {
      try {
        const r = await fetch('objets.json');
        if (!r.ok) return null;
        const d = await r.json();
        return d && d.survivor_items && d.addons ? d : null;
      } catch (_) { return null; }
    },

    // Tire 1 objet + jusqu'à 2 accessoires DIFFÉRENTS compatibles avec cet objet.
    // Renvoie uniquement des identifiants : { item: 'toolbox', addons: ['accessoire_...', ...] }
    draw(data) {
      const item = pick(data.survivor_items);
      const known = new Set(data.addons.map(a => a.id));
      const pool = (item.addons_supported || []).filter(id => known.has(id));
      return { item: item.id, addons: shuffle(pool).slice(0, 2) };
    },

    // ---- Accessoires de TUEUR : valables uniquement pour le tueur tiré ----
    async loadKillerAddons() {
      try {
        const r = await fetch('addons.json');
        if (!r.ok) return null;
        const d = await r.json();
        return d && d.killers ? d : null;
      } catch (_) { return null; }
    },

    // Cherche le tueur par son nom (comme dans data.json) ; null s'il n'a pas encore d'accessoires répertoriés
    findKiller(data, killerName) {
      const n = String(killerName || '').trim();
      const k = data && data.killers && data.killers[n];
      return k && k.addons && k.addons.length ? k : null;
    },

    // Tire 2 accessoires DIFFÉRENTS parmi ceux du tueur : { addons: ['k01_bear_oil', ...] } ({} si indisponible)
    drawKillerAddons(data, killerName) {
      const k = this.findKiller(data, killerName);
      if (!k) return {};
      return { addons: shuffle(k.addons.map(a => a.id)).slice(0, 2) };
    },

    // Retrouve les accessoires complets du tueur depuis les identifiants stockés ; null si invalide
    resolveKillerAddons(data, killerName, ids) {
      const k = this.findKiller(data, killerName);
      if (!k || !Array.isArray(ids) || !ids.length) return null;
      const byId = new Map(k.addons.map(a => [a.id, a]));
      const addons = ids.map(id => byId.get(id)).filter(Boolean);
      return addons.length ? { killer: k, addons } : null;
    },

    // Retrouve les objets complets à partir des identifiants stockés ; null si invalide
    resolve(data, drawn) {
      if (!drawn || !drawn.item) return null;
      const item = data.survivor_items.find(i => i.id === drawn.item);
      if (!item) return null;
      const byId = new Map(data.addons.map(a => [a.id, a]));
      const addons = (drawn.addons || []).map(id => byId.get(id)).filter(Boolean);
      return { item, addons };
    }
  };
})();
