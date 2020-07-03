import Emulator from 'google-datastore-emulator';
import { assert } from 'chai';
import { DependencyModel } from '../index.js';
import DataHelper from './DataHelper.js';

/** @typedef {import('../src/DependencyModel').DependencyEntity} DependencyEntity */

describe('DependencyModel', () => {
  process.env.GCLOUD_PROJECT = 'advancedrestclient-1155';
  let emulator;
  before(async () => {
    const options = {};
    emulator = new Emulator(options);
    return emulator.start();
  });

  after(() => emulator.stop());

  describe('set()', () => {
    let model = /** @type DependencyModel */ (null);
    beforeEach(() => {
      model = new DependencyModel();
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.dependencyKind);
    });

    /**
     * @param {string} cmp
     * @return {Promise<DependencyEntity>}
     */
    async function getEntry(cmp) {
      const key = model._createKey(cmp);
      const [result] = await model.store.get(key);
      return model.fromDatastore(result);
    }

    it('adds an entry to the data store', async () => {
      const entry = DataHelper.generateDependencyEntry();
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.typeOf(result, 'object');
    });

    it('adds "org" property', async () => {
      const entry = DataHelper.generateDependencyEntry();
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.equal(result.org, entry.org);
    });

    it('adds "pkg" property', async () => {
      const entry = DataHelper.generateDependencyEntry();
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.equal(result.pkg, entry.pkg);
    });

    it('adds "name" property', async () => {
      const entry = DataHelper.generateDependencyEntry();
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.equal(result.name, entry.name);
    });

    it('adds "dependencies" property', async () => {
      const entry = DataHelper.generateDependencyEntry();
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.deepEqual(result.dependencies, entry.dependencies);
    });

    it('adds "devDependencies" property', async () => {
      const entry = DataHelper.generateDependencyEntry();
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.deepEqual(result.devDependencies, entry.devDependencies);
    });

    it('adds "id" property', async () => {
      const entry = DataHelper.generateDependencyEntry();
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.equal(result.id, model.slug(entry.pkg));
    });

    it('ignores "dependencies" when not set', async () => {
      const entry = DataHelper.generateDependencyEntry();
      delete entry.dependencies;
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.isUndefined(result.dependencies);
    });

    it('ignores "devDependencies" when not set', async () => {
      const entry = DataHelper.generateDependencyEntry();
      delete entry.devDependencies;
      await model.set(entry);
      const result = await getEntry(entry.pkg);
      assert.isUndefined(result.devDependencies);
    });

    it('returns the ID of the created entity', async () => {
      const entry = DataHelper.generateDependencyEntry();
      const result = await await model.set(entry);
      assert.equal(result, model.slug(entry.pkg));
    });
  });

  describe('get()', () => {
    let model = /** @type DependencyModel */ (null);
    beforeEach(() => {
      model = new DependencyModel();
    });

    let created;
    before(async () => {
      const m = new DependencyModel();
      created = await DataHelper.populateDepenenciesEntities(m, 2);
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.dependencyKind);
    });

    it('returns an entity', async () => {
      const result = await model.get(created[0]);
      assert.typeOf(result, 'object');
    });

    it('returns null when no value', async () => {
      const result = await model.get('none-existing');
      assert.equal(result, null);
    });
  });

  describe('listParentComponents()', () => {
    let model = /** @type DependencyModel */ (null);
    beforeEach(() => {
      model = new DependencyModel();
    });

    let created;
    before(async () => {
      const m = new DependencyModel();
      created = await DataHelper.populateDepenenciesEntities(m);
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.dependencyKind);
    });

    it('returns components that have a dependency', async () => {
      const item = await model.get(created[0]);
      const result = await model.listParentComponents(item.pkg);
      assert.typeOf(result, 'array', 'result is an array');
      assert.lengthOf(result, 1, 'has a parent');
    });

    it('adds "production" to the production dependency', async () => {
      const item = await model.get(created[0]);
      const result = await model.listParentComponents(item.pkg);
      const [entity] = result;
      assert.isTrue(entity.production);
    });

    it('adds development dependnecies', async () => {
      const item = await model.get(created[0]);
      const result = await model.listParentComponents(item.pkg, true);
      assert.lengthOf(result, 2);
    });

    it('adds "development" to dev dependnecies', async () => {
      const item = await model.get(created[0]);
      const result = await model.listParentComponents(item.pkg, true);
      assert.isTrue(result[1].development);
    });
  });

  describe('listDevParentComponents()', () => {
    let model = /** @type DependencyModel */ (null);
    beforeEach(() => {
      model = new DependencyModel();
    });

    let created;
    before(async () => {
      const m = new DependencyModel();
      created = await DataHelper.populateDepenenciesEntities(m);
    });

    after(async () => {
      await DataHelper.deleteEntities(model, model.dependencyKind);
    });

    it('returns components that have a dependency', async () => {
      const item = await model.get(created[0]);
      const result = await model.listDevParentComponents(item.pkg);
      assert.typeOf(result, 'array', 'result is an array');
      assert.lengthOf(result, 1, 'has a parent');
    });

    it('adds "development" to dev dependnecies', async () => {
      const item = await model.get(created[0]);
      const result = await model.listDevParentComponents(item.pkg);
      assert.isTrue(result[0].development);
    });
  });
});
