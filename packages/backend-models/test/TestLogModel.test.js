import Emulator from 'google-datastore-emulator';
import { assert } from 'chai';
import { TestLogModel } from '../index.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('../src/TestLogModel').TestLogEntity} TestLogEntity */
/** @typedef {import('../src/TestReport').TestBrowserResult} TestBrowserResult */

describe('TestLogModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  /**
   * @param {TestLogModel} model
   * @param {string} id
   * @param {string} cmp
   * @param {string} bid
   * @return {Promise<TestLogEntity>}
   */
  async function getEntry(model, id, cmp, bid) {
    const key = model.createTestLogKey(id, cmp, bid);
    const [result] = await model.store.get(key);
    return model.fromDatastore(result);
  }

  describe('_makeBrowserId()', () => {
    let model = /** @type TestLogModel */ (null);
    beforeEach(() => {
      model = new TestLogModel();
    });

    it('generates browser id', () => {
      const browser = DataHelper.generateTestBrowserResult();
      const result = model._makeBrowserId(browser);
      assert.match(result, /^\w+-\w+$/);
    });
  });

  describe('addLogs()', () => {
    const testId = 'test123';
    let model = /** @type TestLogModel */ (null);
    beforeEach(() => {
      model = new TestLogModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.testLogsKind);
    });

    it('adds logs to the store', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport().results;
      await model.addLogs(testId, component, raports);
      const log1 = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.typeOf(log1, 'object');
      const log2 = await getEntry(model, testId, component, model._makeBrowserId(raports[1]));
      assert.typeOf(log2, 'object');
    });

    it('adds the "browser" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.equal(log.browser, raports[0].browser);
    });

    it('adds the "endTime" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.equal(log.endTime, raports[0].endTime);
    });

    it('adds the "startTime" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.equal(log.startTime, raports[0].startTime);
    });

    it('adds the "total" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.equal(log.total, raports[0].total);
    });

    it('adds the "success" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.equal(log.success, raports[0].success);
    });

    it('adds the "failed" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.equal(log.failed, raports[0].failed);
    });

    it('adds the "skipped" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.equal(log.skipped, raports[0].skipped);
    });

    it('adds the "error" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.equal(log.error, raports[0].error);
    });

    it('adds the "message" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.typeOf(log.message, 'string');
      assert.equal(log.message, raports[0].message);
    });

    it('ignores the "message" property when not set', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      delete raports[0].message;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.isUndefined(log.message);
    });

    it('adds the "logs" property', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.typeOf(log.logs, 'string');
      assert.equal(log.logs, raports[0].logs);
    });

    it('ignores the "logs" property when not set', async () => {
      const component = DataHelper.generatePackageName();
      const raports = DataHelper.generateTestReport(1).results;
      delete raports[0].logs;
      await model.addLogs(testId, component, raports);
      const log = await getEntry(model, testId, component, model._makeBrowserId(raports[0]));
      assert.isUndefined(log.logs);
    });
  });

  describe('list()', () => {
    const testId = 'test123';
    const component = DataHelper.generatePackageName();

    before(async () => {
      const m = new TestLogModel();
      const result = await m.list(testId, component);
      assert.lengthOf(result.entities, 0);
      const raports = DataHelper.generateTestReport(30).results;
      await m.addLogs(testId, component, raports);
    });

    after(async () => {
      const m = new TestLogModel();
      await DataHelper.deleteEntities(m, m.testLogsKind);
    });

    let model = /** @type TestLogModel */ (null);
    beforeEach(() => {
      model = new TestLogModel();
    });

    it('returns query result', async () => {
      const result = await model.list(testId, component);
      assert.typeOf(result, 'object', 'result is an object');
      assert.typeOf(result.pageToken, 'string', 'has page token');
      assert.typeOf(result.entities, 'array', 'has entities');
    });

    it('returns default amount of entities', async () => {
      const result = await model.list(testId, component);
      assert.lengthOf(result.entities, 25, 'has 25 entities');
    });

    it('respects the limit', async () => {
      const result = await model.list(testId, component, {
        limit: 10,
      });
      assert.lengthOf(result.entities, 10, 'has 10 entities');
    });

    it('respects the page token', async () => {
      const result1 = await model.list(testId, component, {
        limit: 10,
      });
      const result2 = await model.list(testId, component, {
        limit: 100,
        pageToken: result1.pageToken,
      });
      assert.lengthOf(result2.entities, 20, 'has the remaining entities');
    });
  });

  describe('get()', () => {
    const testId = 'test123';
    const component = DataHelper.generatePackageName();
    let raports = /** @type TestBrowserResult[] */ (null);

    before(async () => {
      const m = new TestLogModel();
      const result = await m.list(testId, component);
      assert.lengthOf(result.entities, 0);
      raports = DataHelper.generateTestReport(2).results;
      await m.addLogs(testId, component, raports);
    });

    after(async () => {
      const m = new TestLogModel();
      await DataHelper.deleteEntities(m, m.testLogsKind);
    });

    let model = /** @type TestLogModel */ (null);
    beforeEach(() => {
      model = new TestLogModel();
    });

    it('returns an entity', async () => {
      const logId = model._makeBrowserId(raports[0]);
      const result = await model.get(testId, component, logId);
      assert.typeOf(result, 'object', 'has the result');
      assert.typeOf(result.id, 'string', 'has translated id');
    });

    it('returns null when not found', async () => {
      const result = await model.get(testId, component, 'non-existing');
      assert.equal(result, null);
    });
  });

  describe('clearLogs()', () => {
    const testId = 'test123';
    const component = DataHelper.generatePackageName();
    let raports = /** @type TestBrowserResult[] */ (null);

    before(async () => {
      const m = new TestLogModel();
      const result = await m.list(testId, component);
      assert.lengthOf(result.entities, 0);
      raports = DataHelper.generateTestReport(20).results;
      await m.addLogs(testId, component, raports);
      const result2 = await m.list(testId, component);
      assert.lengthOf(result2.entities, 20);
    });

    after(async () => {
      const m = new TestLogModel();
      await DataHelper.deleteEntities(m, m.testLogsKind);
    });

    let model = /** @type TestLogModel */ (null);
    beforeEach(() => {
      model = new TestLogModel();
    });

    it('removes all logs', async () => {
      await model.clearLogs(testId);
      const result = await model.list(testId, component);
      assert.lengthOf(result.entities, 0);
    });
  });
});
