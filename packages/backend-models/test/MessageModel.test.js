import Emulator from 'google-datastore-emulator';
import pkg from 'chai';
const { assert } = pkg;
import Chance from 'chance';
import { MessageModel } from '../src/MessageModel.js';

const chance = new Chance();

describe('MessageModel', () => {
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
      const model = new MessageModel();
      assert.equal(model.namespace, 'ArcInfo');
    });
  });

  /**
   * @return {Promise<void>}
   */
  async function emptyMessages() {
    const model = new MessageModel();
    const query = model._createQuery({});
    const [entities] = await model.store.runQuery(query);
    if (!entities.length) {
      return;
    }
    const keys = entities.map((item) => item[model.store.KEY]);
    await model.store.delete(keys);
  }

  /**
   * @param {number} sample
   * @return {Promise<object>}
   */
  async function populateMessages(sample=10) {
    const model = new MessageModel();
    const promises = Array(sample).fill(0).map(() => model.insert({
      abstract: chance.paragraph(),
      title: chance.sentence(),
      target: chance.word(),
      channel: chance.word(),
    }));

    return Promise.all(promises);
  }

  describe('insert()', () => {
    let model = new MessageModel();
    before(() => {
      model = new MessageModel();
    });

    after(() => emptyMessages());

    it('returns created message', async () => {
      const result = await model.insert({
        abstract: 'test-abstract',
        title: 'test-title',
        actionUrl: 'test-actionUrl',
        cta: 'test-cta',
        target: 'test-target',
        channel: 'test-channel',
      });
      assert.typeOf(result, 'object', 'result is an object');
      assert.equal(result.id, '1', 'has an id of created object');
    });

    it('creates mesage has time property', async () => {
      const result = await model.insert({
        abstract: 'test-abstract',
        title: 'test-title',
        actionUrl: 'test-actionUrl',
        cta: 'test-cta',
        target: 'test-target',
        channel: 'test-channel',
      });
      assert.typeOf(result.time, 'number');
    });

    it('inserts mesage without actionUrl', async () => {
      const result = await model.insert({
        abstract: 'test-abstract',
        title: 'test-title',
        cta: 'test-cta',
        target: 'test-target',
        channel: 'test-channel',
      });
      assert.isUndefined(result.actionUrl);
    });

    it('inserts mesage without cta', async () => {
      const result = await model.insert({
        abstract: 'test-abstract',
        title: 'test-title',
        target: 'test-target',
        channel: 'test-channel',
      });
      assert.isUndefined(result.cta);
    });

    it('inserts mesage without target', async () => {
      const result = await model.insert({
        abstract: 'test-abstract',
        title: 'test-title',
        channel: 'test-channel',
      });
      assert.isUndefined(result.target);
    });

    it('inserts mesage without channel', async () => {
      const result = await model.insert({
        abstract: 'test-abstract',
        title: 'test-title',
      });
      assert.isUndefined(result.channel);
    });

    it('has inserted entity in the data store', async () => {
      const result = await model.insert({
        abstract: 'test-abstract',
        title: 'test-title',
      });
      const key = model.createMessageKey(result.id);
      const [entity] = await model.store.get(key);
      assert.typeOf(entity, 'object');
    });
  });

  describe('list()', () => {
    let model = new MessageModel();
    let generated;
    before(async () => {
      generated = await populateMessages();
      assert.isAbove(generated.length, 0);
      model = new MessageModel();
    });

    after(() => emptyMessages());

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

    it('respects channel option', async () => {
      const channel = generated[0].channel;
      const result = await model.list({
        channel,
      });
      assert.equal(result.entities[0].channel, channel);
    });

    it('respects target option', async () => {
      const target = generated[0].target;
      const result = await model.list({
        target,
      });
      assert.equal(result.entities[0].target, target);
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
    let model = new MessageModel();
    let generated;
    before(async () => {
      generated = await populateMessages(2);
      assert.lengthOf(generated, 2);
      model = new MessageModel();
    });

    after(() => emptyMessages());

    it('reads existing message', async () => {
      const result = await model.get(generated[0].id);
      assert.equal(result.id, generated[0].id);
    });

    it('reads other message', async () => {
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
    let model = new MessageModel();
    let generated;
    before(async () => {
      generated = await populateMessages();
      assert.lengthOf(generated, 10);
      model = new MessageModel();
    });

    after(() => emptyMessages());

    it('removes a message from the store', async () => {
      await model.delete(generated[0].id);
      const result = await model.list();
      assert.lengthOf(result.entities, 9);
    });
  });
});
