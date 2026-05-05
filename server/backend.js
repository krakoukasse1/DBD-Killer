require('dotenv').config();
const express = require('express');
const axios = require('axios');
const tmi = require('tmi.js');
const session = require('cookie-session');
const path = require('path');

const app = express();

app.use(express.json());

// SESSION FIX (Render compatible)
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
// =====================
app.use(express.static(path.join(__dirname, '../public')));

// =====================
// SESSION CHECK
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

  res.json({
    connected: true,
    ...req.session.twitch
  });
});

// =====================
// LOGOUT FIX (IMPORTANT)
// =====================
app.post('/api/logout', (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// =====================
// PROFILE STORAGE (simple memory DB)
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
// DRAW
// =====================
app.post('/api/draw-and-announce', requireAuth, async (req, res) => {
  const twitch = req.session.twitch;

  const items = req.body.items || [];
  const drawValue = items[Math.floor(Math.random() * items.length)];

  try {
    const client = new tmi.Client({
      identity: {
        username: twitch.login,
        password: `oauth:${twitch.access_token}`
      },
      channels: [twitch.login]
    });

    await client.connect();
    await client.say(twitch.login, `🎲 ${drawValue}`);
    await client.disconnect();

    res.json({ ok: true, drawValue });
  } catch (e) {
    res.status(500).json({ error: "Twitch error" });
  }
});

// =====================
// START
// =====================
app.listen(3000, () => console.log("Server running"));