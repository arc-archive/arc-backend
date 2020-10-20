import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('./DependencyModel').DependencyEntity} DependencyEntity */
/** @typedef {import('./DependencyModel').DependencyEntry} DependencyEntry */

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
   * Adds new dependency
   * @param {DependencyEntry} entry The entry to insert
   * @return {Promise<string>} The id of the created entity
   */
  async set(entry) {
    const { dependencies, devDependencies, org, pkg, name } = entry;
    const key = this._createKey(pkg);
    const results = [
      {
        name: 'org',
        value: org,
        excludeFromIndexes: true,
      },
      {
        name: 'pkg',
        value: pkg,
        excludeFromIndexes: true,
      },
      {
        name: 'name',
        value: name,
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
    return key.name;
  }

  /**
   * Lists dependencies that would be a parent for a component.
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
      deps = items.map((item) => {
        const result = /** @type DependencyEntity */ (this.fromDatastore(item));
        result.production = true;
        return result;
      });
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
   * Lists dev dependencies that would be a parent for a component.
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
      const result = /** @type DependencyEntity */ (this.fromDatastore(item));
      result.development = true;
      return result;
    });
  }

  /**
   * Reads a dependency data from the store
   * @param {string} component The full NPM component name (scope + name)
   * @return {Promise<DependencyEntity|null>}
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
