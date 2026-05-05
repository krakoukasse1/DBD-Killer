// header.js — Barre de navigation partagée

(function () {
  // =====================
  // HAMBURGER MENU
  // =====================
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.list-ul');

  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('show'));
  }

  // =====================
  // TWITCH BUTTON
  // =====================
  const twitchBtn = document.getElementById('twitch-btn');
  if (!twitchBtn) return;

  async function updateTwitchButton() {
    try {
      const resp = await fetch('/api/twitch-user', { credentials: 'include' });
      const data = await resp.json();

      if (data.connected) {
        // Récupérer le profil pour le mode anonyme
        let isAnonymous = false;
        try {
          const profile = await fetch('/api/profile', { credentials: 'include' }).then(r => r.json());
          isAnonymous = profile.anonymousMode || false;
        } catch (_) {}

        const displayName = isAnonymous ? 'Anonyme' : data.display_name;
        const displayAvatar = isAnonymous ? 'assets/twitch_logo.png' : data.avatar;
        const avatarClass = isAnonymous ? 'twitch-icon' : 'twitch-avatar';

        twitchBtn.innerHTML = `
          <img src="${displayAvatar}" alt="${displayName}" class="${avatarClass}">
          <span>${displayName}</span>
        `;
        twitchBtn.style.border = '2px solid #00ff88';
        twitchBtn.style.color = '#fff';

        // Afficher le lien profil
        const profileLink = document.getElementById('profile-link');
        if (profileLink) profileLink.style.display = 'flex';

        twitchBtn.onclick = async () => {
          if (confirm('Voulez-vous vous déconnecter ?')) {
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
            window.location.reload();
          }
        };

      } else {
        twitchBtn.innerHTML = `
          <img src="assets/twitch_logo.png" alt="Twitch" class="twitch-icon">
          <span>Connexion Twitch</span>
        `;
        twitchBtn.style.border = '2px solid magenta';
        twitchBtn.style.color = 'magenta';

        twitchBtn.onclick = () => {
          window.location.href = '/auth/twitch';
        };
      }
    } catch (e) {
      console.warn('Impossible de contacter le backend Twitch', e);
    }
  }

  updateTwitchButton();

  // =====================
  // PING (keepalive Render)
  // =====================
  setInterval(() => {
    fetch('/ping').catch(() => {});
  }, 60 * 1000);
})();