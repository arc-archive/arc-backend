import Emulator from 'google-datastore-emulator';
import pkg from 'chai';
const { assert } = pkg;
import { TestModel, TestLogModel, TestComponentModel } from '../index.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('../src/types/ComponentTest').AmfTest} AmfTest */
/** @typedef {import('../src/types/ComponentTest').BottomUpTest} BottomUpTest */
/** @typedef {import('../src/types/ComponentTest').AmfTestEntity} AmfTestEntity */
/** @typedef {import('../src/types/ComponentTest').BottomUpTestEntity} BottomUpTestEntity */

describe('TestModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  /**
   * @param {TestModel} model
   * @param {string} id
   * @return {Promise<BottomUpTest|AmfTest>}
   */
  async function getEntry(model, id) {
    const key = model.createTestKey(id);
    const [result] = await model.store.get(key);
    return model.fromDatastore(result);
  }

  describe('create()', () => {
    let model = /** @type TestModel */ (null);
    beforeEach(() => {
      model = new TestModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.testKind);
    });

    it('returns an id of created entity', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.create(info);
      assert.typeOf(id, 'string');
    });

    it('creates AMF entity in the store', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.create(info);
      const result = await getEntry(model, id);
      assert.typeOf(result, 'object');
    });

    it('creates bottom-up entity in the store', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.create(info);
      const result = await getEntry(model, id);
      assert.typeOf(result, 'object');
    });

    it('throws when unknown type', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      // @ts-ignore
      info.type = 'xyz';
      let thrown = false;
      try {
        await model.create(info);
      } catch (e) {
        thrown = true;
      }
      assert.isTrue(thrown);
    });
  });

  describe('insertBottomUp()', () => {
    let model = /** @type TestModel */ (null);
    beforeEach(() => {
      model = new TestModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.testKind);
    });

    it('returns the id of the created entity', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.insertBottomUp(info);
      assert.typeOf(id, 'string');
    });

    it('creates an entity in the store', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.insertBottomUp(info);
      const result = await getEntry(model, id);
      assert.typeOf(result, 'object');
    });

    it('adds "type" property', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.insertBottomUp(info);
      const result = await getEntry(model, id);
      assert.equal(result.type, 'bottom-up');
    });

    it('adds "created" property', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.insertBottomUp(info);
      const result = await getEntry(model, id);
      assert.typeOf(result.created, 'number');
    });

    it('adds "status" property', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.insertBottomUp(info);
      const result = await getEntry(model, id);
      assert.equal(result.status, 'queued');
    });

    it('adds "creator" property', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.insertBottomUp(info);
      const result = await getEntry(model, id);
      assert.deepEqual(result.creator, info.creator);
    });

    it('adds "repository" property', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.insertBottomUp(info);
      const result = /** @type BottomUpTestEntity */ (await getEntry(model, id));
      assert.equal(result.repository, info.repository);
    });

    it('adds "includeDev" property', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const id = await model.insertBottomUp(info);
      const result = /** @type BottomUpTestEntity */ (await getEntry(model, id));
      assert.equal(result.includeDev, info.includeDev);
    });
  });

  describe('insertAmf()', () => {
    let model = /** @type TestModel */ (null);
    beforeEach(() => {
      model = new TestModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.testKind);
    });

    it('returns the id of the created entity', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.insertAmf(info);
      assert.typeOf(id, 'string');
    });

    it('creates an entity in the store', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.insertAmf(info);
      const result = await getEntry(model, id);
      assert.typeOf(result, 'object');
    });

    it('adds "created" property', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.insertAmf(info);
      const result = await getEntry(model, id);
      assert.typeOf(result.created, 'number');
    });

    it('adds "type" property', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.insertAmf(info);
      const result = await getEntry(model, id);
      assert.equal(result.type, 'amf');
    });

    it('adds "status" property', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.insertAmf(info);
      const result = await getEntry(model, id);
      assert.equal(result.status, 'queued');
    });

    it('adds "creator" property', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.insertAmf(info);
      const result = await getEntry(model, id);
      assert.deepEqual(result.creator, info.creator);
    });

    it('adds "includeDev" property', async () => {
      const info = DataHelper.generateAmfTestEntity();
      const id = await model.insertAmf(info);
      const result = /** @type AmfTestEntity */ (await getEntry(model, id));
      assert.equal(result.amfBranch, info.amfBranch);
    });
  });

  describe('list()', () => {
    before(async () => {
      const m = new TestModel();
      const result1 = await m.list();
      assert.lengthOf(result1.entities, 0);
      await DataHelper.populateTests(m);
      const result2 = await m.list();
      assert.lengthOf(result2.entities, 25);
    });

    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    beforeEach(() => {
      model = new TestModel();
    });

    it('returns query result', async () => {
      const result = await model.list();
      assert.typeOf(result, 'object', 'result is an object');
      assert.typeOf(result.pageToken, 'string', 'has page token');
      assert.typeOf(result.entities, 'array', 'has entities');
    });

    it('returns default amount of entities', async () => {
      const result = await model.list();
      assert.lengthOf(result.entities, 25, 'has 25 entities');
    });

    it('respects the limit', async () => {
      const result = await model.list({
        limit: 10,
      });
      assert.lengthOf(result.entities, 10, 'has 10 entities');
    });

    it('respects the page token', async () => {
      const result1 = await model.list({
        limit: 10,
      });
      const result2 = await model.list({
        limit: 100,
        pageToken: result1.pageToken,
      });
      assert.lengthOf(result2.entities, 15, 'has the remaining entities');
    });
  });

  describe('get()', () => {
    let created = /** @type string[] */ (null);
    before(async () => {
      const m = new TestModel();
      created = await DataHelper.populateTests(m, 2);
    });

    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    beforeEach(() => {
      model = new TestModel();
    });

    it('returns an entity', async () => {
      const result = await model.get(created[0]);
      assert.typeOf(result, 'object');
    });

    it('returns null when not found', async () => {
      const result = await model.get('not-found');
      assert.equal(result, null);
    });
  });

  describe('start()', () => {
    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    let id;
    beforeEach(async () => {
      model = new TestModel();
      const info = DataHelper.generateBottomUpTestEntity();
      id = await model.create(info);
    });

    it('updates state to running', async () => {
      await model.start(id);
      const result = await getEntry(model, id);
      assert.equal(result.status, 'running');
    });
  });

  describe('setTestError()', () => {
    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    let id;
    const message = 'test message';
    beforeEach(async () => {
      model = new TestModel();
      const info = DataHelper.generateAmfTestEntity();
      id = await model.create(info);
    });

    it('updates state to finished', async () => {
      await model.setTestError(id, message);
      const result = await getEntry(model, id);
      assert.equal(result.status, 'finished');
    });

    it('sets "ended"', async () => {
      await model.setTestError(id, message);
      const result = await getEntry(model, id);
      assert.typeOf(result.ended, 'number');
    });

    it('sets "error"', async () => {
      await model.setTestError(id, message);
      const result = await getEntry(model, id);
      assert.isTrue(result.error);
    });

    it('sets "message"', async () => {
      await model.setTestError(id, message);
      const result = await getEntry(model, id);
      assert.equal(result.message, message);
    });
  });

  describe('setScope()', () => {
    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    let id;
    beforeEach(async () => {
      model = new TestModel();
      const info = DataHelper.generateAmfTestEntity();
      id = await model.create(info);
    });

    it('sets "size"', async () => {
      await model.setScope(id, 20);
      const result = await getEntry(model, id);
      assert.equal(result.size, 20);
    });
  });

  describe('setComponentError()', () => {
    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    let id;
    beforeEach(async () => {
      model = new TestModel();
      const info = DataHelper.generateAmfTestEntity();
      id = await model.create(info);
    });

    it('updates state to running', async () => {
      await model.setComponentError(id);
      const result = await getEntry(model, id);
      assert.equal(result.status, 'running');
    });

    it('updates failed property', async () => {
      await model.setComponentError(id);
      const result = await getEntry(model, id);
      assert.equal(result.failed, 1);
    });
  });

  describe('updateComponentResult()', () => {
    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    let id;
    beforeEach(async () => {
      model = new TestModel();
      const info = DataHelper.generateAmfTestEntity();
      id = await model.create(info);
    });

    it('updates state to running', async () => {
      const report = DataHelper.generateTestReport();
      await model.updateComponentResult(id, report);
      const result = await getEntry(model, id);
      assert.equal(result.status, 'running');
    });

    it('updates passed property when no error', async () => {
      const report = DataHelper.generateTestReport();
      report.error = false;
      await model.updateComponentResult(id, report);
      const result = await getEntry(model, id);
      assert.equal(result.passed, 1);
    });

    it('updates failed property when error', async () => {
      const report = DataHelper.generateTestReport();
      report.error = true;
      await model.updateComponentResult(id, report);
      const result = await getEntry(model, id);
      assert.equal(result.failed, 1);
    });
  });

  describe('finish()', () => {
    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    let id;
    beforeEach(async () => {
      model = new TestModel();
      const info = DataHelper.generateAmfTestEntity();
      id = await model.create(info);
    });

    it('updates status to finished', async () => {
      await model.finish(id);
      const result = await getEntry(model, id);
      assert.equal(result.status, 'finished');
    });

    it('sets the ended property', async () => {
      await model.finish(id);
      const result = await getEntry(model, id);
      assert.typeOf(result.ended, 'number');
    });

    it('adds "message" property', async () => {
      const message = 'test message';
      await model.finish(id, message);
      const result = await getEntry(model, id);
      assert.equal(result.message, message);
    });
  });

  describe('delete()', () => {
    after(async () => {
      const m = new TestModel();
      await DataHelper.deleteEntities(m, m.testKind);
    });

    let model = /** @type TestModel */ (null);
    let cmpModel = /** @type TestComponentModel */ (null);
    let logsModel = /** @type TestLogModel */ (null);
    let id;
    let component;
    beforeEach(async () => {
      model = new TestModel();
      const info = DataHelper.generateBottomUpTestEntity();
      id = await model.create(info);
      component = DataHelper.generatePackageName();

      cmpModel = new TestComponentModel();
      await cmpModel.create(id, component);

      logsModel = new TestLogModel();
      const reports = DataHelper.generateTestReport(2).results;
      await logsModel.addLogs(id, component, reports);
    });

    it('deletes the test model entity', async () => {
      await model.delete(id);
      const result = await model.get(id);
      assert.equal(result, null);
    });

    it('deletes components results for the test', async () => {
      await model.delete(id);
      const cmpResult = await cmpModel.list(id);
      assert.isEmpty(cmpResult.entities);
    });

    it('deletes only components related to the test', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const otherId = await model.create(info);
      const otherComponent = DataHelper.generatePackageName();
      await cmpModel.create(otherId, otherComponent);

      await model.delete(id);
      const cmpResult = await cmpModel.list(otherId);
      assert.lengthOf(cmpResult.entities, 1);
    });

    it('deletes logs for the test', async () => {
      await model.delete(id);
      const logResult = await logsModel.list(id, component);
      assert.isEmpty(logResult.entities);
    });

    it('deletes only logs related to the test', async () => {
      const info = DataHelper.generateBottomUpTestEntity();
      const otherId = await model.create(info);
      const otherComponent = DataHelper.generatePackageName();
      await cmpModel.create(otherId, otherComponent);
      const reports = DataHelper.generateTestReport(2).results;
      await logsModel.addLogs(otherId, otherComponent, reports);

      await model.delete(id);
      const logResult = await logsModel.list(otherId, otherComponent);
      assert.lengthOf(logResult.entities, 2);
    });
  });
});
