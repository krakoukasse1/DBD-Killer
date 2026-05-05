// header.js — Barre de navigation partagée

(function () {
  // =====================
  // HAMBURGER MENU
  // =====================
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".list-ul");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      menu.classList.toggle("show");
    });
  }

  // =====================
  // TWITCH BUTTON
  // =====================
  const twitchBtn = document.getElementById("twitch-btn");
  if (!twitchBtn) return;

  async function updateTwitchButton() {
    try {
      const resp = await fetch("/api/twitch-user", { credentials: "include" });
      const data = await resp.json();

      if (data.connected) {
  twitchBtn.innerHTML = `
    <img src="${data.avatar}" alt="${data.display_name}" class="twitch-avatar">
    <span>${data.display_name}</span>
  `;
  twitchBtn.style.border = "2px solid #00ff88";
  twitchBtn.style.color = "#fff";

  // ← AJOUT : lien profil dynamique
  const profileLink = document.getElementById("profile-link");
  if (profileLink) profileLink.style.display = "flex";

  twitchBtn.onclick = async () => {
    if (confirm("Voulez-vous vous déconnecter ?")) {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
      window.location.reload();
    }
  };
} else {
        twitchBtn.innerHTML = `
          <img src="assets/twitch_logo.png" alt="Twitch" class="twitch-icon">
          <span>Connexion Twitch</span>
        `;
        twitchBtn.style.border = "2px solid magenta";
        twitchBtn.style.color = "magenta";

        twitchBtn.onclick = () => {
          window.location.href = "/auth/twitch";
        };
      }
    } catch (e) {
      console.warn("Impossible de contacter le backend Twitch", e);
    }
  }

  updateTwitchButton();

  // =====================
  // PING (keepalive Render)
  // =====================
  setInterval(() => {
    fetch("/ping")
      .then(() => console.log("Ping OK"))
      .catch(() => console.log("Ping échoué"));
  }, 60 * 1000);
})();
