const BACKEND = "https://dbd-killer-1.onrender.com";

fetch("/data.json")
  .then(r => r.json())
  .then(data => {

    const container = document.getElementById("character-container");
    if (!container) return;

    const params = new URLSearchParams(window.location.search);
    const type = params.get("type");

    const list = type === "Killer" ? data.killers : data.survivors;

    const active = new Set();

    list.forEach(char => {
      const div = document.createElement("div");
      div.className = "character";

      div.innerHTML = `
        <img src="assets/${type}/${char.img}">
        <p>${char.name}</p>
      `;

      div.onclick = () => {
        if (active.has(char)) {
          active.delete(char);
          div.classList.remove("inactive");
        } else {
          active.add(char);
          div.classList.add("inactive");
        }
      };

      container.appendChild(div);
    });

    const btn = document.querySelector(".roulette-draw");

    btn.onclick = () => {
      const selected = [...active].map(c => c.name);

      localStorage.setItem("activeCharacters", JSON.stringify(selected));

      window.location.href = "roulette.html";
    };
  });