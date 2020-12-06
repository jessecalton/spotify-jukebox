const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const SpotifyStrategy = require('passport-spotify').Strategy;
const keys = require('./config/dev.js');

mongoose.connect(keys.mongoURI);
require('./models/User');
const User = mongoose.model('users');

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((id, done) => {
  console.log(id);
  User.findById(id).then((user) => {
    done(null, user);
  });
});

passport.use(
  new SpotifyStrategy(
    {
      clientID: keys.spotifyClientID,
      clientSecret: keys.spotifyClientSecret,
      callbackURL: 'http://localhost:5000/auth/spotify/callback',
    },
    async (accessToken, refreshToken, expires_in, profile, done) => {
      const existingUser = await User.findOne({ spotifyId: profile.id });
      if (existingUser) {
        return done(null, existingUser);
      }
      const user = await new User({ spotifyId: profile.id }).save();
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
    scope: ['user-read-email', 'user-read-private'],
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

const PORT = process.env.PORT || 5000;
app.listen(PORT);
