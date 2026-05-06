require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const axios = require('axios');
const tmi = require('tmi.js');
const session = require('cookie-session');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

// =====================
// MONGODB CONNECTION
// =====================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(err => console.error('❌ MongoDB erreur:', err));

// =====================
// SCHEMA PROFIL
// =====================
const profileSchema = new mongoose.Schema({
  login: { type: String, required: true, unique: true },
  killers: { type: [String], default: [] },
  survivors: { type: [String], default: [] },
  streamerMode: { type: Boolean, default: false },
  anonymousMode: { type: Boolean, default: false },
  history: [{
    date: String,
    characterType: String,
    name: String
  }]
});

const Profile = mongoose.model('Profile', profileSchema);

// =====================
// SESSION
// =====================
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); // requis pour Render (HTTPS derrière proxy)

app.use(session({
  name: 'sess',
  keys: [process.env.SESSION_KEY || 'devkey'],
  maxAge: 24 * 60 * 60 * 1000, // 24h
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
}));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const SCOPES = 'chat:edit chat:read';

// =====================
// STATIC FRONTEND
// =====================
app.use(express.static(path.join(__dirname, '../public')));

// data.json à la racine
app.get('/data.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../data.json'));
});

// =====================
// PING (keepalive Render)
// =====================
app.get('/ping', (req, res) => res.send('pong'));

// =====================
// AUTH CHECK
// =====================
function requireAuth(req, res, next) {
  if (!req.session.twitch) {
    return res.status(401).json({ error: 'Not authenticated' });
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
  if (state !== req.session.state) return res.status(400).send('Bad state');

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
    res.status(500).send('Auth error');
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
// LOGOUT — FIX : clearCookie explicite
// =====================
app.post('/api/logout', (req, res) => {
  req.session = null;
  res.clearCookie('sess', {
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd
  });
  res.json({ ok: true });
});

// =====================
// PROFILE — MongoDB
// =====================
app.get('/api/profile', requireAuth, async (req, res) => {
  const login = req.session.twitch.login;
  try {
    const profile = await Profile.findOne({ login });
    if (!profile) {
      return res.json({ killers: [], survivors: [], streamerMode: false, anonymousMode: false, history: [] });
    }
    res.json(profile);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/profile', requireAuth, async (req, res) => {
  const login = req.session.twitch.login;
  const { killers, survivors, streamerMode, anonymousMode } = req.body;

  try {
    await Profile.findOneAndUpdate(
      { login },
      { killers, survivors, streamerMode, anonymousMode },
      { upsert: true, new: true } // crée le doc s'il n'existe pas
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// =====================
// DRAW & ANNOUNCE
// =====================
app.post('/api/draw-and-announce', requireAuth, async (req, res) => {
  const twitch = req.session.twitch;
  const items = req.body.items || [];
  const drawValue = items[0];
  if (!drawValue) return res.status(400).json({ error: 'No item provided' });

  try {
    const profile = await Profile.findOne({ login: twitch.login });
    const streamerMode = profile?.streamerMode || false;

    // Envoyer sur Twitch uniquement si mode Streamer activé
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

    // Sauvegarder dans l'historique MongoDB (max 50 entrées)
    await Profile.findOneAndUpdate(
      { login: twitch.login },
      {
        $push: {
          history: {
            $each: [{ date: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), characterType: req.body.characterType || '?', name: drawValue }],
            $position: 0, // insertion en début de tableau
            $slice: 50    // garder max 50 entrées
          }
        }
      },
      { upsert: true }
    );

    res.json({ ok: true, drawValue });
  } catch (e) {
    console.error('Draw error:', e);
    res.status(500).json({ error: 'Server error', detail: e.message });
  }
});

// =====================
// START
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));