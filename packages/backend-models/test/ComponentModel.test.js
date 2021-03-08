import Emulator from 'google-datastore-emulator';
import pkg from 'chai';
const { assert } = pkg;
import { ComponentModel } from '../src/ComponentModel.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('./DataHelper').ComponentInsertResult} ComponentInsertResult */

describe('ComponentModel', () => {
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
      const model = new ComponentModel();
      assert.equal(model.namespace, 'api-components');
    });
  });

  describe('#componentExcludeIndexes', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    it('is an array', () => {
      const result = model.componentExcludeIndexes;
      assert.typeOf(result, 'array');
    });

    [
      'version', 'versions[]', 'name', 'org', 'npmName', 'ref',
    ]
    .forEach((name) => {
      it(`has ${name}`, () => {
        const result = model.componentExcludeIndexes;
        assert.include(result, name);
      });
    });
  });

  describe('#versionExcludeIndexes', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    it('is an array', () => {
      const result = model.versionExcludeIndexes;
      assert.typeOf(result, 'array');
    });

    [
      'npmName', 'version',
    ]
    .forEach((name) => {
      it(`has ${name}`, () => {
        const result = model.versionExcludeIndexes;
        assert.include(result, name);
      });
    });
  });

  describe('createComponentKey()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    it('creates a key', () => {
      const result = model.createComponentKey('repo/name');
      assert.typeOf(result, 'object');
    });

    it('has the namespace', () => {
      const result = model.createComponentKey('repo/name');
      assert.equal(result.namespace, model.namespace);
    });

    it('has the name', () => {
      const result = model.createComponentKey('repo/name');
      assert.equal(result.name, 'reponame');
    });

    it('has the kind', () => {
      const result = model.createComponentKey('repo/name');
      assert.equal(result.kind, model.componentsKind);
    });
  });

  describe('createVersionKey()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    it('creates a key', () => {
      const result = model.createVersionKey('repo/name', '1.0.0');
      assert.typeOf(result, 'object');
    });

    it('has the namespace', () => {
      const result = model.createVersionKey('repo/name', '1.0.0');
      assert.equal(result.namespace, model.namespace);
    });

    it('has the name', () => {
      const result = model.createVersionKey('repo/name', '1.0.0');
      assert.equal(result.name, '1.0.0');
    });

    it('has the kind', () => {
      const result = model.createVersionKey('repo/name', '1.0.0');
      assert.equal(result.kind, model.versionsKind);
    });

    it('has the parent', () => {
      const result = model.createVersionKey('repo/name', '1.0.0');
      assert.typeOf(result.parent, 'object');
    });

    it('has the parent with kind', () => {
      const result = model.createVersionKey('repo/name', '1.0.0');
      assert.equal(result.parent.kind, model.componentsKind);
    });

    it('has the parent with name', () => {
      const result = model.createVersionKey('repo/name', '1.0.0');
      assert.equal(result.parent.name, 'reponame');
    });
  });

  describe('findLatestVersion()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    it('returns undefined when no argument', () => {
      const result = model.findLatestVersion(undefined);
      assert.isUndefined(result);
    });

    it('returns undefined when empty argument', () => {
      const result = model.findLatestVersion([]);
      assert.isUndefined(result);
    });

    it('returns the only version', () => {
      const result = model.findLatestVersion(['1.0.0']);
      assert.equal(result, '1.0.0');
    });

    it('returns the highest in order', () => {
      const result = model.findLatestVersion(['1.0.0', '1.0.1']);
      assert.equal(result, '1.0.1');
    });

    it('returns the highest not in order', () => {
      const result = model.findLatestVersion(['1.0.0', '1.1.0', '1.0.1']);
      assert.equal(result, '1.1.0');
    });

    it('returns the highest with major change', () => {
      const result = model.findLatestVersion(['1.0.0', '2.1.0', '5.0.1']);
      assert.equal(result, '5.0.1');
    });

    it('ignores pre release versions', () => {
      const result = model.findLatestVersion(['1.0.0', '2.1.0', '5.0.0-beta']);
      assert.equal(result, '2.1.0');
    });
  });

  describe('createComponent()', () => {
    let model = /** @type ComponentModel */ (null);
    const npmName = '@advanced-rest-client/test component';
    const name = 'test component';
    const org = 'advanced-rest-client';

    beforeEach(async () => {
      model = new ComponentModel();
    });

    afterEach(async () => {
      await DataHelper.deleteEntities(model, model.componentsKind);
    });

    it('returns created entity', async () => {
      const key = model.createComponentKey(npmName);
      const result = await model.createComponent(name, org, npmName, '0.1.0', key);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, 'test component', 'has name');
      assert.equal(result.id, 'advanced-rest-clienttest-component', 'has id');
    });

    it('adds version', async () => {
      const key = model.createComponentKey(npmName);
      const result = await model.createComponent(name, org, npmName, '0.1.0', key);
      assert.equal(result.version, '0.1.0');
    });

    it('adds versions', async () => {
      const key = model.createComponentKey(npmName);
      const result = await model.createComponent(name, org, npmName, '0.1.0', key);
      assert.deepEqual(result.versions, ['0.1.0']);
    });

    it('adds name', async () => {
      const key = model.createComponentKey(npmName);
      const result = await model.createComponent(name, org, npmName, '0.1.0', key);
      assert.deepEqual(result.name, name);
    });

    it('adds org', async () => {
      const key = model.createComponentKey(npmName);
      const result = await model.createComponent(name, org, npmName, '0.1.0', key);
      assert.deepEqual(result.org, org);
    });

    it('adds npmName', async () => {
      const key = model.createComponentKey(npmName);
      const result = await model.createComponent(name, org, npmName, '0.1.0', key);
      assert.deepEqual(result.npmName, npmName);
    });
  });

  describe('getComponent()', () => {
    let model = /** @type ComponentModel */ (null);
    let created = /** @type ComponentInsertResult */ (null);
    beforeEach(async () => {
      model = new ComponentModel();
      created = await DataHelper.insertComponent(model, {});
    });

    afterEach(async () => {
      const inst = new ComponentModel();
      await DataHelper.deleteEntities(inst, inst.componentsKind);
    });

    it('returns created entity', async () => {
      const result = await model.getComponent(created.npmName);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, created.name);
    });

    it('returns null when no entity', async () => {
      const result = await model.getComponent('none123');
      assert.equal(result, null);
    });
  });

  describe('ensureComponent()', () => {
    let model = /** @type ComponentModel */ (null);
    let created = /** @type ComponentInsertResult */ (null);
    beforeEach(async () => {
      model = new ComponentModel();
      created = await DataHelper.insertComponent(model, {});
    });

    afterEach(async () => {
      const inst = new ComponentModel();
      await DataHelper.deleteEntities(inst, inst.componentsKind);
    });

    it('returns existing entity', async () => {
      const result = await model.ensureComponent(
        created.version, created.name, created.org, created.npmName,
      );
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, created.name);
    });

    it('returns new entity', async () => {
      const newName = 'other name';
      const result = await model.ensureComponent('1.2.3', newName, created.org, `@other/package`);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, newName);
    });
  });

  describe('addVersion()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(async () => {
      model = new ComponentModel();
    });

    afterEach(async () => {
      await DataHelper.deleteEntities(model, model.componentsKind);
    });

    it('creates a component', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const result = await model.getComponent(version.npmName);
      assert.typeOf(result, 'object');
    });

    it('creates a version', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const result = await model.getVersion(version.npmName, version.version);
      assert.typeOf(result, 'object');
    });
  });

  describe('ensureVersion()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(async () => {
      model = new ComponentModel();
    });

    afterEach(async () => {
      await DataHelper.deleteEntities(model, model.componentsKind);
    });

    it('updates version that already exists', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const parent = await model.getComponent(version.npmName);
      await model.ensureVersion(parent, version.version, version.npmName);
      const result = await model.getVersion(version.npmName, version.version);
      assert.equal(result.version, version.version);
    });

    it('creates a new version', async () => {
      const newVersion = '1.2.3';
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const oldVersion = await model.getVersion(version.npmName, version.version);
      const parent = await model.getComponent(version.npmName);
      await model.ensureVersion(parent, newVersion, version.npmName);
      const result = await model.getVersion(version.npmName, newVersion);
      assert.notEqual(result.id, oldVersion.id);
    });

    it('adds "created"', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const parent = await model.getComponent(version.npmName);
      await model.ensureVersion(parent, version.version, version.npmName);
      const result = await model.getVersion(version.npmName, version.version);
      assert.typeOf(result.created, 'number');
    });

    it('adds parents "tags"', async () => {
      const version = DataHelper.generateComponentVersion();
      const tags = ['a', 'b', 'c'];
      await model.ensureComponent(
        version.version, version.name, version.org, version.npmName, { tags },
      );
      const parent = await model.getComponent(version.npmName);
      await model.ensureVersion(parent, version.version, version.npmName);
      const result = await model.getVersion(version.npmName, version.version);
      assert.deepEqual(result.tags, tags);
    });

    it('removes "tags" when recreating a version', async () => {
      const version = DataHelper.generateComponentVersion();
      const tags = ['a', 'b', 'c'];
      await model.ensureComponent(
        version.version, version.name, version.org, version.npmName, { tags },
      );
      const parent = await model.getComponent(version.npmName);
      await model.ensureVersion(parent, version.version, version.npmName);
      delete parent.tags;
      await model.ensureVersion(parent, version.version, version.npmName);
      const result = await model.getVersion(version.npmName, version.version);
      assert.isUndefined(result.tags);
    });
  });

  describe('addComponentVersion()', () => {
    let model = /** @type ComponentModel */ (null);
    let created = /** @type ComponentInsertResult */ (null);
    beforeEach(async () => {
      model = new ComponentModel();
      created = await DataHelper.insertComponent(model, {});
    });

    afterEach(async () => {
      const inst = new ComponentModel();
      await DataHelper.deleteEntities(inst, inst.componentsKind);
    });

    it('adds a new version information to the component', async () => {
      const { key, npmName, version } = created;
      const cmp = await model.getComponent(npmName);
      const result = await model.addComponentVersion(cmp, '10.1.10', key);
      assert.deepEqual(result.versions, [version, '10.1.10'], 'adds version to the list of version');
      assert.equal(result.version, '10.1.10', 'updates the version');
    });

    it('adds a new pre-release version information to the component', async () => {
      const { key, npmName, version } = created;
      const cmp = await model.getComponent(npmName);
      const result = await model.addComponentVersion(cmp, '10.1.10-beta', key);
      assert.deepEqual(result.versions, [version, '10.1.10-beta'], 'adds version to the list of version');
      assert.equal(result.version, version, 'keeps old stable version version');
    });

    it('adds tags to the component', async () => {
      const { key, npmName } = created;
      const cmp = await model.getComponent(npmName);
      const tags = ['a', 'b', 'c'];
      const result = await model.addComponentVersion(cmp, '10.1.10', key, { tags });
      assert.deepEqual(result.tags, tags);
    });

    it('keeps tags when set', async () => {
      const { key, npmName } = created;
      const cmp = await model.getComponent(npmName);
      const tags = ['a', 'b', 'c'];
      const cmp2 = await model.addComponentVersion(cmp, '10.1.10', key, { tags });
      const result = await model.addComponentVersion(cmp2, '10.1.11', key, { keepTags: true });
      assert.deepEqual(result.tags, tags);
    });

    it('removes tags when removed from the parent', async () => {
      const { key, npmName } = created;
      const cmp = await model.getComponent(npmName);
      const tags = ['a', 'b', 'c'];
      const cmp2 = await model.addComponentVersion(cmp, '10.1.10', key, { tags });
      const result = await model.addComponentVersion(cmp2, '10.1.11', key);
      assert.isUndefined(result.tags);
    });
  });
});
