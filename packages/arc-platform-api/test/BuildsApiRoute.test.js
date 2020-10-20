import Emulator from 'google-datastore-emulator';
import chaiPkg from 'chai';
import Chance from 'chance';
import { GitHubBuildModel } from '@advanced-rest-client/backend-models';
import fetch from 'node-fetch';
import { server, serverStartPromise } from '../index.mjs';
import { generateFullToken } from './TokenHelper.js';
const { assert } = chaiPkg;

/** @typedef {import('net').AddressInfo} AddressInfo */
/** @typedef {import('@advanced-rest-client/backend-models').GithubBuildEntity} GithubBuildEntity */
/** @typedef {import('@advanced-rest-client/backend-models').TokenEntity} TokenEntity */

const { port } = /** @type AddressInfo */ (server.address());
const chance = new Chance();

const baseUri = `http://localhost:${port}/v2/ci/`;

describe('BuildsApiRoute', () => {
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

  const typesEnum = ['stage', 'master', 'tag'];
  /**
   * @return {GithubBuildEntity}
   */
  function generateEntity() {
    const typeIndex = chance.pickone([0, 1, 2]);
    return {
      // @ts-ignore
      type: typesEnum[typeIndex],
      repository: chance.url(),
    };
  }

  /**
   * @return {Promise<void>}
   */
  async function emptyEntities() {
    const model = new GitHubBuildModel();
    const query = model.store.createQuery(model.namespace, model.buildKind);
    const [entities] = await model.store.runQuery(query);
    if (!entities.length) {
      return;
    }
    const keys = entities.map((item) => item[model.store.KEY]);
    await model.store.delete(keys);
  }

  /**
   * @param {number} sample
   * @return {Promise<GithubBuildEntity[]>}
   */
  async function populateEntities(sample=10) {
    const model = new GitHubBuildModel();
    const promises = Array(sample).fill(0).map(() => model.insertBuild(generateEntity()));
    return Promise.all(promises);
  }

  describe('/', () => {
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities();
      assert.lengthOf(generated, 10);
    });

    after(() => emptyEntities());

    const buildRoute = `${baseUri}builds`;

    it('returns all messages without any limits', async () => {
      const response = await fetch(buildRoute);
      const result = await response.json();
      assert.equal(result.items.length, generated.length);
    });

    it('has pageToken', async () => {
      const response = await fetch(`${buildRoute}?limit=5`);
      const result = await response.json();
      assert.typeOf(result.pageToken, 'string');
    });

    it('respects limit option', async () => {
      const response = await fetch(`${buildRoute}?limit=5`);
      const result = await response.json();
      assert.lengthOf(result.items, 5);
    });

    it('uses the page token', async () => {
      const response1 = await fetch(`${buildRoute}?limit=5`);
      const result1 = await response1.json();
      const response2 = await fetch(`${buildRoute}?pageToken=${result1.pageToken}`);
      const result2 = await response2.json();
      assert.lengthOf(result2.items, 5, 'has the same number or results');
      assert.notDeepEqual(result2.items, result1.items, 'has next page of results');
    });

    it('returns error when API limit is not a number', async () => {
      const response = await fetch(`${buildRoute}?limit=test`);
      const result = await response.json();
      assert.isTrue(result.error, 'has the error property');
      assert.typeOf(result.message, 'string', 'has the message property');
      assert.equal(response.status, 400, 'response has error status code');
    });

    it('returns error for invalid page token', async () => {
      const response = await fetch(`${buildRoute}?pageToken=test`);
      const result = await response.json();
      assert.isTrue(result.error, 'has the error property');
      assert.typeOf(result.message, 'string', 'has the message property');
      assert.equal(response.status, 400, 'response has error status code');
    });
  });

  describe('/:id', () => {
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
    });

    after(() => emptyEntities());

    const buildRoute = `${baseUri}builds`;

    it('reads the existing build', async () => {
      const { id } = generated[0];
      const response = await fetch(`${buildRoute}/${id}`);
      const result = await response.json();
      assert.equal(result.id, id);
    });

    it('reads the other build', async () => {
      const { id } = generated[1];
      const response = await fetch(`${buildRoute}/${id}`);
      const result = await response.json();
      assert.equal(result.id, id);
    });

    it('returns error when not found', async () => {
      const response = await fetch(`${buildRoute}/some`);
      const result = await response.json();
      assert.isTrue(result.error, 'has the error property');
      assert.typeOf(result.message, 'string', 'has the message property');
      assert.equal(response.status, 404, 'response has error status code');
    });
  });

  describe('/:id/restart', () => {
    let model = /** @type GitHubBuildModel */ (null);
    let generated = /** @type GithubBuildEntity[] */ (null);
    let token = /** @type TokenEntity */ (null);
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new GitHubBuildModel();
      token = await generateFullToken();
    });

    after(() => emptyEntities());

    const buildRoute = `${baseUri}builds`;

    it('returns 401 when no token', async () => {
      const { id } = generated[0];

      const response = await fetch(`${buildRoute}/${id}/restart`, { method: 'PUT' });
      const result = await response.json();

      assert.isTrue(result.error, 'has the error property');
      assert.typeOf(result.message, 'string', 'has the message property');
      assert.equal(response.status, 401, 'response has error status code');
    });

    it('resets build properties', async () => {
      const { id } = generated[0];
      await model.startBuild(id);
      const response = await fetch(`${buildRoute}/${id}/restart`, {
        method: 'PUT',
        headers: {
          authorization: `bearer ${token.token}`,
        },
      });
      assert.equal(response.status, 201, 'response has 201 response code');
      const result = await model.get(id);
      assert.equal(result.ended, 0);
      assert.equal(result.message, '');
      assert.isFalse(result.error);
    });

    it('does not update other entities', async () => {
      const { id } = generated[0];
      await model.startBuild(id);
      await fetch(`${buildRoute}/${id}/restart`, {
        method: 'PUT',
        headers: {
          authorization: `bearer ${token.token}`,
        },
      });
      const result = await model.get(generated[1].id);
      assert.isUndefined(result.error);
      assert.isUndefined(result.message);
      assert.isUndefined(result.ended);
    });
  });
});
