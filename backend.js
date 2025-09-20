require('dotenv').config();
const express = require('express');
const axios = require('axios');
const tmi = require('tmi.js');
const session = require('cookie-session');
const path = require('path');

const app = express();
app.use(express.json());
app.use(session({ name: 'sess', keys: [process.env.SESSION_KEY || 'devkey'] }));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; // ex: https://localhost:3000/auth/twitch/callback
const SCOPES = 'chat:edit chat:read';

// 1) Sert ton HTML depuis le dossier du projet
app.use(express.static(__dirname));

// 2) Redirection vers Twitch OAuth
app.get('/auth/twitch', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  req.session.state = state;
  const url = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&state=${state}`;
  res.redirect(url);
});

// 3) Callback OAuth
app.get('/auth/twitch/callback', async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.state) return res.status(400).send('Invalid state');

  try {
    // Échange du code contre un access token
    const tokenResp = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
      params: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResp.data;

    // Récupération info utilisateur
    const userResp = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${access_token}`
      }
    });
    const user = userResp.data.data[0];

    // Stockage dans session
    req.session.twitch = {
      access_token,
      refresh_token,
      login: user.login,
      display_name: user.display_name,
      obtained_at: Date.now(),
      expires_in
    };

    res.redirect('/index.html');
    
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Erreur lors de l\'authentification Twitch');
  }
});

app.get('/api/twitch-user', async (req, res) => {
  if (!req.session.twitch) return res.json({ connected: false });

  try {
    // Récupérer les infos complètes du compte
    const userResp = await axios.get('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${req.session.twitch.access_token}`
      }
    });
    const user = userResp.data.data[0];

    res.json({
      connected: true,
      login: user.login,
      display_name: user.display_name,
      avatar: user.profile_image_url // URL correcte pour l’avatar
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.json({ connected: true, login: req.session.twitch.login, display_name: req.session.twitch.display_name });
  }
});



// 4) Fonction pour créer client tmi.js
async function createTmiClientForUser(twitchSession) {
  if (!twitchSession || !twitchSession.access_token || !twitchSession.login) throw new Error('No twitch session');
  const client = new tmi.Client({
    options: { debug: false },
    identity: {
      username: twitchSession.login,
      password: `oauth:${twitchSession.access_token}`
    },
    channels: [twitchSession.login]
  });
  await client.connect();
  return client;
}

// 5) Endpoint pour tirer et annoncer
app.post('/api/draw-and-announce', async (req, res) => {
  const twitch = req.session.twitch;
  if (!twitch) return res.status(401).json({ error: 'Not connected to Twitch' });

  const items = req.body.items || ['Trapper','Huntress','Wraith','Survivant1','Survivant2'];
  const drawValue = items[Math.floor(Math.random() * items.length)];
  const message = `Le survivant / Tueur sélectionné est : ${drawValue}`;

  try {
    const client = await createTmiClientForUser(twitch);
    await client.say(twitch.login, message);
    await client.disconnect();
    res.json({ ok: true, drawValue });
  } catch (err) {
    console.error('tmi error', err);
    res.status(500).json({ error: 'Erreur en envoyant le message sur Twitch' });
  }
});

// 6) Démarrage serveur
app.listen(3000, () => console.log('Server started on http://localhost:3000'));
