// Copyright 2019, Mulesoft.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { start as traceStart } from '@google-cloud/trace-agent';
import { start as debugStart } from '@google-cloud/debug-agent';
import express from 'express';
import session from 'express-session';
import connectMemCached from 'connect-memcached';
import passport from 'passport';
import { default as config, ckeckApiConfig } from '@advanced-rest-client/backend-config';
import logging from '@advanced-rest-client/arc-platform-logger';
import { router as Oauth2router } from './lib/oauth2.js';
import CiRoute from './api/CiRoute.js';
import ArcApiRoute from './api/ArcApiRoute.js';

ckeckApiConfig();

const IS_PRODUCTION = config.get('NODE_ENV') === 'production';

if (IS_PRODUCTION) {
  traceStart();
  debugStart();
}

const MemcachedStore = connectMemCached(session);
const app = express();
export default app;
app.disable('etag');
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(logging.requestLogger);

const sessionConfig = {
  resave: false,
  saveUninitialized: false,
  secret: config.get('SECRET'),
  signed: true,
};

const memUrl = config.get('MEMCACHE_URL');
if (IS_PRODUCTION && memUrl) {
  sessionConfig.store = new MemcachedStore({
    hosts: [memUrl],
  });
}

app.use(session(sessionConfig));
// OAuth2
app.use(passport.initialize());
app.use(passport.session());
app.use(Oauth2router);
// API
app.use('/v2/app/', ArcApiRoute);
app.use('/v2/ci/', CiRoute);
// // API console
// app.use('/', express.static(path.join(__dirname, 'api-docs')));
app.get('/_ah/health', (req, res) => {
  res.status(200).send('ok');
});
// Add the error logger after all middleware and routes so that
// it can log errors from the whole application. Any custom error
// handlers should go after this.
app.use(logging.errorLogger);

// Basic 404 handler
app.use((req, res) => {
  res.status(404).send('Not Found');
});
const server = app.listen(config.get('PORT'), () => {
  const port = server.address().port;
  logging.info(`App listening on port ${port}`);
});
