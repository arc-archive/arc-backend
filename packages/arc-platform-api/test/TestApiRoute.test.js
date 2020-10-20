/* eslint-disable require-jsdoc */
import Emulator from 'google-datastore-emulator';
import chaiPkg from 'chai';
// import Chance from 'chance';
import { TestModel } from '@advanced-rest-client/backend-models';
import fetch from 'node-fetch';
import { server, serverStartPromise } from '../index.mjs';
import DataHelper from './DataHelper.js';
import { generateFullToken } from './TokenHelper.js';
const { assert } = chaiPkg;

/** @typedef {import('net').AddressInfo} AddressInfo */
/** @typedef {import('@advanced-rest-client/backend-models').GithubBuildEntity} GithubBuildEntity */
/** @typedef {import('@advanced-rest-client/backend-models').TokenEntity} TokenEntity */

const { port } = /** @type AddressInfo */ (server.address());
// const chance = new Chance();

const baseUri = `http://localhost:${port}/v2/ci/`;

describe('TestApiRoute', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator = /** @type Emulator */ (null);
  before(async () => {
    emulator = new Emulator({});
    await serverStartPromise;
    await emulator.start();
  });

  after(async () => {
    await emulator.stop();
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  describe('/', () => {
    const testsRoute = `${baseUri}tests`;
    describe('POST (create)', () => {
      let token = /** @type TokenEntity */ (null);
      let model = /** @type TestModel */ (null);
      before(async () => {
        token = await generateFullToken();
        model = new TestModel();
      });

      after(async () => {
        // const model = new TestModel();
        await DataHelper.deleteEntities(model, model.testKind);
      });

      it('returns 401 when no token', async () => {
        const info = DataHelper.generateAmfTestEntity();
        const response = await fetch(testsRoute, {
          method: 'POST',
          body: info,
        });
        const result = await response.json();
        assert.isTrue(result.error, 'has the error property');
        assert.typeOf(result.message, 'string', 'has the message property');
        assert.equal(response.status, 401, 'response has error status code');
      });

      async function makeRequest(body) {
        return fetch(testsRoute, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'authorization': `bearer ${token.token}`,
            'content-type': 'application/json',
          },
        });
      }

      it('returns created AMF test id', async () => {
        const info = DataHelper.generateAmfTestEntity();
        const response = await makeRequest(info);
        assert.equal(response.status, 200, 'response has 200 response code');
        const apiResult = await response.json();
        assert.typeOf(apiResult.id, 'string');
      });

      it('returns created bottom-up test id', async () => {
        const info = DataHelper.generateBottomUpTestEntity();
        const response = await makeRequest(info);
        assert.equal(response.status, 200, 'response has 200 response code');
        const apiResult = await response.json();
        assert.typeOf(apiResult.id, 'string');
      });

      it('returns error when no type property', async () => {
        const info = DataHelper.generateBottomUpTestEntity();
        delete info.type;
        const response = await makeRequest(info);
        assert.equal(response.status, 400, 'response has 400 status code');
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, 'Test "type" is required.');
      });

      it('returns error when invalid type property', async () => {
        const info = DataHelper.generateBottomUpTestEntity();
        info.type = 'invalid';
        const response = await makeRequest(info);
        assert.equal(response.status, 400, 'response has 400 status code');
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, '"invalid" is not valid value for "type" property.');
      });
    });
  });
});
