import Chance from 'chance';

/** @typedef {import('../src/BaseModel').BaseModel} BaseModel */
/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('./DataHelper').ComponentInsertOptions} ComponentInsertOptions */
/** @typedef {import('./DataHelper').ComponentInsertResult} ComponentInsertResult */
/** @typedef {import('./DataHelper').CreateComponentVersionResult} CreateComponentVersionResult */

const chance = new Chance();

/**
 * Data processing helper for models
 */
class DataHelper {
  /**
   * @param {BaseModel} model
   * @param {string} kind
   * @return {Promise<void>}
   */
  async deleteEntities(model, kind) {
    const query = model.store.createQuery(model.namespace, kind);
    const [entities] = await model.store.runQuery(query);
    if (!entities.length) {
      return;
    }
    const keys = entities.map((item) => item[model.store.KEY]);
    await model.store.delete(keys);
  }

  /**
   * @param {BaseModel} model
   * @param {string=} name
   * @return {Promise<Key>}
   */
  async insertComponentGroup(model, name) {
    let nameValue = name;
    if (!nameValue) {
      nameValue = chance.word();
    }
    const key = model.store.key({
      namespace: model.namespace,
      path: [model.groupsKind, model.slug(name)],
    });
    const entity = {
      key,
      data: {
        name,
      },
    };
    await model.store.upsert(entity);
    return key;
  }

  /**
   * @param {BaseModel} model
   * @param {ComponentInsertOptions=} opts
   * @return {Promise<ComponentInsertResult>}
   */
  async insertComponent(model, opts={}) {
    const {
      name = chance.word(),
      version ='1.0.0',
      group = chance.word(),
      pkg = chance.word(),
      org = chance.word(),
    } = opts;
    const versions = [version];
    await this.insertComponentGroup(model, group);
    const key = model.store.key({
      namespace: model.namespace,
      path: [model.groupsKind, model.slug(group), model.componentsKind, model.slug(name)],
    });
    const entity = {
      key,
      data: {
        name,
        version,
        versions,
        group,
        pkg,
        org,
      },
    };
    await model.store.upsert(entity);
    return {
      key,
      name,
      group,
      version,
      versions,
      pkg,
      org,
    };
  }

  /**
   * @return {CreateComponentVersionResult}
   */
  generateComponentVersion() {
    const group = chance.word();
    const component = chance.word();
    const version = '1.0.0';
    const pkg = chance.word();
    const org = chance.word();
    const docs = chance.sentence();
    const changeLog = chance.paragraph();
    return { group, component, version, pkg, org, docs, changeLog };
  }
}

const instance = new DataHelper();
export default instance;
