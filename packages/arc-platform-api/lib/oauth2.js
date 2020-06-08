import express from 'express';
import config from '@advanced-rest-client/backend-config';
import { UserModel } from '@advanced-rest-client/backend-models';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

/** @typedef {import('express').Request} Request */
/** @typedef {import('express').Response} Response */

const model = new UserModel();

// Configure the Google strategy for use by Passport.js.
//
// OAuth 2-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Google API on the user's behalf,
// along with the user's profile. The function must invoke `cb` with a user
// object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(
    new GoogleStrategy(
        {
          clientID: config.get('OAUTH2_CLIENT_ID'),
          clientSecret: config.get('OAUTH2_CLIENT_SECRET'),
          callbackURL: config.get('OAUTH2_CALLBACK'),
          accessType: 'offline',
        },
        (accessToken, refreshToken, profile, cb) => {
          model
              .findOrCreateUser(profile, refreshToken)
              .then((profile) => {
                cb(null, profile);
              })
              .catch((cause) => {
                cb(cause);
              });
        },
    ),
);

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const user = await model.get(id);
    cb(null, user || false);
  } catch (e) {
    cb(e);
  }
});

export const router = express.Router();

/**
 * Middleware that requires the user to be logged in. If the user is not logged
 * in, it will redirect the user to authorize the application and then return
 * them to the original URL they requested.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Function} next
 */
export function authRequired(req, res, next) {
  if (!req.user) {
    req.session.oauth2return = req.originalUrl;
    res.redirect('/auth/login');
    return;
  }
  next();
}

// Begins the authorization flow. The user will be redirected to Google where
// they can authorize the application to have access to their basic profile
// information. Upon approval the user is redirected to `/auth/google/callback`.
// If the `return` query parameter is specified when sending a user to this URL
// then they will be redirected to that URL when the flow is finished.
router.get(
    // Login url
    '/auth/login',

    // Save the url of the user's current page so the app can redirect back to
    // it after authorization
    (req, res, next) => {
      if (req.query.return) {
        req.session.oauth2return = req.query.return;
      }
      next();
    },

    // Start OAuth 2 flow using Passport.js
    passport.authenticate('google', { scope: ['email', 'profile'] }),
);

router.get(
    // OAuth 2 callback url. Use this url to configure your OAuth client in the
    // Google Developers console
    '/auth/callback',

    // Finish OAuth 2 flow using Passport.js
    passport.authenticate('google'),

    // Redirect back to the original page, if any
    (req, res) => {
      const redirect = req.session.oauth2return || '/';
      delete req.session.oauth2return;
      res.redirect(redirect);
    },
);

// Deletes the user's credentials and profile from the session.
// This does not revoke any active tokens.
router.get('/auth/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});
