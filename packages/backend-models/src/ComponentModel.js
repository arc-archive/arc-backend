import semver from 'semver';
import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('./ComponentModel').ComponentQueryResult} ComponentQueryResult */
/** @typedef {import('./ComponentModel').VersionQueryResult} VersionQueryResult */
/** @typedef {import('./ComponentModel').ComponentEntity} ComponentEntity */
/** @typedef {import('./ComponentModel').VersionEntity} VersionEntity */
/** @typedef {import('./ComponentModel').ComponentQueryOptions} ComponentQueryOptions */
/** @typedef {import('./ComponentModel').ComponentFilterOptions} ComponentFilterOptions */
/** @typedef {import('./ComponentModel').VersionQueryOptions} VersionQueryOptions */
/** @typedef {import('./ComponentModel').VersionCreateOptions} VersionCreateOptions */
/** @typedef {import('./ComponentModel').TagsProcessOptions} TagsProcessOptions */

/**
 * A model for catalog items.
 */
export class ComponentModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components');
  }

  /**
   * @return {string[]} Component model excluded indexes
   */
  get componentExcludeIndexes() {
    return ['version', 'versions[]', 'name', 'org', 'npmName', 'ref'];
  }

  /**
   * @return {string[]} Version model excluded indexes
   */
  get versionExcludeIndexes() {
    return ['npmName', 'version'];
  }

  /**
   * @param {string} npmName The component's NPM name.
   * @return {Key} A key for a component
   */
  createComponentKey(npmName) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.componentsKind, this.slug(npmName)],
    });
  }

  /**
   * Creates datastore key for version object
   * @param {string} npmName The component's NPM name.
   * @param {string} version Component version
   * @return {Key}
   */
  createVersionKey(npmName, version) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.componentsKind,
        this.slug(npmName),
        this.versionsKind,
        version,
      ],
    });
  }

  /**
   * Finds largest non-pre-release version in the list of versions.
   * @param {string[]} range List of semver versions.
   * @return {string} Largest version in the list.
   */
  findLatestVersion(range) {
    if (!range || !range.length) {
      return;
    }
    let latest = range[0];
    for (let i = 1, len = range.length; i < len; i++) {
      const ver = range[i];
      if (semver.prerelease(ver)) {
        continue;
      }
      if (semver.gt(ver, latest)) {
        latest = ver;
      }
    }
    return latest;
  }

  /**
   * Creates an expanded entity definition for data communication.
   *
   * @param {Object} item Datastore entity for a component.
   * @return {ComponentEntity} Final version of the entity.
   */
  _fromComponentDatastore(item) {
    delete item.ref;
    item.id = item[this.store.KEY].name;
    item.version = this.findLatestVersion(item.versions);
    return item;
  }

  /**
   * Lists components.
   *
   * @param {ComponentQueryOptions=} opts Query options
   * @return {Promise<ComponentQueryResult>} Promise resolved to a list of components.
   */
  async listComponents(opts) {
    const { limit=this.listLimit, pageToken } = opts;
    let query = this.store.createQuery(this.namespace, this.componentsKind);
    query = query.order('name', {
      descending: false,
    });
    query = query.limit(limit);
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);

    const entities = entitiesRaw.map(this._fromComponentDatastore.bind(this));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Lists components.
   *
   * @param {ComponentFilterOptions=} opts Query options
   * @return {Promise<ComponentQueryResult>} Promise resolved to a list of components.
   */
  async queryComponents(opts) {
    const { limit=this.listLimit, pageToken, tags } = opts;
    let query = this.store.createQuery(this.namespace, this.componentsKind);
    query = query.order('name', { descending: false });
    if (Array.isArray(tags)) {
      tags.forEach((tag) => {
        query = query.filter('tags', '=', String(tag));
      });
    }
    query = query.limit(limit);
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = entitiesRaw.map(this._fromComponentDatastore.bind(this));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Lists names of API components (with `apic` tag)
   * @return {Promise<ComponentEntity[]>} Promise resolved to a list of names.
   */
  async listApiComponents() {
    return this.listTagComponents('apic');
  }

  /**
   * Lists names of AMF consuming components (with `amf` tag)
   * @return {Promise<ComponentEntity[]>} Promise resolved to a list of names.
   */
  async listAmfComponents() {
    return this.listTagComponents('amf');
  }

  /**
   * Lists names of components that has a tag.
   * @param {string} tag The tag to search for.
   * @return {Promise<ComponentEntity[]>} Promise resolved to a list of names.
   */
  async listTagComponents(tag) {
    let query = this.store.createQuery(this.namespace, this.componentsKind);
    query = query.filter('tags', '=', tag);
    const [components] = await this.store.runQuery(query);
    if (!components) {
      return [];
    }
    return components.map(this._fromComponentDatastore.bind(this));
  }

  /**
   * Creates an expanded entity definition for data communication.
   *
   * @param {Object} item Datastore entity for a version.
   * @return {VersionEntity} Final version of the entity.
   */
  _fromVersionDatastore(item) {
    delete item.ref;
    const key = item[this.store.KEY];
    item.id = key.name;
    item.group = key.parent.parent.name;
    return item;
  }

  /**
   * Lists version of a component.
   * @param {string} nameName The component's package name (scope + name)
   * @param {VersionQueryOptions=} opts Query options
   * @return {Promise<VersionQueryResult>}
   */
  async listVersions(nameName, opts={}) {
    const { limit=this.listLimit, pageToken } = opts;
    const key = this.createComponentKey(nameName);
    let query = this.store.createQuery(this.namespace, this.versionsKind).hasAncestor(key);
    query = query.order('name', { descending: false });
    query = query.order('created', {
      descending: true,
    });
    query = query.limit(limit);
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = entitiesRaw.map(this._fromVersionDatastore.bind(this));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Creates a new version of API component in the data store.
   *
   * @param {VersionCreateOptions} info Version description
   * @return {Promise<void>}
   */
  async addVersion(info) {
    const { npmName, version, name, org } = info;
    const cmp = await this.ensureComponent(version, name, org, npmName, {
      keepTags: true,
    });
    await this.ensureVersion(cmp, version, npmName);
  }

  /**
   * Returns component definition.
   * @param {string} npmName The component's package name (scope + name)
   * @return {Promise<ComponentEntity|null>}
   */
  async getComponent(npmName) {
    const key = this.createComponentKey(npmName);
    const entity = await this.store.get(key);
    if (entity && entity[0]) {
      return this._fromComponentDatastore(entity[0]);
    }
    return null;
  }

  /**
   * Creates a new component entity.
   *
   * @param {string} name The GitHub name of the component's repository.
   * @param {string} org GitHub's organization name the component is in.
   * With the combination with the `name` it creates GitHub's URI.
   * @param {string} npmName The component's package name (scope + name)
   * @param {string} version Component version
   * @param {Key} key Key of the entity.
   * @param {TagsProcessOptions=} tags Components tags.
   * @return {Promise<ComponentEntity>} Generated model.
   */
  async createComponent(name, org, npmName, version, key, tags={}) {
    const data = [
      {
        name: 'name',
        value: name,
        excludeFromIndexes: false,
      },
      {
        name: 'org',
        value: org,
        excludeFromIndexes: true,
      },
      {
        name: 'npmName',
        value: npmName,
        excludeFromIndexes: true,
      },
      {
        name: 'version',
        value: version,
        excludeFromIndexes: true,
      },
      {
        name: 'versions',
        value: [version],
        excludeFromIndexes: true,
      },
    ];
    if (Array.isArray(tags.tags) && tags.tags.length) {
      data.push({
        name: 'tags',
        value: tags.tags,
        excludeFromIndexes: false,
      });
    }
    const entity = {
      key,
      data,
    };
    await this.store.upsert(entity);
    const [entry] = await this.store.get(key);
    if (entry) {
      return this._fromComponentDatastore(entry);
    }
  }

  /**
   * Test if component data are already stored and creates a model if not.
   *
   * @param {string} version Component version
   * @param {string} name The GitHub name of the component's repository.
   * @param {string} org GitHub's organization name the component is in.
   * With combination with the `name` it creates GitHub's URI.
   * @param {string} npmName The component's package name (scope + name)
   * @param {TagsProcessOptions=} tags Components options.
   * @return {Promise<ComponentEntity>}
   */
  async ensureComponent(version, name, org, npmName, tags) {
    const key = this.createComponentKey(npmName);
    let data;
    try {
      [data] = await this.store.get(key);
    } catch (e) {
      // ...
    }
    if (!data) {
      return this.createComponent(name, org, npmName, version, key, tags);
    }
    return this.addComponentVersion(data, version, key, tags);
  }

  /**
   * Adds a new version to the component model.
   * @param {ComponentEntity} model Existing model
   * @param {string} version Version number
   * @param {Key} key Datastore key for a component
   * @param {TagsProcessOptions=} tagOpts Components tags.
   * @return {Promise<ComponentEntity>} updated model
   */
  async addComponentVersion(model, version, key, tagOpts={}) {
    const { tags, keepTags } = tagOpts;
    if (!model.versions) {
      model.versions = [];
    }
    let changed = false;
    if (Array.isArray(tags) && tags.length) {
      model.tags = tags;
      changed = true;
    } else if (model.tags && !keepTags) {
      changed = true;
      delete model.tags;
    }

    if (!model.versions.includes(version)) {
      model.versions[model.versions.length] = version;
      if (!semver.prerelease(version)) {
        if (!model.version || semver.gt(version, model.version)) {
          model.version = version;
        }
      }
      changed = true;
    }
    if (changed) {
      const entity = {
        key,
        data: model,
        excludeFromIndexes: this.componentExcludeIndexes,
      };
      await this.store.update(entity);
      const [updated] = await this.store.get(key);
      return this._fromComponentDatastore(updated);
    }
    return model;
  }

  /**
   * Replaces/creates version in the data store
   *
   * @param {ComponentEntity} parent Parent component
   * @param {string} version Component version
   * @param {string} npmName The component's package name (scope + name)
   * @return {Promise<void>}
   */
  async ensureVersion(parent, version, npmName) {
    const key = this.createVersionKey(npmName, version);
    let model = /** @type VersionEntity */ (null);
    try {
      [model] = await this.store.get(key);
    } catch (_) {
      // ...
    }
    if (!model) {
      return this.createVersion(parent, version, npmName);
    }
    model.created = Date.now();
    if (Array.isArray(parent.tags)) {
      model.tags = parent.tags;
    } else if (model.tags) {
      delete model.tags;
    }
    const entity = {
      key,
      data: model,
      excludeFromIndexes: this.versionExcludeIndexes,
    };
    await this.store.update(entity);
  }

  /**
   * Creates component version entity.
   *
   * @param {ComponentEntity} parent Parent component
   * @param {string} version Component version
   * @param {string} npmName The component's package name (scope + name)
   * @return {Promise<void>}
   */
  async createVersion(parent, version, npmName) {
    const key = this.createVersionKey(npmName, version);
    const data = [
      {
        name: 'npmName',
        value: npmName,
        excludeFromIndexes: true,
      },
      {
        name: 'created',
        value: Date.now(),
        excludeFromIndexes: false,
      },
      {
        name: 'version',
        value: version,
        excludeFromIndexes: true,
      },
    ];
    if (parent.tags) {
      data.push({
        name: 'tags',
        // @ts-ignore
        value: parent.tags,
      });
    }
    const entity = {
      key,
      data,
    };
    await this.store.upsert(entity);
  }

  /**
   * Returns component definition.
   * @param {string} npmName The component's package name (scope + name)
   * @param {string} version Version name.
   * @return {Promise<VersionEntity|null>}
   */
  async getVersion(npmName, version) {
    const key = this.createVersionKey(npmName, version);
    const [entity] = await this.store.get(key);
    if (entity) {
      return this.fromDatastore(entity);
    }
    return null;
  }

  /**
   * Queries for versions.
   * @param {VersionQueryOptions=} opts Query options
   * @return {Promise<VersionQueryResult>}
   */
  async queryVersions(opts={}) {
    const { limit=this.listLimit, pageToken, npmName, tags, since, until } = opts;
    let query = this.store.createQuery(this.namespace, this.versionsKind);
    query = query.order('created', {
      descending: true,
    });
    if (npmName) {
      const key = this.createComponentKey(npmName);
      query = query.hasAncestor(key);
    }
    if (tags && tags.length) {
      tags.forEach((tag) => {
        query = query.filter('tags', '=', tag);
      });
    }
    if (since) {
      query = query.filter('created', '>=', Number(since));
    }
    if (until) {
      query = query.filter('created', '<=', Number(until));
    }
    query = query.limit(limit);
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = /** @type VersionEntity[] */ (entitiesRaw.map((item) => {
      const key = item[this.store.KEY];
      item.id = key.name;
      item.group = key.parent.parent.name;
      return item;
    }));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Updates properties of a component entity
   * @param {string} npmName The component's package name (scope + name)
   * @param {object} props
   * @return {Promise<void>}
   */
  async updateComponentProperties(npmName, props) {
    const key = this.createComponentKey(npmName);
    const transaction = this.store.transaction();
    try {
      await transaction.run();
      const [entity] = await transaction.get(key);
      Object.keys(props).forEach((k) => {
        entity[k] = props[k];
      });
      transaction.save({
        key,
        data: entity,
        excludeFromIndexes: this.componentExcludeIndexes,
      });
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }
}
