const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const SpotifyStrategy = require('passport-spotify').Strategy;
const keys = require('./config/keys');
const axios = require('axios');

mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect(keys.mongoURI);
require('./models/User');
const User = mongoose.model('users');

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => {
    done(null, user);
  });
});

passport.use(
  new SpotifyStrategy(
    {
      clientID: keys.spotifyClientID,
      clientSecret: keys.spotifyClientSecret,
      callbackURL: '/auth/spotify/callback',
      proxy: true,
    },
    async (accessToken, refreshToken, expires_in, profile, done) => {
      const query = {
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
      };
      const existingUser = await User.findOneAndUpdate(
        { spotifyId: profile.id },
        query
      );
      if (existingUser) {
        return done(null, existingUser);
      }
      const user = await new User({
        spotifyId: profile.id,
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
      }).save();
      done(null, user);
      // User.findOrCreate({ spotifyId: profile.id }, function (err, user) {
      //   return done(err, user);
      // });
    }
  )
);

const app = express();
app.use(bodyParser.json());
app.use(
  cookieSession({
    maxAge: 24 * 60 * 60 * 1000,
    keys: [keys.cookieKey],
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.get('/', (req, res) => {
  res.send('Sup brah?');
});
app.get(
  '/auth/spotify',
  passport.authenticate('spotify', {
    scope: [
      'user-read-email',
      'user-read-private',
      'playlist-read-private',
      'streaming',
    ],
    showDialog: true,
  }),
  (req, res) => {}
);

app.get(
  '/auth/spotify/callback',
  passport.authenticate('spotify', {
    failureRedirect: '/',
    failureFlash: true,
  }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/api/playlists', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.spotify.com/v1/me/playlists',
      {
        headers: {
          Authorization: `Bearer ${req.user.spotifyAccessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    let data = response.data;
    res.send(data);
  } catch (error) {
    console.log(error.response.data);
  }
});

app.get('/api/playlists/:id', async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${req.params.id}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${req.user.spotifyAccessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    let data = response.data;
    res.send(data);
  } catch (error) {
    console.log(error.response.data);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT);
