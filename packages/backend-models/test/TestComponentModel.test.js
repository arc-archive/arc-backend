import Emulator from 'google-datastore-emulator';
import pkg from 'chai';
const { assert } = pkg;
import { TestComponentModel } from '../index.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('../src/TestComponentModel').TestComponentEntity} TestComponentEntity */

describe('TestComponentModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  /**
   * @param {TestComponentModel} model
   * @param {string} id
   * @param {string} cmp
   * @return {Promise<TestComponentEntity>}
   */
  async function getEntry(model, id, cmp) {
    const key = model.createTestComponentKey(id, cmp);
    const [result] = await model.store.get(key);
    return model.fromDatastore(result);
  }

  describe('create()', () => {
    const testId = 'test123';
    let model = /** @type TestComponentModel */ (null);
    beforeEach(() => {
      model = new TestComponentModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.componentsKind);
    });

    it('adds new test result entry', async () => {
      const cmp = DataHelper.generatePackageName();
      await model.create(testId, cmp);
      const result = await getEntry(model, testId, cmp);
      assert.typeOf(result, 'object');
      assert.typeOf(result.id, 'string');
    });

    it('adds the "component" property', async () => {
      const cmp = DataHelper.generatePackageName();
      await model.create(testId, cmp);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.component, cmp);
    });

    it('adds the "status" property', async () => {
      const cmp = DataHelper.generatePackageName();
      await model.create(testId, cmp);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.status, 'running');
    });

    it('adds the "startTime" property', async () => {
      const cmp = DataHelper.generatePackageName();
      await model.create(testId, cmp);
      const result = await getEntry(model, testId, cmp);
      assert.typeOf(result.startTime, 'number');
    });

    it('removes existing entry before inserting', async () => {
      const cmp = DataHelper.generatePackageName();
      await model.create(testId, cmp);
      const result = await getEntry(model, testId, cmp);
      result.status = 'x';
      await model.store.save(result);
      await model.create(testId, cmp);
      const newResult = await getEntry(model, testId, cmp);
      assert.equal(newResult.status, 'running');
    });
  });

  describe('get()', () => {
    const testId = 'test123';
    let model = /** @type TestComponentModel */ (null);
    beforeEach(() => {
      model = new TestComponentModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.componentsKind);
    });

    it('returns existing entity', async () => {
      const cmp = DataHelper.generatePackageName();
      await model.create(testId, cmp);
      const result = await model.get(testId, cmp);
      assert.typeOf(result, 'object');
    });

    it('returns null wjen does not exists', async () => {
      const result = await model.get(testId, 'non-existing');
      assert.equal(result, null);
    });
  });

  describe('updateComponent()', () => {
    const testId = 'test123';
    let model = /** @type TestComponentModel */ (null);
    let cmp;
    beforeEach(async () => {
      model = new TestComponentModel();
      cmp = DataHelper.generatePackageName();
      await model.create(testId, cmp);
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.componentsKind);
    });

    it('updated the "status" property', async () => {
      const report = DataHelper.generateTestReport();
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.notEqual(result.status, 'running');
    });

    it('sets the "status" property to "passed" when no error and no failed', async () => {
      const report = DataHelper.generateTestReport();
      report.error = false;
      report.failed = 0;
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.status, 'passed');
    });

    it('sets the "status" property to "failed" when no error and failed', async () => {
      const report = DataHelper.generateTestReport();
      report.error = false;
      report.failed = 10;
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.status, 'failed');
    });

    it('sets the "status" property to "failed" when errors and no failed', async () => {
      const report = DataHelper.generateTestReport();
      report.error = true;
      report.failed = 0;
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.status, 'failed');
    });

    it('sets the "total" property', async () => {
      const report = DataHelper.generateTestReport();
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.total, report.total);
    });

    it('sets the "success" property', async () => {
      const report = DataHelper.generateTestReport();
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.success, report.success);
    });

    it('sets the "failed" property', async () => {
      const report = DataHelper.generateTestReport();
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.failed, report.failed);
    });

    it('sets the "skipped" property', async () => {
      const report = DataHelper.generateTestReport();
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.skipped, report.skipped);
    });

    it('sets the "hasLogs" property when has logs', async () => {
      const report = DataHelper.generateTestReport();
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.isTrue(result.hasLogs);
    });

    it('sets the "hasLogs" property when has no logs', async () => {
      const report = DataHelper.generateTestReport();
      report.results = [];
      await model.updateComponent(testId, cmp, report);
      const result = await getEntry(model, testId, cmp);
      assert.isFalse(result.hasLogs);
    });
  });

  describe('updateComponentError()', () => {
    const testId = 'test123';
    let model = /** @type TestComponentModel */ (null);
    let cmp;
    const message = 'test error message';
    beforeEach(async () => {
      model = new TestComponentModel();
      cmp = DataHelper.generatePackageName();
      await model.create(testId, cmp);
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.componentsKind);
    });

    it('updated the "status" property', async () => {
      await model.updateComponentError(testId, cmp, message);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.status, 'failed');
    });

    it('adds the "error" property', async () => {
      await model.updateComponentError(testId, cmp, message);
      const result = await getEntry(model, testId, cmp);
      assert.isTrue(result.error);
    });

    it('adds the "hasLogs" property', async () => {
      await model.updateComponentError(testId, cmp, message);
      const result = await getEntry(model, testId, cmp);
      assert.isFalse(result.hasLogs);
    });

    it('adds the "message" property', async () => {
      await model.updateComponentError(testId, cmp, message);
      const result = await getEntry(model, testId, cmp);
      assert.equal(result.message, message);
    });
  });

  describe('list()', () => {
    const testId = 'test123';
    let model = /** @type TestComponentModel */ (null);
    beforeEach(async () => {
      model = new TestComponentModel();
    });

    before(async () => {
      const m = new TestComponentModel();
      const result = await m.list(testId);
      assert.lengthOf(result.entities, 0);
      await DataHelper.populateComponentTestReports(m, testId);
    });

    after(async () => {
      const m = new TestComponentModel();
      await DataHelper.deleteEntities(m, m.componentsKind);
    });

    it('returns query result object', async () => {
      const result = await model.list(testId);
      assert.typeOf(result, 'object');
    });

    it('has pageToken', async () => {
      const result = await model.list(testId);
      assert.typeOf(result.pageToken, 'string');
    });

    it('has entities', async () => {
      const result = await model.list(testId);
      assert.typeOf(result.entities, 'array', 'entities is an array');
      assert.lengthOf(result.entities, 25, 'has 25 entities');
    });

    it('respects the limit', async () => {
      const result = await model.list(testId, {
        limit: 5,
      });
      assert.lengthOf(result.entities, 5, 'has 5 entities');
    });

    it('respects the pageToken', async () => {
      const result1 = await model.list(testId, {
        limit: 15,
      });
      const result2 = await model.list(testId, {
        limit: 100,
        pageToken: result1.pageToken,
      });
      assert.lengthOf(result2.entities, 10, 'has the rest of entities');
    });
  });

  describe('clearResult()', () => {
    const testId = 'test123';
    let model = /** @type TestComponentModel */ (null);
    beforeEach(async () => {
      model = new TestComponentModel();
      await DataHelper.populateComponentTestReports(model, testId);
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.componentsKind);
    });

    it('removes components from a test run', async () => {
      await model.clearResult(testId);
      const result = await model.list(testId);
      assert.lengthOf(result.entities, 0);
    });
  });
});
