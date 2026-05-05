// main.js — Liste des personnages + pré-sélection des favoris

fetch('data.json')
  .then(response => response.json())
  .then(async data => {
    const KillerList = data.killers.map(k => ({ ...k, active: true }));
    const SurvivorList = data.survivors.map(s => ({ ...s, active: true }));

    const SurvivorPath = 'assets/Survivor/';
    const KillerPath = 'assets/Killer/';
    const container = document.getElementById('character-container');

    const urlParams = new URLSearchParams(window.location.search);
    const characterType = urlParams.get('type');

    // --- Récupérer les favoris si l'utilisateur est connecté ---
    let favoriteNames = [];
    try {
      const user = await fetch('/api/twitch-user', { credentials: 'include' }).then(r => r.json());
      if (user.connected) {
        const profile = await fetch('/api/profile', { credentials: 'include' }).then(r => r.json());
        if (characterType === 'Killer') favoriteNames = profile.killers || [];
        else if (characterType === 'Survivor') favoriteNames = profile.survivors || [];
      }
    } catch (_) {
      // Pas connecté ou backend inaccessible → on continue sans favoris
    }

    // Si des favoris existent, désactiver tout sauf les favoris
    // Si aucun favori défini → tout actif par défaut (comportement normal)
    function applyFavorites(list) {
      if (favoriteNames.length === 0) return; // pas de favori → tout reste actif
      list.forEach(char => {
        char.active = favoriteNames.includes(char.name);
      });
    }

    if (characterType === 'Killer') applyFavorites(KillerList);
    else if (characterType === 'Survivor') applyFavorites(SurvivorList);

    // --- Toggle actif/inactif ---
    function toggleActive(character) {
      character.active = !character.active;
      const el = document.getElementById(character.name);
      const img = el.querySelector('img');
      if (character.active) {
        el.classList.remove('inactive');
        img.style.opacity = 1;
      } else {
        el.classList.add('inactive');
        img.style.opacity = 0.5;
      }
    }

    // --- Affichage des personnages ---
    function addCharacter(type, characters) {
      characters.forEach(character => {
        const div = document.createElement('div');
        div.className = `character ${character.active ? '' : 'inactive'}`;
        div.id = character.name;
        container.appendChild(div);

        const imgCharacter = document.createElement('img');
        imgCharacter.src = `${type === 1 ? KillerPath : SurvivorPath}${character.img}`;
        imgCharacter.className = 'img-characterlist';
        imgCharacter.style.opacity = character.active ? 1 : 0.5;

        imgCharacter.addEventListener('click', () => toggleActive(character));
        div.appendChild(imgCharacter);

        const name = document.createElement('p');
        name.className = 'name-character';
        name.textContent = character.name;
        div.appendChild(name);
      });
    }

    if (characterType === 'Killer') addCharacter(1, KillerList);
    else if (characterType === 'Survivor') addCharacter(0, SurvivorList);

    // --- Bouton tirage ---
    const rouletteDrawButton = document.querySelector('.roulette-draw');
    rouletteDrawButton.addEventListener('click', () => {
      const activeCharacters = getActiveCharacters();
      if (activeCharacters.length === 0) {
        alert('Sélectionne au moins un personnage !');
        return;
      }
      localStorage.setItem('activeCharacters', JSON.stringify(activeCharacters));
      window.location.href = 'roulette.html';
    });

    function getActiveCharacters() {
      const characters = document.querySelectorAll('.character');
      const active = [];
      characters.forEach(character => {
        if (!character.classList.contains('inactive')) {
          active.push({
            name: character.id,
            img: character.querySelector('img').src
          });
        }
      });
      return active;
    }
  });