import Emulator from 'google-datastore-emulator';
import pkg from 'chai';
const { assert } = pkg;
import { ComponentModel } from '../src/ComponentModel.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('../src/ComponentBuildModel').EditableComponentBuildEntity} EditableComponentBuildEntity */
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
      'version', 'versions[]', 'group', 'org', 'pkg', 'ref', 'scope',
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
      'name', 'version', 'docs', 'changelog',
    ]
    .forEach((name) => {
      it(`has ${name}`, () => {
        const result = model.versionExcludeIndexes;
        assert.include(result, name);
      });
    });
  });

  describe('createGroupKey()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    it('creates a key', () => {
      const result = model.createGroupKey('a name');
      assert.typeOf(result, 'object');
    });

    it('has the namespace', () => {
      const result = model.createGroupKey('a name');
      assert.equal(result.namespace, model.namespace);
    });

    it('has the name', () => {
      const result = model.createGroupKey('a name');
      assert.equal(result.name, 'a-name');
    });

    it('has the kind', () => {
      const result = model.createGroupKey('a name');
      assert.equal(result.kind, model.groupsKind);
    });
  });

  describe('createComponentKey()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    it('creates a key', () => {
      const result = model.createComponentKey('group', 'name');
      assert.typeOf(result, 'object');
    });

    it('has the namespace', () => {
      const result = model.createComponentKey('group', 'name');
      assert.equal(result.namespace, model.namespace);
    });

    it('has the name', () => {
      const result = model.createComponentKey('group', 'a name');
      assert.equal(result.name, 'a-name');
    });

    it('has the kind', () => {
      const result = model.createComponentKey('group', 'name');
      assert.equal(result.kind, model.componentsKind);
    });

    it('has the parent', () => {
      const result = model.createComponentKey('group', 'name');
      assert.typeOf(result.parent, 'object');
    });

    it('has the parent with group kind', () => {
      const result = model.createComponentKey('group', 'name');
      assert.equal(result.parent.kind, model.groupsKind);
    });

    it('has the parent with name', () => {
      const result = model.createComponentKey('a group', 'name');
      assert.equal(result.parent.name, 'a-group');
    });
  });

  describe('createVersionKey()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    it('creates a key', () => {
      const result = model.createVersionKey('group', 'name', '1.0.0');
      assert.typeOf(result, 'object');
    });

    it('has the namespace', () => {
      const result = model.createVersionKey('group', 'name', '1.0.0');
      assert.equal(result.namespace, model.namespace);
    });

    it('has the name', () => {
      const result = model.createVersionKey('group', 'a name', '1.0.0');
      assert.equal(result.name, '1.0.0');
    });

    it('has the kind', () => {
      const result = model.createVersionKey('group', 'name', '1.0.0');
      assert.equal(result.kind, model.versionsKind);
    });

    it('has the parent', () => {
      const result = model.createVersionKey('group', 'name', '1.0.0');
      assert.typeOf(result.parent, 'object');
    });

    it('has the parent with group kind', () => {
      const result = model.createVersionKey('group', 'name', '1.0.0');
      assert.equal(result.parent.kind, model.componentsKind);
    });

    it('has the parent with name', () => {
      const result = model.createVersionKey('group', 'a name', '1.0.0');
      assert.equal(result.parent.name, 'a-name');
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

  describe('createGroup()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(() => {
      model = new ComponentModel();
    });

    after(async () => {
      const inst = new ComponentModel();
      await DataHelper.deleteEntities(inst, inst.groupsKind);
    });

    it('returns created entity', async () => {
      const name = 'my group';
      const key = model.createGroupKey(name);
      const result = await model.createGroup(name, key);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, name, 'has name');
      assert.equal(result.id, 'my-group', 'has id');
    });
  });

  describe('getGroup()', () => {
    let model = /** @type ComponentModel */ (null);
    const name = 'test name';
    beforeEach(async () => {
      model = new ComponentModel();
      await DataHelper.insertComponentGroup(model, name);
    });

    afterEach(async () => {
      const inst = new ComponentModel();
      await DataHelper.deleteEntities(inst, inst.groupsKind);
    });

    it('returns created entity', async () => {
      const result = await model.getGroup(name);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, name, name);
    });

    it('returns null when no entity', async () => {
      const result = await model.getGroup('none123');
      assert.equal(result, null);
    });
  });

  describe('ensureGroup()', () => {
    let model = /** @type ComponentModel */ (null);
    const name = 'test name';
    beforeEach(async () => {
      model = new ComponentModel();
      await DataHelper.insertComponentGroup(model, name);
    });

    afterEach(async () => {
      const inst = new ComponentModel();
      await DataHelper.deleteEntities(inst, inst.groupsKind);
    });

    it('returns existing entity', async () => {
      const result = await model.ensureGroup(name);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, name);
    });

    it('returns new entity', async () => {
      const newName = 'other name';
      const result = await model.ensureGroup(newName);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, newName);
    });
  });

  describe('createComponent()', () => {
    let model = /** @type ComponentModel */ (null);
    const groupName = 'group name';
    const name = 'test component';
    beforeEach(async () => {
      model = new ComponentModel();
      const key = model.createGroupKey(groupName);
      await model.createGroup(groupName, key);
    });

    afterEach(async () => {
      await DataHelper.deleteEntities(model, model.groupsKind);
    });

    it('returns created entity', async () => {
      const key = model.createComponentKey(groupName, name);
      const result = await model.createComponent(name, '0.1.0', groupName, 'a', 'b', key);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, name, 'has name');
      assert.equal(result.id, 'test-component', 'has id');
    });

    it('adds version', async () => {
      const key = model.createComponentKey(groupName, name);
      const result = await model.createComponent(name, '0.1.0', groupName, 'a', 'b', key);
      assert.equal(result.version, '0.1.0');
    });

    it('adds versions', async () => {
      const key = model.createComponentKey(groupName, name);
      const result = await model.createComponent(name, '0.1.0', groupName, 'a', 'b', key);
      assert.deepEqual(result.versions, ['0.1.0']);
    });

    it('adds group', async () => {
      const key = model.createComponentKey(groupName, name);
      const result = await model.createComponent(name, '0.1.0', groupName, 'a', 'b', key);
      assert.deepEqual(result.group, groupName);
    });

    it('adds pkg', async () => {
      const key = model.createComponentKey(groupName, name);
      const result = await model.createComponent(name, '0.1.0', groupName, 'a', 'b', key);
      assert.deepEqual(result.pkg, 'a');
    });

    it('adds org', async () => {
      const key = model.createComponentKey(groupName, name);
      const result = await model.createComponent(name, '0.1.0', groupName, 'a', 'b', key);
      assert.deepEqual(result.org, 'b');
    });
  });

  describe('getComponent()', () => {
    let model = /** @type ComponentModel */ (null);
    let created;
    beforeEach(async () => {
      model = new ComponentModel();
      created = await DataHelper.insertComponent(model, {});
    });

    afterEach(async () => {
      const inst = new ComponentModel();
      await DataHelper.deleteEntities(inst, inst.groupsKind);
    });

    it('returns created entity', async () => {
      const result = await model.getComponent(created.group, created.name);
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, created.name);
    });

    it('returns null when no entity', async () => {
      const result = await model.getComponent(created.group, 'none123');
      assert.equal(result, null);
    });

    it('returns null when no group', async () => {
      const result = await model.getComponent('none123', created.name);
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
      await DataHelper.deleteEntities(inst, inst.groupsKind);
    });

    it('returns existing entity', async () => {
      const result = await model.ensureComponent(
        created.version, created.name, created.group, created.pkg, created.org,
      );
      assert.typeOf(result, 'object', 'entity is an object');
      assert.equal(result.name, created.name);
    });

    it('returns new entity', async () => {
      const newName = 'other name';
      const result = await model.ensureComponent('1.2.3', newName, created.group, created.pkg, created.org);
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
      await DataHelper.deleteEntities(model, model.groupsKind);
    });

    it('creates a group', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const result = await model.getGroup(version.group);
      assert.typeOf(result, 'object');
    });

    it('creates a componrnt', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const result = await model.getComponent(version.group, version.component);
      assert.typeOf(result, 'object');
    });

    it('creates a version', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const result = await model.getVersion(version.group, version.component, version.version);
      assert.typeOf(result, 'object');
    });
  });

  describe('ensureVersion()', () => {
    let model = /** @type ComponentModel */ (null);
    beforeEach(async () => {
      model = new ComponentModel();
    });

    afterEach(async () => {
      await DataHelper.deleteEntities(model, model.groupsKind);
    });

    it('updates version that already exists', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const parent = await model.getComponent(version.group, version.component);
      await model.ensureVersion(parent, version.version, version.component, version.group, { test: true });
      const result = await model.getVersion(version.group, version.component, version.version);
      assert.equal(result.docs, '{"test":true}');
    });

    it('creates a new version', async () => {
      const newVersion = '1.2.3';
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const oldVersion = await model.getVersion(version.group, version.component, version.version);
      const parent = await model.getComponent(version.group, version.component);
      await model.ensureVersion(parent, newVersion, version.component, version.group, { test: true });
      const result = await model.getVersion(version.group, version.component, newVersion);
      assert.notEqual(result.id, oldVersion.id);
    });

    it('adds "created"', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const parent = await model.getComponent(version.group, version.component);
      await model.ensureVersion(parent, version.version, version.component, version.group, { test: true });
      const result = await model.getVersion(version.group, version.component, version.version);
      assert.typeOf(result.created, 'number');
    });

    it('adds "docs"', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.addVersion(version);
      const parent = await model.getComponent(version.group, version.component);
      await model.ensureVersion(parent, version.version, version.component, version.group, { test: false });
      const result = await model.getVersion(version.group, version.component, version.version);
      assert.equal(result.docs, '{"test":false}');
    });

    it('adds parents "tags"', async () => {
      const version = DataHelper.generateComponentVersion();
      const tags = ['a', 'b', 'c'];
      await model.ensureComponent(
        version.version, version.component, version.group, version.pkg, version.org, { tags },
      );
      const parent = await model.getComponent(version.group, version.component);
      await model.ensureVersion(parent, version.version, version.component, version.group, { test: false });
      const result = await model.getVersion(version.group, version.component, version.version);
      assert.deepEqual(result.tags, tags);
    });

    it('removes "tags" when recreating a version', async () => {
      const version = DataHelper.generateComponentVersion();
      const tags = ['a', 'b', 'c'];
      await model.ensureComponent(
        version.version, version.component, version.group, version.pkg, version.org, { tags },
      );
      const parent = await model.getComponent(version.group, version.component);
      await model.ensureVersion(parent, version.version, version.component, version.group, { test: false });
      delete parent.tags;
      await model.ensureVersion(parent, version.version, version.component, version.group, { test: false });
      const result = await model.getVersion(version.group, version.component, version.version);
      assert.isUndefined(result.tags);
    });

    it('adds "changelog"', async () => {
      const version = DataHelper.generateComponentVersion();
      await model.ensureComponent(version.version, version.component, version.group, version.pkg, version.org);
      const parent = await model.getComponent(version.group, version.component);
      await model.ensureVersion(parent, version.version, version.component, version.group, { }, 'change');
      const result = await model.getVersion(version.group, version.component, version.version);
      assert.deepEqual(result.changelog, 'change');
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
      await DataHelper.deleteEntities(inst, inst.groupsKind);
    });

    it('adds a new version information to the component', async () => {
      const { key, group, name: component, version } = created;
      const cmp = await model.getComponent(group, component);
      const result = await model.addComponentVersion(cmp, '10.1.10', key);
      assert.deepEqual(result.versions, [version, '10.1.10'], 'adds version to the list of version');
      assert.equal(result.version, '10.1.10', 'updates the version');
    });

    it('adds a new pre-release version information to the component', async () => {
      const { key, group, name: component, version } = created;
      const cmp = await model.getComponent(group, component);
      const result = await model.addComponentVersion(cmp, '10.1.10-beta', key);
      assert.deepEqual(result.versions, [version, '10.1.10-beta'], 'adds version to the list of version');
      assert.equal(result.version, version, 'keeps old stable version version');
    });

    it('adds tags to the component', async () => {
      const { key, group, name: component } = created;
      const cmp = await model.getComponent(group, component);
      const tags = ['a', 'b', 'c'];
      const result = await model.addComponentVersion(cmp, '10.1.10', key, { tags });
      assert.deepEqual(result.tags, tags);
    });

    it('keeps tags when set', async () => {
      const { key, group, name: component } = created;
      const cmp = await model.getComponent(group, component);
      const tags = ['a', 'b', 'c'];
      const cmp2 = await model.addComponentVersion(cmp, '10.1.10', key, { tags });
      const result = await model.addComponentVersion(cmp2, '10.1.11', key, { keepTags: true });
      assert.deepEqual(result.tags, tags);
    });

    it('removes tags when removed from the parent', async () => {
      const { key, group, name: component } = created;
      const cmp = await model.getComponent(group, component);
      const tags = ['a', 'b', 'c'];
      const cmp2 = await model.addComponentVersion(cmp, '10.1.10', key, { tags });
      const result = await model.addComponentVersion(cmp2, '10.1.11', key);
      assert.isUndefined(result.tags);
    });
  });
});
