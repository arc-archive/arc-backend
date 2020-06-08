import semver from 'semver';
import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('./ComponentModel').GroupQueryResult} GroupQueryResult */
/** @typedef {import('./ComponentModel').ComponentQueryResult} ComponentQueryResult */
/** @typedef {import('./ComponentModel').VersionQueryResult} VersionQueryResult */
/** @typedef {import('./ComponentModel').GroupEntity} GroupEntity */
/** @typedef {import('./ComponentModel').ComponentEntity} ComponentEntity */
/** @typedef {import('./ComponentModel').VersionEntity} VersionEntity */
/** @typedef {import('./ComponentModel').GroupQueryOptions} GroupQueryOptions */
/** @typedef {import('./ComponentModel').ComponentQueryOptions} ComponentQueryOptions */
/** @typedef {import('./ComponentModel').ComponentFilterOptions} ComponentFilterOptions */
/** @typedef {import('./ComponentModel').VersionQueryOptions} VersionQueryOptions */
/** @typedef {import('./ComponentModel').VersionCreateOptions} VersionCreateOptions */

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
    return ['version', 'versions[]', 'group', 'org', 'pkg', 'ref', 'scope'];
  }

  /**
   * @return {string[]} Version model excluded indexes
   */
  get versionExcludeIndexes() {
    return ['name', 'version', 'docs', 'changelog'];
  }

  /**
   * @param {string} name Group name
   * @return {Key} A key for a group
   */
  _createGroupKey(name) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.groupsKind, this.slug(name)],
    });
  }

  /**
   * @param {string} groupName Group name
   * @param {string} componentName Component name
   * @return {Key} A key for a component
   */
  _createComponentKey(groupName, componentName) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.groupsKind, this.slug(groupName), this.componentsKind, this.slug(componentName)],
    });
  }

  /**
   * Creates datastore key for version object
   * @param {string} groupName Component's group
   * @param {string} componentName Component name
   * @param {string} version Component version
   * @return {Key}
   */
  _createVersionKey(groupName, componentName, version) {
    return this.store.key({
      namespace: this.namespace,
      path: [
        this.groupsKind,
        this.slug(groupName),
        this.componentsKind,
        this.slug(componentName),
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
   * Lists groups.
   *
   * @param {GroupQueryOptions=} opts Query options
   * @return {Promise<GroupQueryResult>} Promise resolved to a list of components.
   */
  async listGroups(opts={}) {
    const { limit=this.listLimit, pageToken } = opts;
    let query = this.store.createQuery(this.namespace, this.groupsKind);
    query = query.limit(limit);
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = /** @type GroupEntity[] */ (entitiesRaw.map(this.fromDatastore.bind(this)));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Creates an expanded entity definition for data communication.
   *
   * @param {Object} item Datastore entity for a component.
   * @return {ComponentEntity} Final version of the entity.
   */
  _fromComponentDatastore(item) {
    delete item.ref;
    const key = item[this.store.KEY];
    item.id = item[this.store.KEY].name;
    item.groupId = key.parent.name;
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
    const { limit=this.listLimit, pageToken, group } = opts;
    let query = this.store.createQuery(this.namespace, this.componentsKind);
    query = query.order('name', {
      descending: false,
    });
    if (group) {
      const key = this._createGroupKey(group);
      query = query.hasAncestor(key);
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
   * Lists components.
   *
   * @param {ComponentFilterOptions=} opts Query options
   * @return {Promise<ComponentQueryResult>} Promise resolved to a list of components.
   */
  async queryComponents(opts) {
    const { limit=this.listLimit, pageToken, group, tags } = opts;
    let query = this.store.createQuery(this.namespace, this.componentsKind);
    query = query.order('name', { descending: false });
    if (group) {
      const key = this._createGroupKey(String(group));
      query = query.hasAncestor(key);
    }
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
   * @param {string} group Component group id
   * @param {string} component Component id
   * @param {VersionQueryOptions=} opts Query options
   * @return {Promise<VersionQueryResult>}
   */
  async listVersions(group, component, opts={}) {
    const { limit=this.listLimit, pageToken } = opts;
    const key = this._createComponentKey(group, component);
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
    const { group, component, version, pkg, org, docs, changeLog } = info;
    await this._ensureGroup(group);
    const cmp = await this._ensureComponent(version, component, group, pkg, org);
    await this._ensureVersion(cmp, version, component, group, docs, changeLog);
  }

  /**
   * Creates a group of components if it does not exist.
   *
   * @param {string} groupName Name of the group
   * @return {Promise<GroupEntity>}
   */
  async _ensureGroup(groupName) {
    const key = this._createGroupKey(groupName);
    let result;
    try {
      result = await this.getGroup(groupName);
    } catch (_) {
      // ...
    }
    if (!result) {
      result = await this._createGroup(groupName, key);
    }
    return result;
  }

  /**
   * Returns group model.
   * @param {string} name Group name
   * @return {Promise<GroupEntity>}
   */
  async getGroup(name) {
    const key = this._createGroupKey(name);
    const [entity] = await this.store.get(key);
    if (entity) {
      return this.fromDatastore(entity);
    }
  }

  /**
   * Creates a component group entity.
   *
   * @param {string} name Name of the group
   * @param {Key} key Key of the entity.
   * @return {Promise<GroupEntity>} Generated model.
   */
  async _createGroup(name, key) {
    const data = [
      {
        name: 'name',
        value: name,
        excludeFromIndexes: true,
      },
    ];
    const entity = {
      key,
      data,
    };
    await this.store.upsert(entity);
    const [entry] = await this.store.get(key);
    if (entry) {
      return this.fromDatastore(entry);
    }
  }

  /**
   * Test if component data are already stored and creates a model if not.
   *
   * @param {string} version Component version
   * @param {string} componentName Component name
   * @param {string} groupName Component's group
   * @param {string} pkg Component package name
   * @param {string} org Component organization
   * @return {Promise<ComponentEntity>}
   */
  async _ensureComponent(version, componentName, groupName, pkg, org) {
    const key = this._createComponentKey(groupName, componentName);
    let data;
    try {
      data = await this.store.get(key);
    } catch (e) {
      // ...
    }
    if (!data || !data[0]) {
      return this._createComponent(componentName, version, groupName, pkg, org, key);
    }
    return this._addComponentVersion(data[0], version, key);
  }

  /**
   * Returns component definition.
   * @param {string} groupName Group id
   * @param {string} componentName Component id
   * @return {Promise<ComponentEntity>}
   */
  async getComponent(groupName, componentName) {
    const key = this._createComponentKey(groupName, componentName);
    const entity = await this.store.get(key);
    if (entity && entity[0]) {
      return this._fromComponentDatastore(entity[0]);
    }
  }

  /**
   * Creates a component.
   *
   * @param {string} name Name of the group
   * @param {string} version Component version
   * @param {string} groupName Component's group
   * @param {string} pkg Component package name
   * @param {string} org Component organization
   * @param {Key} key Key of the entity.
   * @return {Promise<ComponentEntity>} Generated model.
   */
  async _createComponent(name, version, groupName, pkg, org, key) {
    const data = [
      {
        name: 'name',
        value: name,
        excludeFromIndexes: false,
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
      {
        name: 'group',
        value: groupName,
        excludeFromIndexes: true,
      },
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
   * Adds a new version to the component model.
   * @param {ComponentEntity} model Existing model
   * @param {string} version Version number
   * @param {Key} key Datastore key
   * @return {Promise<ComponentEntity>} updated model
   */
  async _addComponentVersion(model, version, key) {
    if (!model.versions) {
      model.versions = [];
    }

    if (model.versions.indexOf(version) === -1) {
      model.versions[model.versions.length] = version;
      if (!semver.prerelease(version)) {
        model.version = version;
      }
      const entity = {
        key,
        data: model,
        excludeFromIndexes: this.componentExcludeIndexes,
      };
      await this.store.update(entity);
    }

    const [entity] = await this.store.get(key);
    return this._fromComponentDatastore(entity);
  }

  /**
   * Replaces/creates version in the datastrore
   *
   * @param {ComponentEntity} parent Parent component
   * @param {string} version Component version
   * @param {string} componentName Component name
   * @param {string} groupName Component's group
   * @param {object} data Polymer analysis result
   * @param {String=} changelog Version changelog
   * @return {Promise<void>}
   */
  async _ensureVersion(parent, version, componentName, groupName, data, changelog) {
    const key = this._createVersionKey(groupName, componentName, version);
    let model;
    try {
      [model] = await this.store.get(key);
    } catch (_) {
      // ...
    }
    if (!model) {
      return this._createVersion(parent, version, componentName, groupName, data, changelog);
    }

    model.created = Date.now();
    model.docs = JSON.stringify(data);
    if (Array.isArray(parent.tags)) {
      model.tags = parent.tags;
    } else if (model.tags) {
      delete model.tags;
    }
    if (changelog) {
      model.changelog = changelog;
    } else if (model.changelog) {
      delete model.changelog;
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
   * @param {string} componentName Component name
   * @param {string} groupName Component's group
   * @param {object} docs Polymer analysis result
   * @param {string=} changelog
   * @return {Promise<void>}
   */
  async _createVersion(parent, version, componentName, groupName, docs, changelog) {
    const key = this._createVersionKey(groupName, componentName, version);
    const data = [
      {
        name: 'name',
        value: componentName,
        excludeFromIndexes: true,
      },
      {
        name: 'docs',
        value: JSON.stringify(docs),
        excludeFromIndexes: true,
      },
      {
        name: 'created',
        value: Date.now(),
        excludeFromIndexes: false,
      },
    ];
    if (parent.tags) {
      data.push({
        name: 'tags',
        // @ts-ignore
        value: parent.tags,
      });
    }
    if (changelog) {
      data.push({
        name: 'changelog',
        value: changelog,
        excludeFromIndexes: true,
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
   * @param {string} groupName Group name
   * @param {string} componentName Component name
   * @param {string} version Version name.
   * @return {Promise<VersionEntity|null>}
   */
  async getVersion(groupName, componentName, version) {
    const key = this._createVersionKey(groupName, componentName, version);
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
    const { limit=this.listLimit, pageToken, group, component, tags, since, until } = opts;
    let query = this.store.createQuery(this.namespace, this.versionsKind);
    query = query.order('created', {
      descending: true,
    });
    if (group && component) {
      const key = this._createComponentKey(group, component);
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
   * @param {string} groupName Name of component's group
   * @param {string} componentName Name of the component
   * @param {object} props
   * @return {Promise<void>}
   */
  async updateComponentProperties(groupName, componentName, props) {
    const key = this._createComponentKey(groupName, componentName);
    const transaction = this.store.transaction();
    try {
      await transaction.run();
      const [test] = await transaction.get(key);
      Object.keys(props).forEach((key) => {
        test[key] = props[key];
      });
      transaction.save({
        key,
        data: test,
        excludeFromIndexes: this.componentExcludeIndexes,
      });
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }
}
