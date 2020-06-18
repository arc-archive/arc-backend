import Emulator from 'google-datastore-emulator';
import { assert } from 'chai';
import Chance from 'chance';
import { ComponentBuildModel } from '../src/ComponentBuildModel.js';

/** @typedef {import('../src/ComponentBuildModel').EditableComponentBuildEntity} EditableComponentBuildEntity */

const chance = new Chance();

describe('ComponentBuildModel', () => {
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
      const model = new ComponentBuildModel();
      assert.equal(model.namespace, 'api-components-builds');
    });
  });

  /**
   * @return {Promise<void>}
   */
  async function emptyEntities() {
    const model = new ComponentBuildModel();
    const query = model.store.createQuery(model.namespace, model.buildKind);
    const [entities] = await model.store.runQuery(query);
    if (!entities.length) {
      return;
    }
    const keys = entities.map((item) => item[model.store.KEY]);
    await model.store.delete(keys);
  }

  /**
   * @return {EditableComponentBuildEntity}
   */
  function generateEntity() {
    return {
      type: chance.word(),
      branch: chance.word(),
      component: chance.word(),
      commit: chance.word(),
      sshUrl: chance.word(),
      org: chance.word(),
      bumpVersion: chance.bool(),
    };
  }

  /**
   * @param {number} sample
   * @return {Promise<object>}
   */
  async function populateEntities(sample=10) {
    const model = new ComponentBuildModel();
    const promises = Array(sample).fill(0).map(() => model.insertBuild(generateEntity()));
    return Promise.all(promises);
  }

  describe('insertBuild()', () => {
    let model = new ComponentBuildModel();
    before(() => {
      model = new ComponentBuildModel();
    });

    after(() => emptyEntities());

    it('returns created entity', async () => {
      const result = await model.insertBuild(generateEntity());
      assert.typeOf(result, 'object', 'result is an object');
      assert.typeOf(result.id, 'string', 'has an id of created object');
    });

    it('creates mesage has created property', async () => {
      const result = await model.insertBuild(generateEntity());
      assert.typeOf(result.created, 'number');
    });

    it('inserts mesage without bumpVersion', async () => {
      const item = generateEntity();
      delete item.bumpVersion;
      const result = await model.insertBuild(item);
      assert.isUndefined(result.bumpVersion);
    });
  });

  describe('list()', () => {
    let model = new ComponentBuildModel();
    let generated;
    before(async () => {
      generated = await populateEntities();
      assert.lengthOf(generated, 10);
      model = new ComponentBuildModel();
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
    let model = new ComponentBuildModel();
    let generated;
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new ComponentBuildModel();
    });

    after(() => emptyEntities());

    it('reads existing test', async () => {
      const result = await model.get(generated[0].id);
      assert.equal(result.id, generated[0].id);
    });

    it('reads other test', async () => {
      const result = await model.get(generated[1].id);
      assert.equal(result.id, generated[1].id);
    });

    it('throws when not found', async () => {
      let thrown = false;
      try {
        await model.get('other');
      } catch (e) {
        thrown = true;
      }
      assert.isTrue(thrown);
    });
  });

  describe('delete()', () => {
    let model = new ComponentBuildModel();
    let generated;
    before(async () => {
      generated = await populateEntities();
      assert.lengthOf(generated, 10);
      model = new ComponentBuildModel();
    });

    after(() => emptyEntities());

    it('removes a message from the store', async () => {
      await model.delete(generated[0].id);
      const result = await model.list();
      assert.lengthOf(result.entities, 9);
    });
  });

  describe('startBuild()', () => {
    let model = new ComponentBuildModel();
    let generated;
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new ComponentBuildModel();
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
    let model = new ComponentBuildModel();
    let generated;
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new ComponentBuildModel();
    });

    after(() => emptyEntities());

    it('resets properties', async () => {
      const { id } = generated[0];
      await model.restartBuild(id);
      const result = await model.get(id);
      assert.equal(result.endTime, 0);
      assert.equal(result.message, '');
      assert.isFalse(result.error);
    });

    it('does not update other entities', async () => {
      const { id } = generated[0];
      await model.restartBuild(id);
      const result = await model.get(generated[1].id);
      assert.isUndefined(result.error);
      assert.isUndefined(result.message);
      assert.isUndefined(result.endTime);
    });
  });

  describe('setBuildError()', () => {
    let model = new ComponentBuildModel();
    let generated;
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new ComponentBuildModel();
    });

    after(() => emptyEntities());

    it('sets status proprty', async () => {
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
      assert.typeOf(result.endTime, 'number');
    });

    it('sets error property', async () => {
      const { id } = generated[0];
      await model.setBuildError(id, 'test');
      const result = await model.get(id);
      assert.isTrue(result.error);
    });
  });

  describe('finishBuild()', () => {
    let model = new ComponentBuildModel();
    let generated;
    before(async () => {
      generated = await populateEntities(2);
      assert.lengthOf(generated, 2);
      model = new ComponentBuildModel();
    });

    after(() => emptyEntities());

    it('sets status proprty', async () => {
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
      assert.typeOf(result.endTime, 'number');
    });
  });
});
