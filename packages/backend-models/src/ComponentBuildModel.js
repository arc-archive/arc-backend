import { BaseModel } from './BaseModel.js';
import { v4 as uuidv4 } from '@advanced-rest-client/uuid-generator';

/** @typedef {import('./ComponentBuildModel').EditableComponentBuildEntity} EditableComponentBuildEntity */
/** @typedef {import('./ComponentBuildModel').ComponentBuildEntity} ComponentBuildEntity */
/** @typedef {import('./ComponentBuildModel').ComponentBuildQueryResult} ComponentBuildQueryResult */

/**
 * A list of properties to exclude from indexing.
 * @type {string[]}
 */
const excludedIndexes = [
  'type', 'commit', 'branch', 'status', 'component', 'error', 'message', 'sshUrl', 'org', 'bumpVersion',
];

/**
 * A model for catalog items.
 */
export class ComponentBuildModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-builds');
  }

  /**
   * Lists test runs
   * @param {number=} [limit=25] A number of results to return.
   * @param {string=} nextPageToken A page token value.
   * @return {Promise<ComponentBuildQueryResult>} Query results.
   */
  async list(limit=25, nextPageToken) {
    let query = this.store.createQuery(this.namespace, this.buildKind);
    query = query.order('created', {
      descending: true,
    });
    query = query.limit(limit);
    if (nextPageToken) {
      query = query.start(nextPageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = entitiesRaw.map(this.fromDatastore.bind(this));
    const pageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken,
    };
  }

  /**
   * Creates a new build.
   * @param {EditableComponentBuildEntity} info Build definition.
   * @return {Promise<ComponentBuildEntity>} The created build
   */
  async insertBuild(info) {
    const now = Date.now();
    const id = uuidv4();
    const key = this.createBuildKey(id);
    const results = [
      {
        name: 'type',
        value: info.type,
        excludeFromIndexes: true,
      },
      {
        name: 'branch',
        value: info.branch,
        excludeFromIndexes: true,
      },
      {
        name: 'created',
        value: now,
      },
      {
        name: 'status',
        value: 'queued',
        excludeFromIndexes: true,
      },
      {
        name: 'component',
        value: info.component,
        excludeFromIndexes: true,
      },
      {
        name: 'commit',
        value: info.commit,
        excludeFromIndexes: true,
      },
      {
        name: 'sshUrl',
        value: info.sshUrl,
        excludeFromIndexes: true,
      },
      {
        name: 'org',
        value: info.org,
        excludeFromIndexes: true,
      },
    ];

    if (typeof info.bumpVersion === 'boolean') {
      results[results.length] = {
        name: 'bumpVersion',
        // @ts-ignore
        value: info.bumpVersion,
        excludeFromIndexes: true,
      };
    }

    const entity = {
      key,
      data: results,
    };

    await this.store.upsert(entity);
    return this.get(id);
  }

  /**
   * Reads the build info
   * @param {string} id The ID of the build
   * @return {Promise<ComponentBuildEntity>}
   */
  async get(id) {
    const key = this.createBuildKey(id);
    const [entry] = await this.store.get(key);
    return this.fromDatastore(entry);
  }

  /**
   * Updates the build to set status to running.
   * @param {string} id The ID of the build
   * @return {Promise<void>}
   */
  async startBuild(id) {
    await this.updateBuildProperties(id, {
      status: 'running',
      startTime: Date.now(),
    });
  }

  /**
   * Resets the build data
   * @param {string} id The ID of the build
   * @return {Promise<void>}
   */
  async restartBuild(id) {
    await this.updateBuildProperties(id, {
      status: 'queued',
      startTime: Date.now(),
      endTime: 0,
      message: '',
      error: false,
    });
  }

  /**
   * Updates the build to set error.
   * @param {string} id The ID of the build
   * @param {string} message Error message to set
   * @return {Promise<void>}
   */
  async setBuildError(id, message) {
    await this.updateBuildProperties(id, {
      status: 'finished',
      endTime: Date.now(),
      error: true,
      message,
    });
  }

  /**
   * Updates the build to set finished state
   * @param {string} id The ID of the build
   * @param {string=} message Additional message to set.
   * @return {Promise<void>}
   */
  async finishBuild(id, message) {
    const props = {
      status: 'finished',
      endTime: Date.now(),
    };
    if (message) {
      props.message = message;
    }
    await this.updateBuildProperties(id, props);
  }

  /**
   * Updates build properties in the data store.
   * It uses a transation to update values.
   *
   * @param {string} id The ID of the build
   * @param {object} props Properties to update
   * @return {Promise<void>}
   */
  async updateBuildProperties(id, props) {
    const transaction = this.store.transaction();
    const key = this.createBuildKey(id);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const [test] = data;
      Object.keys(props).forEach((key) => {
        test[key] = props[key];
      });
      transaction.save({
        key,
        data: test,
        excludeFromIndexes: excludedIndexes,
      });
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }

  /**
   * Deletes a build run.
   * @param {string} id The ID of the build
   * @return {Promise<void>}
   */
  async delete(id) {
    const key = this.createBuildKey(id);
    await this.store.delete(key);
  }
}
