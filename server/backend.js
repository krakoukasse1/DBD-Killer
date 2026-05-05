require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const axios = require('axios');
const tmi = require('tmi.js');
const session = require('cookie-session');
const path = require('path');

const app = express();

app.use(express.json());

// SESSION
app.use(session({
  name: 'sess',
  keys: [process.env.SESSION_KEY || 'devkey'],
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SCOPES = 'chat:edit chat:read';

// =====================
// STATIC FRONTEND
// FIX : chemin corrigé pour la nouvelle structure (server/backend.js → ../public)
// =====================
app.use(express.static(path.join(__dirname, '../public')));

// FIX : data.json est à la racine, on l'expose explicitement
app.get('/data.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../data.json'));
});

// =====================
// PING (keepalive pour Render)
// =====================
app.get('/ping', (req, res) => res.send('pong'));

// =====================
// AUTH CHECK
// =====================
function requireAuth(req, res, next) {
  if (!req.session.twitch) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// =====================
// TWITCH LOGIN
// =====================
app.get('/auth/twitch', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  req.session.state = state;

  const url =
    `https://id.twitch.tv/oauth2/authorize?response_type=code` +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${state}`;

  res.redirect(url);
});

// =====================
// CALLBACK
// =====================
app.get('/auth/twitch/callback', async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.state) return res.status(400).send("Bad state");

  try {
    const token = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      }
    });

    const access_token = token.data.access_token;

    const user = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${access_token}`
      }
    });

    const u = user.data.data[0];

    req.session.twitch = {
      login: u.login,
      display_name: u.display_name,
      avatar: u.profile_image_url,
      access_token
    };

    res.redirect('/');
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).send("Auth error");
  }
});

// =====================
// USER INFO
// =====================
app.get('/api/twitch-user', (req, res) => {
  if (!req.session.twitch) return res.json({ connected: false });
  res.json({ connected: true, ...req.session.twitch });
});

// =====================
// LOGOUT
// =====================
app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// =====================
// PROFILE (mémoire simple — à remplacer par une vraie DB plus tard)
// =====================
let fakeDB = {};

app.get('/api/profile', requireAuth, (req, res) => {
  const user = req.session.twitch.login;
  res.json(fakeDB[user] || {
    killers: [],
    survivors: [],
    streamerMode: false,
    anonymousMode: false,
    history: []
  });
});

app.post('/api/profile', requireAuth, (req, res) => {
  const user = req.session.twitch.login;
  fakeDB[user] = {
    ...req.body,
    history: fakeDB[user]?.history || []
  };
  res.json({ ok: true });
});

// =====================
// DRAW & ANNOUNCE (Twitch chat)
// =====================
app.post('/api/draw-and-announce', requireAuth, async (req, res) => {
  const twitch = req.session.twitch;
  const items = req.body.items || [];

  // Le tirage est fait côté client, on reçoit le gagnant directement
  const drawValue = items[0] || items[Math.floor(Math.random() * items.length)];

  // Récupérer les préférences du profil
  const userProfile = fakeDB[twitch.login] || {};
  const streamerMode = userProfile.streamerMode || false;

  try {
    // N'envoyer sur Twitch QUE si le mode Streamer est activé
    if (streamerMode) {
      const client = new tmi.Client({
        identity: {
          username: twitch.login,
          password: `oauth:${twitch.access_token}`
        },
        channels: [twitch.login]
      });

      await client.connect();
      await client.say(twitch.login, `🎲 Tirage DBD : ${drawValue} !`);
      await client.disconnect();
    }

    // Sauvegarder dans l'historique
    if (fakeDB[twitch.login]) {
      fakeDB[twitch.login].history = fakeDB[twitch.login].history || [];
      fakeDB[twitch.login].history.unshift({
        date: new Date().toLocaleString('fr-FR'),
        type: req.body.characterType || '?',
        name: drawValue
      });
      // Garder max 50 entrées
      fakeDB[twitch.login].history = fakeDB[twitch.login].history.slice(0, 50);
    }

    res.json({ ok: true, drawValue });
  } catch (e) {
    console.error("Twitch TMI error:", e);
    res.status(500).json({ error: "Twitch error", detail: e.message });
  }
});

// =====================
// START
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));