import Emulator from 'google-datastore-emulator';
import { assert } from 'chai';
import { CoverageModel } from '../index.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('../src/ComponentBuildModel').EditableComponentBuildEntity} EditableComponentBuildEntity */
/** @typedef {import('./DataHelper').ComponentInsertResult} ComponentInsertResult */
/** @typedef {import('../src/CoverageModel').CoverageEntity} CoverageEntity */
/** @typedef {import('../src/CoverageModel').CoverageResult} CoverageResult */

describe('CoverageModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  describe('insert()', () => {
    let model = /** @type CoverageModel */ (null);
    beforeEach(() => {
      model = new CoverageModel();
    });

    afterEach(async () => {
      await DataHelper.deleteEntities(model, model.coverageRunKind);
    });

    const minimum = {
      component: 'my-component',
      org: 'arc',
      tag: 'v0.0.1',
    };
    Object.freeze(minimum);

    it('creates entity with the minimum values', async () => {
      const result = await model.insert(minimum);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.typeOf(result.id, 'string', 'has id');
      assert.equal(result.component, minimum.component, 'has component value');
      assert.equal(result.org, minimum.org, 'has org value');
      assert.equal(result.tag, minimum.tag, 'has tag value');
    });

    it('creates entity with all values', async () => {
      const branch = 'dev';
      const creator = {
        id: 'abcd',
        displayName: 'Pawel Psztyc',
      };
      const result = await model.insert({ ...minimum, branch, creator });
      assert.equal(result.branch, branch, 'has branch value');
      assert.deepEqual(result.creator, creator, 'has creator value');
    });

    it('add status value', async () => {
      const result = await model.insert(minimum);
      assert.equal(result.status, 'queued');
    });

    it('add created value', async () => {
      const result = await model.insert(minimum);
      assert.typeOf(result.created, 'number');
    });
  });

  describe('list()', () => {
    // let generated = /** @type CoverageEntity[] */ (null);
    before(async () => {
      const inst = new CoverageModel();
      const generated = await DataHelper.populateCoverageEntities(inst, 20);
      assert.lengthOf(generated, 20, 'generated 20 entities');
    });

    after(async () => {
      const inst = new CoverageModel();
      await DataHelper.deleteEntities(inst, inst.coverageRunKind);
    });

    let model = /** @type CoverageModel */ (null);
    beforeEach(() => {
      model = new CoverageModel();
    });

    it('returns all entities before reaching the limit', async () => {
      const result = await model.list();
      assert.lengthOf(result.entities, 20, 'has 20 entities');
      assert.typeOf(result.pageToken, 'string', 'has pageToken');
    });

    it('respects the limit', async () => {
      const result = await model.list({ limit: 5 });
      assert.lengthOf(result.entities, 5);
    });

    it('respects the page token', async () => {
      const result1 = await model.list({ limit: 5 });
      const result2 = await model.list({ pageToken: result1.pageToken });
      assert.lengthOf(result1.entities, 5, 'has original query limit');
      assert.lengthOf(result2.entities, 15, 'has the rest of the result');
    });

    it('returns empty result when no more results', async () => {
      const result1 = await model.list();
      const result2 = await model.list({ pageToken: result1.pageToken });
      assert.lengthOf(result2.entities, 0, 'has no entities');
    });
  });

  describe('get()', () => {
    let generated = /** @type CoverageEntity[] */ (null);
    before(async () => {
      const inst = new CoverageModel();
      generated = await DataHelper.populateCoverageEntities(inst, 5);
    });

    after(async () => {
      const inst = new CoverageModel();
      await DataHelper.deleteEntities(inst, inst.coverageRunKind);
    });

    let model = /** @type CoverageModel */ (null);
    beforeEach(() => {
      model = new CoverageModel();
    });

    it('returns a model entity', async () => {
      const [item] = generated;
      const id = item.id;
      const result = await model.get(id);
      assert.deepEqual(result, item);
    });

    it('returns null when not found', async () => {
      const result = await model.get('unknown');
      assert.equal(result, null);
    });
  });

  describe('start()', () => {
    after(async () => {
      const inst = new CoverageModel();
      await DataHelper.deleteEntities(inst, inst.coverageRunKind);
    });

    let model = /** @type CoverageModel */ (null);
    let generated = /** @type CoverageEntity */ (null);
    beforeEach(async () => {
      model = new CoverageModel();
      [generated] = await DataHelper.populateCoverageEntities(model, 1);
    });

    it('sets new status', async () => {
      await model.start(generated.id);
      const result = await model.get(generated.id);
      assert.equal(result.status, 'running');
    });

    it('sets new startTime', async () => {
      await model.start(generated.id);
      const result = await model.get(generated.id);
      assert.typeOf(result.startTime, 'number');
    });
  });

  describe('runError()', () => {
    after(async () => {
      const inst = new CoverageModel();
      await DataHelper.deleteEntities(inst, inst.coverageRunKind);
    });

    let model = /** @type CoverageModel */ (null);
    let generated = /** @type CoverageEntity */ (null);
    beforeEach(async () => {
      model = new CoverageModel();
      [generated] = await DataHelper.populateCoverageEntities(model, 1);
    });

    it('sets new status', async () => {
      await model.runError(generated.id, 'test');
      const result = await model.get(generated.id);
      assert.equal(result.status, 'finished');
    });

    it('sets new endTime', async () => {
      await model.runError(generated.id, 'test');
      const result = await model.get(generated.id);
      assert.typeOf(result.endTime, 'number');
    });

    it('sets error', async () => {
      await model.runError(generated.id, 'test');
      const result = await model.get(generated.id);
      assert.isTrue(result.error);
    });

    it('sets message', async () => {
      await model.runError(generated.id, 'test');
      const result = await model.get(generated.id);
      assert.equal(result.message, 'test');
    });
  });

  describe('finishRun()', () => {
    after(async () => {
      const inst = new CoverageModel();
      await DataHelper.deleteEntities(inst, inst.coverageRunKind);
    });

    let model = /** @type CoverageModel */ (null);
    let generated = /** @type CoverageEntity */ (null);
    let coverage = /** @type CoverageResult */ (null);
    beforeEach(async () => {
      model = new CoverageModel();
      [generated] = await DataHelper.populateCoverageEntities(model, 1);
      coverage = DataHelper.generateCoverageReport();
    });

    it('sets new status', async () => {
      await model.finishRun(generated.id, coverage);
      const result = await model.get(generated.id);
      assert.equal(result.status, 'finished');
    });

    it('sets new endTime', async () => {
      await model.finishRun(generated.id, coverage);
      const result = await model.get(generated.id);
      assert.typeOf(result.endTime, 'number');
    });

    it('sets coverage summary', async () => {
      await model.finishRun(generated.id, coverage);
      const result = await model.get(generated.id);
      assert.deepEqual(result.coverage, coverage.summary);
    });

    it('ignores summarys nullable values', async () => {
      coverage.summary.branches = null;
      coverage.summary.functions = null;
      coverage.summary.lines = null;
      await model.finishRun(generated.id, coverage);
      const result = await model.get(generated.id);
      assert.isUndefined(result.coverage.branches);
      assert.isUndefined(result.coverage.functions);
      assert.isUndefined(result.coverage.lines);
    });

    it('adds a file result', async () => {
      const { id } = generated;
      await model.finishRun(id, coverage);
      const files = await model.queryRunFiles(id);
      assert.lengthOf(files.entities, 1, 'has 1 entitity');
      const [inserted] = files.entities;
      const [gentd] = coverage.details;
      delete inserted.id;
      delete inserted.coverageId;
      assert.deepEqual(inserted, gentd, 'has data from the report');
    });

    it('adds all files result', async () => {
      const { id } = generated;
      coverage.details.push(DataHelper.generateCoverageReportDetails()[0]);
      await model.finishRun(id, coverage);
      const files = await model.queryRunFiles(id);
      assert.lengthOf(files.entities, 2, 'has 2 entities');
    });

    it('adds component coverage info', async () => {
      await model.finishRun(generated.id, coverage);
      const { org, component, tag } = generated;
      const result = await model.getComponentCoverage(org, component);
      assert.equal(result.version, tag, 'has version number');
      assert.equal(result.coverageId, generated.id, 'has coverageId id');
      assert.deepEqual(result.coverage, coverage.summary, 'has coverage id');
    });

    it('adds component version coverage info', async () => {
      await model.finishRun(generated.id, coverage);
      const { org, component, tag } = generated;
      const result = await model.getVersionCoverage(org, component, tag);
      assert.equal(result.version, tag, 'has version number');
      assert.equal(result.coverageId, generated.id, 'has coverageId id');
      assert.deepEqual(result.coverage, coverage.summary, 'has coverage id');
    });
  });

  describe('queryRunFiles()', () => {
    let generated = /** @type CoverageEntity */ (null);
    let coverage = /** @type CoverageResult */ (null);
    before(async () => {
      const inst = new CoverageModel();
      [generated] = await DataHelper.populateCoverageEntities(inst, 1);
      coverage = DataHelper.generateCoverageReport(20);
      await inst.finishRun(generated.id, coverage);
    });

    after(async () => {
      const inst = new CoverageModel();
      await DataHelper.deleteEntities(inst, inst.coverageRunKind);
    });

    let model = /** @type CoverageModel */ (null);
    beforeEach(async () => {
      model = new CoverageModel();
    });

    it('returns all entities before reaching the limit', async () => {
      const result = await model.queryRunFiles(generated.id);
      assert.lengthOf(result.entities, 20, 'has 20 entities');
      assert.typeOf(result.pageToken, 'string', 'has pageToken');
    });

    it('respects the limit', async () => {
      const result = await model.queryRunFiles(generated.id, { limit: 5 });
      assert.lengthOf(result.entities, 5);
    });

    it('respects the page token', async () => {
      const result1 = await model.queryRunFiles(generated.id, { limit: 5 });
      const result2 = await model.queryRunFiles(generated.id, { pageToken: result1.pageToken });
      assert.lengthOf(result1.entities, 5, 'has original query limit');
      assert.lengthOf(result2.entities, 15, 'has the rest of the result');
    });

    it('returns empty result when no more results', async () => {
      const result1 = await model.queryRunFiles(generated.id);
      const result2 = await model.queryRunFiles(generated.id, { pageToken: result1.pageToken });
      assert.lengthOf(result2.entities, 0, 'has no entities');
    });
  });

  describe('getVersionCoverage()', () => {
    after(async () => {
      const inst = new CoverageModel();
      await DataHelper.deleteEntities(inst, inst.coverageRunKind);
    });

    let model = /** @type CoverageModel */ (null);
    let generated = /** @type CoverageEntity */ (null);
    let coverage = /** @type CoverageResult */ (null);
    beforeEach(async () => {
      model = new CoverageModel();
      [generated] = await DataHelper.populateCoverageEntities(model, 1);
      coverage = DataHelper.generateCoverageReport();
      await model.finishRun(generated.id, coverage);
    });

    it('returns component version coverage', async () => {
      const { org, component, tag } = generated;
      const result = await model.getVersionCoverage(org, component, tag);
      assert.equal(result.version, tag, 'has version number');
      assert.equal(result.coverageId, generated.id, 'has coverageId id');
      assert.deepEqual(result.coverage, coverage.summary, 'has coverage id');
    });

    it('returns null when not found', async () => {
      const { org, component } = generated;
      const result = await model.getVersionCoverage(org, component, 'no-tag');
      assert.equal(result, null);
    });
  });

  describe('getComponentCoverage()', () => {
    after(async () => {
      const inst = new CoverageModel();
      await DataHelper.deleteEntities(inst, inst.coverageRunKind);
    });

    let model = /** @type CoverageModel */ (null);
    let generated = /** @type CoverageEntity */ (null);
    let coverage = /** @type CoverageResult */ (null);
    beforeEach(async () => {
      model = new CoverageModel();
      [generated] = await DataHelper.populateCoverageEntities(model, 1);
      coverage = DataHelper.generateCoverageReport();
      await model.finishRun(generated.id, coverage);
    });

    it('returns component coverage', async () => {
      const { org, component, tag } = generated;
      const result = await model.getComponentCoverage(org, component);
      assert.equal(result.version, tag, 'has version number');
      assert.equal(result.coverageId, generated.id, 'has coverageId id');
      assert.deepEqual(result.coverage, coverage.summary, 'has coverage id');
    });

    it('returns null when not found', async () => {
      const { org } = generated;
      const result = await model.getComponentCoverage(org, 'no-component');
      assert.equal(result, null);
    });
  });
});
