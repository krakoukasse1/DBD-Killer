// roulette.js
const BACKEND_URL = "https://dbd-killer-1.onrender.com";

document.addEventListener("DOMContentLoaded", function () {
  const activeCharactersJSON = localStorage.getItem("activeCharacters");
  let activeCharacters = JSON.parse(activeCharactersJSON);
  const urlParams = new URLSearchParams(window.location.search);
  const characterType = urlParams.get("type");

  // --- helper pour extraire translateX courant (px)
  function getTranslateX(el) {
    const st = window.getComputedStyle(el);
    const tr = st.transform || st.webkitTransform;
    if (!tr || tr === "none") return 0;
    // matrix(a, b, c, d, tx, ty)
    const m = tr.match(/^matrix\((.+)\)$/);
    if (m) {
      const vals = m[1].split(",").map(v => parseFloat(v));
      return vals[4] || 0;
    }
    const m3 = tr.match(/^matrix3d\((.+)\)$/);
    if (m3) {
      const vals = m3[1].split(",").map(v => parseFloat(v));
      return vals[12] || 0;
    }
    return 0;
  }

  // --- load characters either from localStorage or data.json
  function loadCharactersAndStart() {
    if (activeCharacters && activeCharacters.length > 0) {
      displayCharacters(activeCharacters, "local");
    } else {
      fetch("data.json")
        .then(r => r.json())
        .then(data => {
          if (characterType === "killer") activeCharacters = data.killers;
          else if (characterType === "survivor") activeCharacters = data.survivors;
          else activeCharacters = data.killers;
          displayCharacters(activeCharacters, characterType);
        })
        .catch(err => {
          console.error("Erreur lecture data.json", err);
          activeCharacters = []; // fallback
        });
    }
  }

  function displayCharacters(characters, type) {
    const rouletteItems = document.getElementById("roulette-items");
    rouletteItems.innerHTML = "";

    // répéter la liste pour donner de la marge au scroll
    for (let repeat = 0; repeat < 3; repeat++) {
      characters.forEach(character => {
        const item = document.createElement("div");
        item.className = "item";
        const img = document.createElement("img");
        if (activeCharactersJSON) img.src = character.img;
        else {
          const imagePath = type === "killer" ? "assets/Killer/" : "assets/Survivor/";
          img.src = `${imagePath}${character.img}`;
        }
        item.appendChild(img);
        rouletteItems.appendChild(item);
      });
    }

    // attendre le chargement de toutes les images, puis init
    const imgs = rouletteItems.querySelectorAll("img");
    let loaded = 0;
    if (imgs.length === 0) {
      // pas d'image -> on peut lancer
      initiateRoulette(characters);
      return;
    }
    imgs.forEach(img => {
      if (img.complete) {
        loaded++;
      } else {
        img.addEventListener("load", () => {
          loaded++;
          if (loaded === imgs.length) initiateRoulette(characters);
        });
        img.addEventListener("error", () => {
          // même si erreur de chargement, on compte pour éviter blocage
          loaded++;
          if (loaded === imgs.length) initiateRoulette(characters);
        });
      }
    });
    // si toutes déjà chargées
    if (loaded === imgs.length) initiateRoulette(characters);
  }

  function initiateRoulette(activeCharacters) {
    const rouletteItems = document.getElementById("roulette-items");
    const items = rouletteItems.querySelectorAll(".item");
    if (!items || items.length === 0) return;

    // pick winner (éviter tout tout début)
    function selectWinner(totalItems) {
      return Math.floor(Math.random() * (totalItems - 6)) + 5; // laisse marge
    }
    const totalItems = items.length;
    const winnerIndex = selectWinner(totalItems);

    // son
    function playSound() {
      const a = new Audio("assets/Roll.mp3");
      a.volume = 0.08;
      a.play().catch(()=>{}); // ignore si autoplay bloque
    }

    // spin robuste : calcule delta entre centre item et centre red-line (dans mêmes coordonnées)
    function spinRoulette(winnerIndex) {
      const container = document.querySelector(".roulette-container");
      const redLine = document.querySelector(".red-line");

      if (!container || !redLine) {
        console.error("roulette-container ou red-line introuvable");
        return;
      }

      const winnerItem = items[winnerIndex];
      if (!winnerItem) {
        console.error("winnerItem introuvable pour index", winnerIndex);
        return;
      }

      // rects (viewport coordinates)
      const winnerRect = winnerItem.getBoundingClientRect();
      const redRect = redLine.getBoundingClientRect();
      const rouletteRect = rouletteItems.getBoundingClientRect();

      // centre absolu (viewport)
      const winnerCenterX = winnerRect.left + winnerRect.width / 2;
      const redCenterX = redRect.left + redRect.width / 2;

      // delta (en px) qu'il faut déplacer le winner vers la red-line
      const delta = winnerCenterX - redCenterX; // si >0 -> winner à droite de la ligne

      // current translation appliquée sur rouletteItems (px)
      const currentTX = getTranslateX(rouletteItems);

      // To align winner center with red center, we need to shift the container by -delta:
      // newTranslate = currentTX - delta
      const newTX = currentTX - delta;

      // apply reset to currentTX explicitly then transition to newTX
      rouletteItems.style.transition = "none";
      rouletteItems.style.transform = `translateX(${currentTX}px)`; // explicit start
      // force reflow
      // eslint-disable-next-line no-unused-expressions
      void rouletteItems.offsetWidth;

      // then animate to newTX
      // small safety: limit duration depending on distance (optional)
      const distance = Math.abs(newTX - currentTX);
      const baseDuration = 4000; // ms for medium distance
      const maxDuration = 7000;
      const minDuration = 1500;
      // scale duration with distance (tune as you like)
      let duration = Math.min(maxDuration, Math.max(minDuration, baseDuration * (distance / 1000)));
      // fallback to 5000ms if distance is tiny
      if (distance < 5) duration = 800;

      rouletteItems.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.84, 0.36, 1)`;
      rouletteItems.style.transform = `translateX(${newTX}px)`;

      // play periodic tick sounds to simulate wheel
      const tickCount = Math.min(40, items.length);
      for (let i = 0; i < tickCount; i++) {
        setTimeout(() => {
          playSound();
        }, i * (duration / tickCount));
      }

      // after animation ends -> mark winner and display
      setTimeout(() => {
        // remove previous selected if any
        items.forEach(it => it.classList.remove("selected-item"));
        items[winnerIndex].classList.add("selected-item");

        const validWinnerIndex = winnerIndex % activeCharacters.length;
        const selectedCharacterName = activeCharacters[validWinnerIndex].name;

        const winnerContainer = document.querySelector(".winner");
        if (winnerContainer) {
          winnerContainer.innerHTML = "";
          const p = document.createElement("p");
          p.textContent = `Vous avez tiré : ${selectedCharacterName}`;
          winnerContainer.appendChild(p);
        }

        // envoi backend (non bloquant)
       fetch(`${BACKEND_URL}/api/draw-and-announce`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ items: [selectedCharacterName] })
          })
      }, duration + 80); // petit buffer
    }

    // lance le spin
    spinRoulette(winnerIndex);
  }

  // Start
  loadCharactersAndStart();
});
