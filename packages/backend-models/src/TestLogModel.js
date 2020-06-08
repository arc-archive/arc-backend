import { BaseModel } from './BaseModel.js';

/** @typedef {import('./TestReport').TestBrowserResult} TestBrowserResult */
/** @typedef {import('./TestLogModel').TestLogQueryOptions} TestLogQueryOptions */
/** @typedef {import('./TestLogModel').TestLogQueryResult} TestLogQueryResult */
/** @typedef {import('./TestLogModel').TestLogEntity} TestLogEntity */

/**
 * A model for a componet test results in a single run.
 */
export class TestLogModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-tests');
  }

  /**
   * Creates a browser identificator
   * @param {TestBrowserResult} browser A Karma's browser definition.
   * @return {string}
   */
  _makeBrowserId(browser) {
    return browser.browser.split(' ').slice(0, 2).join('-');
  }

  /**
   * @return {string[]} Model properties excluded from indexes
   */
  get excludeFromIndexes() {
    return [
      'browser', 'endTime', 'startTime', 'total', 'success', 'failed',
      'skipped', 'error', 'message', 'logs[]',
    ];
  }

  /**
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @param {TestBrowserResult[]} results List of browser results for a test
   * @return {Promise<void>} Model properties excluded from indexes
   */
  async addLogs(testId, componentName, results) {
    const transaction = this.store.transaction();
    try {
      await transaction.run();
      const entities = [];
      for (let i = 0, len = results.length; i < len; i++) {
        const browser = results[i];
        const id = this._makeBrowserId(browser);
        const key = this.createTestLogKey(testId, componentName, id);
        const data = [
          {
            name: 'browser',
            value: browser.browser,
            excludeFromIndexes: true,
          },
          {
            name: 'endTime',
            value: browser.endTime,
            excludeFromIndexes: true,
          },
          {
            name: 'startTime',
            value: browser.startTime,
            excludeFromIndexes: true,
          },
          {
            name: 'total',
            value: browser.total,
            excludeFromIndexes: true,
          },
          {
            name: 'success',
            value: browser.success,
            excludeFromIndexes: true,
          },
          {
            name: 'failed',
            value: browser.failed,
            excludeFromIndexes: true,
          },
          {
            name: 'skipped',
            value: browser.skipped,
            excludeFromIndexes: true,
          },
          {
            name: 'error',
            value: browser.error,
            excludeFromIndexes: true,
          },
        ];
        if (browser.message) {
          data[data.length] = {
            name: 'message',
            value: browser.message,
            excludeFromIndexes: true,
          };
        }
        if (browser.logs) {
          data[data.length] = {
            name: 'logs',
            value: browser.logs,
            excludeFromIndexes: true,
          };
        }
        entities[entities.length] = {
          key,
          data,
          excludeFromIndexes: this.excludeFromIndexes,
        };
      }

      transaction.save(entities);
      await transaction.commit();
    } catch (cause) {
      transaction.rollback();
      throw cause;
    }
  }

  /**
   * Lists browser test results for a component.
   *
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @param {TestLogQueryOptions?} [opts={}] Query options
   * @return {Promise<TestLogQueryResult>}
   */
  async list(testId, componentName, opts={}) {
    const { limit=this.listLimit, pageToken } = opts;
    const ancestorKey = this.createTestComponentKey(testId, componentName);
    let query = this.store.createQuery(this.namespace, this.testLogsKind).hasAncestor(ancestorKey);
    query = query.limit(limit);
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = /** @type TestLogEntity[] */ (entitiesRaw.map(this.fromDatastore.bind(this)));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Reads a single browser test result
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @param {string} logId Browser id
   * @return {Promise<TestLogEntity|null>}
   */
  async get(testId, componentName, logId) {
    const key = this.createTestLogKey(testId, componentName, logId);
    try {
      const [existing] = await this.store.get(key);
      if (existing) {
        return this.fromDatastore(existing);
      }
    } catch (_) {
      // ...
    }
    return null;
  }

  /**
   * Removes all logs for a test.
   * @param {string} testId The ID of the test
   * @return {Promise<void>}
   */
  async clearLogs(testId) {
    const transaction = this.store.transaction();
    const ancestorKey = this.createTestKey(testId);
    try {
      await transaction.run();
      const query = transaction.createQuery(this.namespace, this.testLogsKind).hasAncestor(ancestorKey);
      const result = await query.run();
      const keys = result[0].map((item) => item[this.store.KEY]);
      if (keys.length) {
        transaction.delete(keys);
      }
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }
}
