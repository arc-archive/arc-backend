import { BaseModel } from './BaseModel.js';
import { v4 } from 'uuid';

/** @typedef {import('./types/GitHubBuild').GithubBuildQueryOptions} GithubBuildQueryOptions */
/** @typedef {import('./types/GitHubBuild').GithubBuildQueryResult} GithubBuildQueryResult */
/** @typedef {import('./types/GitHubBuild').GithubBuild} GithubBuild */
/** @typedef {import('./types/GitHubBuild').GithubBuildEntity} GithubBuildEntity */

/**
 * A list of properties to exclude from indexing.
 * @type {string[]}
 */
const excludedIndexes = [
  'repository', 'type', 'started', 'ended', 'error', 'message', 'status',
];

/**
 * A data store entry representing a CI build of a project in any connected organization.
 *
 * Each build is related to a part of the CI process:
 *
 * - Stage build (type)
 *  - bump version (if previous version is the same)
 *  - update changelog file
 *  - merge with master
 *  - push master & stage
 * - Master build:
 *   - tag GitHub release
 *   - build release changelog
 *   - push to GitHub
 * - Tag build:
 *   - release NPM package
 *   - add a new version of the component
 *   - add auto docs to the data store
 *   - add the dependency information.
 */
export class GitHubBuildModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('apic-github-builds');
  }

  /**
   * Lists test runs
   * @param {GithubBuildQueryOptions=} opts Query options
   * @return {Promise<GithubBuildQueryResult>} Query results.
   */
  async list(opts={}) {
    const { limit=this.listLimit, pageToken } = opts;
    let query = this.store.createQuery(this.namespace, this.buildKind);
    query = query.order('created', {
      descending: true,
    });
    query = query.limit(limit);
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = entitiesRaw.map(this.fromDatastore.bind(this));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Creates a new build.
   * @param {GithubBuild} info Build definition.
   * @return {Promise<GithubBuildEntity>} The created build
   */
  async insertBuild(info) {
    const now = Date.now();
    const id = v4();
    const key = this.createBuildKey(id);
    const results = [
      {
        name: 'type',
        value: info.type,
        excludeFromIndexes: true,
      },
      {
        name: 'repository',
        value: info.repository,
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
    ];

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
   * @return {Promise<GithubBuildEntity>}
   */
  async get(id) {
    const key = this.createBuildKey(id);
    const [entry] = await this.store.get(key);
    if (entry) {
      return this.fromDatastore(entry);
    }
    return undefined;
  }

  /**
   * Updates the build to set status to running.
   * @param {string} id The ID of the build
   * @return {Promise<void>}
   */
  async startBuild(id) {
    await this.updateBuildProperties(id, {
      status: 'running',
      started: Date.now(),
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
      started: Date.now(),
      ended: 0,
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
      ended: Date.now(),
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
      ended: Date.now(),
    };
    if (message) {
      props.message = message;
    }
    await this.updateBuildProperties(id, props);
  }

  /**
   * Updates build properties in the data store.
   * It uses a transaction to update values.
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
      const [item] = data;
      Object.keys(props).forEach((k) => {
        item[k] = props[k];
      });
      transaction.save({
        key,
        data: item,
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
