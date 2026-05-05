const BACKEND = "https://dbd-killer-1.onrender.com";

document.addEventListener("DOMContentLoaded", () => {

  const items = JSON.parse(localStorage.getItem("activeCharacters") || "[]");

  const container = document.getElementById("roulette-items");

  if (!items.length) {
    container.innerHTML = "Aucun personnage sélectionné";
    return;
  }

  // duplicate for scroll effect
  const pool = [...items, ...items, ...items];

  pool.forEach(name => {
    const div = document.createElement("div");
    div.className = "item";

    div.innerHTML = `<div>${name}</div>`;
    container.appendChild(div);
  });

  const winnerIndex = Math.floor(Math.random() * items.length) + items.length;

  setTimeout(() => {
    const offset = winnerIndex * 120;

    container.style.transition = "transform 4s ease-out";
    container.style.transform = `translateX(-${offset}px)`;

    setTimeout(async () => {

      const winner = items[winnerIndex % items.length];

      document.querySelector(".winner").innerText =
        "Winner: " + winner;

      await fetch(BACKEND + "/api/draw-and-announce", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        credentials: "include",
        body: JSON.stringify({ items })
      });

    }, 4200);

  }, 300);
});