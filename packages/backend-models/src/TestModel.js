import uuidV4 from '@advanced-rest-client/uuid-generator/src/v4.js';
import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('@google-cloud/datastore').Transaction} Transaction */
/** @typedef {import('./types/TestReport').TestReport} TestReport */
/** @typedef {import('./types/ComponentTest').TestQueryOptions} TestQueryOptions */
/** @typedef {import('./types/ComponentTest').TestQueryResult} TestQueryResult */
/** @typedef {import('./types/ComponentTest').AmfTest} AmfTest */
/** @typedef {import('./types/ComponentTest').BottomUpTest} BottomUpTest */
/** @typedef {import('../src/types/ComponentTest').AmfTestEntity} AmfTestEntity */
/** @typedef {import('../src/types/ComponentTest').BottomUpTestEntity} BottomUpTestEntity */

/**
 * A model for catalog items.
 */
export class TestModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-tests');
  }

  /**
   * @return {string[]} Model properties excluded from indexes
   */
  get excludedIndexes() {
    return [
      'type',
      'status',
      'size',
      'passed',
      'failed',
      'repository',
      'includeDev',
      'amfBranch',
      'error',
      'message',
      'started',
      'ended',
      'creator.id',
      'creator.displayName',
    ];
  }

  /**
   * Lists test scheduled in the data store.
   * @param {TestQueryOptions=} [opts={}] Query options
   * @return {Promise<TestQueryResult>}
   */
  async list(opts={}) {
    const { limit=this.listLimit, pageToken } = opts;
    let query = this.store.createQuery(this.namespace, this.testKind);
    query = query.limit(limit);
    query = query.order('created', {
      descending: true,
    });
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = /** @type AmfTestEntity[]|BottomUpTestEntity[] */ (entitiesRaw.map(this.fromDatastore.bind(this)));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Insets a test to the data store.
   * NOTE, this won't schedule a test in the corresponding background application.
   *
   * @param {BottomUpTest|AmfTest} info Entity description
   * @return {Promise<string>} The key value of the generated identifier for the entity
   */
  async create(info) {
    switch (info.type) {
      case 'amf': return this.insertAmf(/** @type AmfTest */(info));
      case 'bottom-up': return this.insertBottomUp(/** @type BottomUpTest */(info));
      default: throw new Error('Unknown type');
    }
  }

  /**
   * Inserts a test that is a "bottom-up" test.
   * @param {BottomUpTest} info The create object
   * @return {Promise<string>} A promise resolved to the generated test id.
   */
  async insertBottomUp(info) {
    const now = Date.now();
    const keyName = uuidV4();
    const key = this.createTestKey(keyName);
    const results = [
      {
        name: 'type',
        value: 'bottom-up',
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
      {
        name: 'creator',
        value: info.creator,
        excludeFromIndexes: true,
      },
    ];
    if (typeof info.includeDev === 'boolean') {
      results.push({
        name: 'includeDev',
        // @ts-ignore
        value: info.includeDev,
        excludeFromIndexes: true,
      });
    }
    const entity = {
      key,
      data: results,
    };
    await this.store.upsert(entity);
    return keyName;
  }

  /**
   * Inserts a test that is a "bottom-up" test.
   * @param {AmfTest} info The create object
   * @return {Promise<string>} A promise resolved to the generated test id.
   */
  async insertAmf(info) {
    const now = Date.now();
    const keyName = uuidV4();
    const key = this.createTestKey(keyName);

    const results = [
      {
        name: 'type',
        value: 'amf',
        excludeFromIndexes: true,
      },
      {
        name: 'amfBranch',
        value: info.amfBranch,
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
        name: 'creator',
        value: info.creator,
        excludeFromIndexes: true,
      },
    ];
    const entity = {
      key,
      data: results,
    };
    await this.store.upsert(entity);
    return keyName;
  }

  /**
   * Resets test state.
   * NOTE, it won't schedule a test in the corresponding background application.
   *
   * @param {string} testId The ID of the test to reset.
   * @return {Promise<void>}
   */
  async resetTest(testId) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(testId);
    try {
      await transaction.run();
      const [entity] = await transaction.get(key);
      entity.status = 'queued';
      delete entity.passed;
      delete entity.failed;
      delete entity.size;
      delete entity.started;
      delete entity.ended;
      delete entity.error;
      delete entity.message;
      transaction.save({
        key,
        data: entity,
        excludeFromIndexes: this.excludedIndexes,
      });
      await this._deleteLogs(transaction, key);
      await this._deleteComponents(transaction, key);
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }

  /**
   * Gets test definition from the store.
   * @param {string} id The ID of the test.
   * @return {Promise<BottomUpTestEntity|AmfTestEntity|null>}
   */
  async get(id) {
    const key = this.createTestKey(id);
    const [entity] = await this.store.get(key);
    if (entity) {
      return this.fromDatastore(entity);
    }
    return null;
  }

  /**
   * Marks test as started
   *
   * @param {string} id The ID of the test.
   * @return {Promise<void>}
   */
  async start(id) {
    await this.updateTestProperties(id, {
      status: 'running',
      started: Date.now(),
    });
  }

  /**
   * Marks test as an error
   * @param {string} id The ID of the test.
   * @param {string} message The error message from the test run
   * @return {Promise<void>}
   */
  async setTestError(id, message) {
    await this.updateTestProperties(id, {
      status: 'finished',
      ended: Date.now(),
      error: true,
      message,
    });
  }

  /**
   * Updates the information about the number of components in the test
   * @param {string} id The ID of the test.
   * @param {number} size The size of the test
   * @return {Promise<void>}
   */
  async setScope(id, size) {
    await this.updateTestProperties(id, {
      size,
    });
  }

  /**
   * Marks component as an error
   * @param {string} id The ID of the test.
   * @return {Promise<void>}
   * @deprecated
   */
  async setComponentError(id) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(id);
    try {
      await transaction.run();
      const [entity] = await transaction.get(key);
      if (entity.status === 'queued') {
        entity.status = 'running';
      }
      if (!entity.failed) {
        entity.failed = 0;
      }
      entity.failed++;
      transaction.save({
        key,
        data: entity,
        excludeFromIndexes: this.excludedIndexes,
      });
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }

  /**
   * Updates Test with the test result
   * @param {string} id The ID of the test.
   * @param {TestReport} report Test run report
   * @return {Promise<void>}
   */
  async updateComponentResult(id, report) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(id);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const [entity] = data;
      if (entity.status === 'queued') {
        entity.status = 'running';
      }
      if (!report.error) {
        if (!entity.passed) {
          entity.passed = 0;
        }
        entity.passed++;
      } else {
        if (!entity.failed) {
          entity.failed = 0;
        }
        entity.failed++;
      }
      transaction.save({
        key,
        data: entity,
        excludeFromIndexes: this.excludedIndexes,
      });
      await transaction.commit();
    } catch (cause) {
      transaction.rollback();
      throw cause;
    }
  }

  /**
   * Marks test as ended
   * @param {String} id The ID of the test.
   * @param {string=} message Optional message to add to the result.
   * @return {Promise<void>} [description]
   */
  async finish(id, message) {
    const props = {
      status: 'finished',
      ended: Date.now(),
    };
    if (message) {
      props.message = message;
    }
    await this.updateTestProperties(id, props);
  }

  /**
   * Updates test properties in a transaction
   * @param {string} id The ID of the test.
   * @param {object} props A properties to update
   * @return {Promise<void>} [description]
   */
  async updateTestProperties(id, props) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(id);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const [entity] = data;
      Object.keys(props).forEach((k) => {
        entity[k] = props[k];
      });
      transaction.save({
        key,
        data: entity,
        excludeFromIndexes: this.excludedIndexes,
      });
      await transaction.commit();
    } catch (cause) {
      transaction.rollback();
      throw cause;
    }
  }

  /**
   * Removes the test from the data store.
   * @param {string} id The id of the test
   * @return {Promise<void>}
   */
  async delete(id) {
    const transaction = this.store.transaction();
    const key = this.createTestKey(id);
    try {
      await transaction.run();
      transaction.delete(key);
      await this._deleteLogs(transaction, key);
      await this._deleteComponents(transaction, key);
      await transaction.commit();
    } catch (cause) {
      transaction.rollback();
      throw cause;
    }
  }

  /**
   * Deletes components associated with a test
   * @param {Transaction} transaction Running transaction
   * @param {Key} key Test key
   * @return {Promise<void>}
   */
  async _deleteComponents(transaction, key) {
    const cmpQuery = transaction.createQuery(this.namespace, this.componentsKind).hasAncestor(key);
    const cmpResult = await cmpQuery.run();
    const cmpKeys = cmpResult[0].map((item) => item[this.store.KEY]);
    if (cmpKeys.length) {
      transaction.delete(cmpKeys);
    }
  }

  /**
   * Deletes logs associated with a test
   * @param {Transaction} transaction Running transaction
   * @param {Key} key Test key
   * @return {Promise<void>}
   */
  async _deleteLogs(transaction, key) {
    const logsQuery = transaction.createQuery(this.namespace, this.testLogsKind).hasAncestor(key);
    const logsResult = await logsQuery.run();
    const logsKeys = logsResult[0].map((item) => item[this.store.KEY]);
    if (logsKeys.length) {
      transaction.delete(logsKeys);
    }
  }
}
