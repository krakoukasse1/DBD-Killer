// roulette.js

document.addEventListener("DOMContentLoaded", function () {
  const activeCharactersJSON = localStorage.getItem("activeCharacters");
  let activeCharacters = JSON.parse(activeCharactersJSON);
  const urlParams = new URLSearchParams(window.location.search);
  const characterType = urlParams.get('type') || localStorage.getItem('characterType') || '?';

  // --- helper pour extraire translateX courant (px)
  function getTranslateX(el) {
    const st = window.getComputedStyle(el);
    const tr = st.transform || st.webkitTransform;
    if (!tr || tr === "none") return 0;
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

  function loadCharactersAndStart() {
    if (activeCharacters && activeCharacters.length > 0) {
      displayCharacters(activeCharacters, "local");
    } else {
      fetch("data.json")
        .then(r => r.json())
        .then(data => {
          if (characterType === "Killer") activeCharacters = data.killers;
          else if (characterType === "Survivor") activeCharacters = data.survivors;
          else activeCharacters = data.killers;
          displayCharacters(activeCharacters, characterType);
        })
        .catch(err => {
          console.error("Erreur lecture data.json", err);
          activeCharacters = [];
        });
    }
  }

  function displayCharacters(characters, type) {
    const rouletteItems = document.getElementById("roulette-items");
    rouletteItems.innerHTML = "";

    for (let repeat = 0; repeat < 3; repeat++) {
      characters.forEach(character => {
        const item = document.createElement("div");
        item.className = "item";
        const img = document.createElement("img");

        // FIX : si on vient de localStorage, character.img est déjà une URL absolue
        if (activeCharactersJSON) {
          img.src = character.img;
        } else {
          const imagePath = type === "Killer" ? "assets/Killer/" : "assets/Survivor/";
          img.src = `${imagePath}${character.img}`;
        }

        item.appendChild(img);
        rouletteItems.appendChild(item);
      });
    }

    const imgs = rouletteItems.querySelectorAll("img");
    let loaded = 0;
    if (imgs.length === 0) {
      initiateRoulette(characters);
      return;
    }
    imgs.forEach(img => {
      const onLoad = () => {
        loaded++;
        if (loaded === imgs.length) initiateRoulette(characters);
      };
      if (img.complete) {
        loaded++;
      } else {
        img.addEventListener("load", onLoad);
        img.addEventListener("error", onLoad); // compte même si erreur
      }
    });
    if (loaded === imgs.length) initiateRoulette(characters);
  }

  function initiateRoulette(activeCharacters) {
    const rouletteItems = document.getElementById("roulette-items");
    const items = rouletteItems.querySelectorAll(".item");
    if (!items || items.length === 0) return;

    function selectWinner(totalItems) {
      return Math.floor(Math.random() * (totalItems - 6)) + 5;
    }
    const totalItems = items.length;
    const winnerIndex = selectWinner(totalItems);

    function playSound() {
      const a = new Audio("assets/Roll.mp3");
      a.volume = 0.08;
      a.play().catch(() => {});
    }

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

      const winnerRect = winnerItem.getBoundingClientRect();
      const redRect = redLine.getBoundingClientRect();

      const winnerCenterX = winnerRect.left + winnerRect.width / 2;
      const redCenterX = redRect.left + redRect.width / 2;
      const delta = winnerCenterX - redCenterX;
      const currentTX = getTranslateX(rouletteItems);
      const newTX = currentTX - delta;

      rouletteItems.style.transition = "none";
      rouletteItems.style.transform = `translateX(${currentTX}px)`;
      void rouletteItems.offsetWidth; // force reflow

      const distance = Math.abs(newTX - currentTX);
      const baseDuration = 4000;
      let duration = Math.min(7000, Math.max(1500, baseDuration * (distance / 1000)));
      if (distance < 5) duration = 800;

      rouletteItems.style.transition = `transform ${duration}ms cubic-bezier(0.15, 0.84, 0.36, 1)`;
      rouletteItems.style.transform = `translateX(${newTX}px)`;

      const tickCount = Math.min(40, items.length);
      for (let i = 0; i < tickCount; i++) {
        setTimeout(() => playSound(), i * (duration / tickCount));
      }

      setTimeout(() => {
        items.forEach(it => it.classList.remove("selected-item"));
        items[winnerIndex].classList.add("selected-item");

        const validWinnerIndex = winnerIndex % activeCharacters.length;
        const selectedCharacter = activeCharacters[validWinnerIndex];

        const winnerContainer = document.querySelector(".winner");
        if (winnerContainer) {
          winnerContainer.innerHTML = "";
          const p = document.createElement("p");
          p.textContent = `Vous avez tiré : ${selectedCharacter.name}`;
          winnerContainer.appendChild(p);
        }

        // FIX : envoi du type de personnage pour l'historique + URLs relatives
        fetch("/api/draw-and-announce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            items: [selectedCharacter.name],
            characterType: characterType || "?"
          })
        }).catch(err => console.warn("Annonce Twitch échouée (non connecté ?)", err));

      }, duration + 80);
    }

    spinRoulette(winnerIndex);
  }

  loadCharactersAndStart();
});