import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('./DependencyModel').DependencyEntity} DependencyEntity */

/**
 * A model for catalog items.
 */
export class DependencyModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components');
  }

  /**
   * Creates a data store key
   * @param {string} name
   * @return {Key}
   */
  _createKey(name) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.dependencyKind, this.slug(name)],
    });
  }

  /**
   * @return {string[]} Model properties excluded from indexes
   */
  get excludeFromIndexes() {
    return ['pkg', 'org'];
  }

  /**
   * Adds new dependency
   * @param {string} component Component name
   * @param {string[]} dependencies List of dependencies (package names)
   * @param {string[]} devDependencies List of dev dependencies (package names)
   * @param {string} org Component GitHub organization
   * @param {string} pkg Component package name
   * @return {Promise<void>} [description]
   */
  async set(component, dependencies, devDependencies, org, pkg) {
    const key = this._createKey(component);
    const results = [
      {
        name: 'pkg',
        value: pkg,
        excludeFromIndexes: true,
      },
      {
        name: 'org',
        value: org,
        excludeFromIndexes: true,
      },
    ];
    if (dependencies) {
      results[results.length] = {
        name: 'dependencies',
        // @ts-ignore
        value: dependencies,
      };
    }
    if (devDependencies) {
      results[results.length] = {
        name: 'devDependencies',
        // @ts-ignore
        value: devDependencies,
      };
    }
    const entity = {
      key,
      data: results,
    };
    await this.store.upsert(entity);
  }

  /**
   * Lists dependncies that would be a parent for a component.
   * @param {string} dependency The component name
   * @param {boolean=} includeDev Whether or not to include dev dependencies in the query
   * @return {Promise<DependencyEntity[]>} [description]
   */
  async listParentComponents(dependency, includeDev) {
    let query = this.store.createQuery(this.namespace, this.dependencyKind);
    query = query.filter('dependencies', '=', dependency);
    let deps = [];
    const [items] = await this.store.runQuery(query);
    if (items) {
      deps = items.map((item) => ({
        production: true,
        name: item.pkg,
      }));
    }
    if (includeDev) {
      const other = await this.listDevParentComponents(dependency);
      if (other) {
        deps = deps.concat(other);
      }
    }
    return deps;
  }

  /**
   * Lists dev dependncies that would be a parent for a component.
   * @param {string} dependency The component name
   * @return {Promise<DependencyEntity[]>} [description]
   */
  async listDevParentComponents(dependency) {
    let query = this.store.createQuery(this.namespace, this.dependencyKind);
    query = query.filter('devDependencies', '=', dependency);
    const [items] = await this.store.runQuery(query);
    if (!items) {
      return;
    }
    return items.map((item) => {
      item.development = true;
      return item;
    });
  }

  /**
   * Reads a dependency data from the store
   * @param {string} component Component name.
   * @return {Promise<DependencyEntity>}
   */
  async get(component) {
    const key = this._createKey(component);
    const [entity] = await this.store.get(key);
    if (entity) {
      return this.fromDatastore(entity);
    }
    return null;
  }
}
