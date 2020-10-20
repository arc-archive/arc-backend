import Emulator from 'google-datastore-emulator';
import pkg from 'chai';
const { assert } = pkg;
import Chance from 'chance';
import { GitHubBuildModel } from '../index.js';

/** @typedef {import('../src/types/GitHubBuild').GithubBuildEntity} GithubBuildEntity */

const chance = new Chance();

describe('GitHubBuildModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  describe('constructor()', () => {
    it('sets namespace', () => {
      const model = new GitHubBuildModel();
      assert.equal(model.namespace, 'apic-github-builds');
    });
  });

  const typesEnum = ['stage', 'master', 'tag'];
  // const statusEnum = ['queued', 'running', 'finished'];

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
   * @param {number} sample
   * @return {Promise<GithubBuildEntity[]>}
   */
  async function populateEntities(sample=10) {
    const model = new GitHubBuildModel();
    const promises = Array(sample).fill(0).map(() => model.insertBuild(generateEntity()));
    return Promise.all(promises);
  }

  describe('insertBuild()', () => {
    let model = /** @type GitHubBuildModel */ (null);
    before(() => {
      model = new GitHubBuildModel();
    });

    after(() => emptyEntities());

    it('returns created entity', async () => {
      const result = await model.insertBuild(generateEntity());
      assert.typeOf(result, 'object', 'result is an object');
      assert.typeOf(result.id, 'string', 'has an id of created object');
    });

    it('creates message has created property', async () => {
      const result = await model.insertBuild(generateEntity());
      assert.typeOf(result.created, 'number');
    });
  });

  describe('list()', () => {
    let model = /** @type GitHubBuildModel */ (null);
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities();
      assert.lengthOf(generated, 10);
      model = new GitHubBuildModel();
    });

    after(() => emptyEntities());

    it('returns all messages without any limits', async () => {
      const result = await model.list();
      assert.equal(result.entities.length, generated.length);
    });

    it('has pageToken', async () => {
      const result = await model.list({
        limit: 5,
      });
      assert.typeOf(result.pageToken, 'string');
    });

    it('respects limit option', async () => {
      const result = await model.list({
        limit: 5,
      });
      assert.lengthOf(result.entities, 5);
    });

    it('uses page token', async () => {
      const result1 = await model.list({
        limit: 5,
      });
      const result2 = await model.list({
        pageToken: result1.pageToken,
      });
      assert.lengthOf(result2.entities, 5, 'has the same number or results');
      assert.notDeepEqual(result2.entities, result1.entities, 'has next page of results');
    });
  });

  describe('get()', () => {
    let model = /** @type GitHubBuildModel */ (null);
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new GitHubBuildModel();
    });

    after(() => emptyEntities());

    it('reads the existing build', async () => {
      const result = await model.get(generated[0].id);
      assert.equal(result.id, generated[0].id);
    });

    it('reads the other build', async () => {
      const result = await model.get(generated[1].id);
      assert.equal(result.id, generated[1].id);
    });

    it('returns undefined when not found', async () => {
      const result = await model.get('other');
      assert.isUndefined(result);
    });
  });

  describe('delete()', () => {
    let model = /** @type GitHubBuildModel */ (null);
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities();
      assert.lengthOf(generated, 10);
      model = new GitHubBuildModel();
    });

    after(() => emptyEntities());

    it('removes a message from the store', async () => {
      await model.delete(generated[0].id);
      const result = await model.list();
      assert.lengthOf(result.entities, 9);
    });
  });

  describe('startBuild()', () => {
    let model = /** @type GitHubBuildModel */ (null);
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new GitHubBuildModel();
    });

    after(() => emptyEntities());

    it('sets status to running', async () => {
      const { id } = generated[0];
      await model.startBuild(id);
      const result = await model.get(id);
      assert.equal(result.status, 'running');
    });

    it('does not update other entities', async () => {
      const { id } = generated[0];
      await model.startBuild(id);
      const result = await model.get(generated[1].id);
      assert.equal(result.status, 'queued');
    });
  });

  describe('restartBuild()', () => {
    let model = /** @type GitHubBuildModel */ (null);
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new GitHubBuildModel();
    });

    after(() => emptyEntities());

    it('resets properties', async () => {
      const { id } = generated[0];
      await model.restartBuild(id);
      const result = await model.get(id);
      assert.equal(result.ended, 0);
      assert.equal(result.message, '');
      assert.isFalse(result.error);
    });

    it('does not update other entities', async () => {
      const { id } = generated[0];
      await model.restartBuild(id);
      const result = await model.get(generated[1].id);
      assert.isUndefined(result.error);
      assert.isUndefined(result.message);
      assert.isUndefined(result.ended);
    });
  });

  describe('setBuildError()', () => {
    let model = /** @type GitHubBuildModel */ (null);
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new GitHubBuildModel();
    });

    after(() => emptyEntities());

    it('sets status property', async () => {
      const { id } = generated[0];
      await model.setBuildError(id, 'test');
      const result = await model.get(id);
      assert.equal(result.status, 'finished');
    });

    it('sets message property', async () => {
      const { id } = generated[0];
      await model.setBuildError(id, 'test');
      const result = await model.get(id);
      assert.equal(result.message, 'test');
    });

    it('sets endTime property', async () => {
      const { id } = generated[0];
      await model.setBuildError(id, 'test');
      const result = await model.get(id);
      assert.typeOf(result.ended, 'number');
    });

    it('sets error property', async () => {
      const { id } = generated[0];
      await model.setBuildError(id, 'test');
      const result = await model.get(id);
      assert.isTrue(result.error);
    });
  });

  describe('finishBuild()', () => {
    let model = /** @type GitHubBuildModel */ (null);
    let generated = /** @type GithubBuildEntity[] */ (null);
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new GitHubBuildModel();
    });

    after(() => emptyEntities());

    it('sets status property', async () => {
      const { id } = generated[0];
      await model.finishBuild(id);
      const result = await model.get(id);
      assert.equal(result.status, 'finished');
    });

    it('sets message property', async () => {
      const { id } = generated[0];
      await model.finishBuild(id, 'test');
      const result = await model.get(id);
      assert.equal(result.message, 'test');
    });

    it('sets endTime property', async () => {
      const { id } = generated[0];
      await model.finishBuild(id);
      const result = await model.get(id);
      assert.typeOf(result.ended, 'number');
    });
  });
});
