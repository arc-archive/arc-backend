/* eslint-disable require-jsdoc */
import Emulator from 'google-datastore-emulator';
import chaiPkg from 'chai';
// import Chance from 'chance';
import { TestModel } from '@advanced-rest-client/backend-models';
import fetch from 'node-fetch';
import config from '@advanced-rest-client/backend-config';
import DataHelper from './DataHelper.js';
import { generateFullToken } from './TokenHelper.js';
const { assert } = chaiPkg;

/** @typedef {import('net').AddressInfo} AddressInfo */
/** @typedef {import('@advanced-rest-client/backend-models').GithubBuildEntity} GithubBuildEntity */
/** @typedef {import('@advanced-rest-client/backend-models').TokenEntity} TokenEntity */

const port = config.get('PORT');
// const chance = new Chance();

const baseUri = `http://localhost:${port}/v2/ci/`;

describe('TestApiRoute', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator = /** @type Emulator */ (null);
  before(async () => {
    emulator = new Emulator({ consistency: '1.0' });
    await emulator.start();
  });

  after(async () => {
    await emulator.stop();
  });

  describe('/', () => {
    const testsRoute = `${baseUri}tests`;

    describe('POST', () => {
      let token = /** @type TokenEntity */ (null);
      let model = /** @type TestModel */ (null);
      before(async () => {
        token = await generateFullToken();
        model = new TestModel();
      });

      after(async () => {
        await DataHelper.deleteEntities(model, model.testKind);
      });

      it('returns 401 when no token', async () => {
        const info = DataHelper.generateAmfTestEntity();
        const response = await fetch(testsRoute, {
          method: 'POST',
          body: JSON.stringify(info),
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
        // @ts-ignore
        info.type = 'invalid';
        const response = await makeRequest(info);
        assert.equal(response.status, 400, 'response has 400 status code');
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, '"invalid" is not valid value for "type" property.');
      });
    });

    describe('GET', () => {
      let model = /** @type TestModel */ (null);
      before(async () => {
        model = new TestModel();
        await DataHelper.populateTests(model);
      });

      after(async () => {
        await DataHelper.deleteEntities(model, model.testKind);
      });

      it('returns the page of results', async () => {
        const response = await fetch(testsRoute, {
          method: 'GET',
        });
        const result = await response.json();
        assert.typeOf(result, 'object', 'has the response');
        assert.typeOf(result.items, 'array', 'has the items property');
        assert.typeOf(result.pageToken, 'string', 'has the pageToken property');
        assert.lengthOf(result.items, 25, 'has all page items');
      });

      it('returns an error for over limit page limit', async () => {
        const response = await fetch(`${testsRoute}?limit=301`, {
          method: 'GET',
        });
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, 'Limit out of bounds (0, 300]');
      });

      it('returns an error for page limit = 0', async () => {
        const response = await fetch(`${testsRoute}?limit=0`, {
          method: 'GET',
        });
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, 'Limit out of bounds (0, 300]');
      });

      it('returns an error for a limit with invalid type', async () => {
        const response = await fetch(`${testsRoute}?limit=test`, {
          method: 'GET',
        });
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, 'Limit value is not a number');
      });

      it('returns limited results', async () => {
        const response = await fetch(`${testsRoute}?limit=5`, {
          method: 'GET',
        });
        const apiResult = await response.json();
        assert.lengthOf(apiResult.items, 5, 'has limit page items');
      });

      it('uses the page token', async () => {
        const response1 = await fetch(`${testsRoute}?limit=5`, {
          method: 'GET',
        });
        const apiResult1 = await response1.json();
        const response2 = await fetch(`${testsRoute}?limit=5&pageToken=${encodeURIComponent(apiResult1.pageToken)}`, {
          method: 'GET',
        });
        const apiResult2 = await response2.json();
        assert.lengthOf(apiResult2.items, 5, 'has page limit items');
        assert.notDeepEqual(apiResult1.items, apiResult2.items, 'Has another page of results');
      });
    });
  });

  describe('/{testId}', () => {
    const testsRoute = `${baseUri}tests`;

    describe('GET', () => {
      let model = /** @type TestModel */ (null);
      let items;
      before(async () => {
        model = new TestModel();
        await DataHelper.populateTests(model);

        const response = await fetch(testsRoute, {
          method: 'GET',
        });
        const result = await response.json();
        items = result.items;
      });

      after(async () => {
        await DataHelper.deleteEntities(model, model.testKind);
      });

      it('returns the test item', async () => {
        const url = `${testsRoute}/${items[0].id}`;
        const response = await fetch(url, {
          method: 'GET',
        });
        const result = await response.json();
        assert.deepEqual(result, items[0], 'has the response');
      });

      it('returns the 404 error when not found', async () => {
        const response = await fetch(`${testsRoute}/unknown`, {
          method: 'GET',
        });
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, 'Test not found');
      });
    });

    describe('DELETE', () => {
      let token = /** @type TokenEntity */ (null);
      let model = /** @type TestModel */ (null);
      let items;
      before(async () => {
        token = await generateFullToken();
        model = new TestModel();
        await DataHelper.populateTests(model);

        const response = await fetch(testsRoute, {
          method: 'GET',
        });
        const result = await response.json();
        items = result.items;
      });

      after(async () => {
        await DataHelper.deleteEntities(model, model.testKind);
      });

      it('deletes the item', async () => {
        const url = `${testsRoute}/${items[0].id}`;
        const response = await fetch(url, {
          method: 'DELETE',
          headers: {
            authorization: `bearer ${token.token}`,
          },
        });
        assert.equal(response.status, 204);
      });

      it('returns the 401 error when not authorized', async () => {
        const url = `${testsRoute}/${items[0].id}`;
        const response = await fetch(url, {
          method: 'DELETE',
        });
        assert.equal(response.status, 401, 'has 401 status');
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, 'Unauthorized');
      });
    });
  });

  describe('/{testId}', () => {
    const testsRoute = `${baseUri}tests`;

    describe('PUT (restart)', () => {
      let token = /** @type TokenEntity */ (null);
      let model = /** @type TestModel */ (null);
      let items;
      before(async () => {
        token = await generateFullToken();
        model = new TestModel();
        await DataHelper.populateTests(model);

        const response = await fetch(testsRoute, {
          method: 'GET',
        });
        const result = await response.json();
        items = result.items;
      });

      after(async () => {
        await DataHelper.deleteEntities(model, model.testKind);
      });

      it('resets the item', async () => {
        // await model.finish(items[0].id);
        const url = `${testsRoute}/${items[0].id}/restart`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            authorization: `bearer ${token.token}`,
          },
        });
        assert.equal(response.status, 204, 'has 204 status');
        // const entity = await model.get(items[0].id);
        // assert.equal(entity.status, 'queued', 'the data store item is reset');
      });

      it('returns the 401 error when not authorized', async () => {
        const url = `${testsRoute}/${items[0].id}/restart`;
        const response = await fetch(url, {
          method: 'PUT',
        });
        assert.equal(response.status, 401, 'has 401 status');
        const apiResult = await response.json();
        assert.isTrue(apiResult.error, 'response is error');
        assert.equal(apiResult.message, 'Unauthorized');
      });
    });
  });
});
