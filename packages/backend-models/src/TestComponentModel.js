import { BaseModel } from './BaseModel.js';

/** @typedef {import('./TestReport').TestReport} TestReport */
/** @typedef {import('./TestComponentModel').TestComponentEntity} TestComponentEntity */
/** @typedef {import('./TestComponentModel').TestComponentQueryOptions} TestComponentQueryOptions */
/** @typedef {import('./TestComponentModel').TestComponentQueryResult} TestComponentQueryResult */

/**
 * A model for a componet test results in a run.
 */
export class TestComponentModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-tests');
  }

  /**
   * Creates a "running" test for a component.
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @return {Promise<void>}
   */
  async create(testId, componentName) {
    const key = this.createTestComponentKey(testId, componentName);
    const results = [
      {
        name: 'component',
        value: componentName,
        excludeFromIndexes: true,
      },
      {
        name: 'status',
        value: 'running',
        excludeFromIndexes: true,
      },
      {
        name: 'startTime',
        value: Date.now(),
      },
    ];

    const entity = {
      key,
      data: results,
    };

    try {
      const [existing] = await this.store.get(key);
      if (existing) {
        await this.store.delete(key);
      }
    } catch (_) {
      // ...
    }
    await this.store.upsert(entity);
  }

  /**
   * Reads the model data from the data store
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @return {Promise<TestComponentEntity|null>}
   */
  async get(testId, componentName) {
    const key = this.createTestComponentKey(testId, componentName);
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
   * Updates component test results with the data from the test report.
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @param {TestReport} report The name of the component associated with the test
   * @return {Promise<void>}
   */
  async updateComponent(testId, componentName, report) {
    const transaction = this.store.transaction();
    const key = this.createTestComponentKey(testId, componentName);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const [component] = data;
      let status = report.error ? 'failed' : 'passed';
      if (!report.error && report.failed) {
        status = 'failed';
      }
      component.status = status;
      component.total = report.total;
      component.success = report.success;
      component.failed = report.failed;
      component.skipped = report.skipped;
      component.hasLogs = !!report.results.length;
      transaction.save({
        key,
        data: component,
        excludeFromIndexes: ['total', 'success', 'failed', 'skipped', 'status', 'hasLogs'],
      });
      await transaction.commit();
    } catch (cause) {
      transaction.rollback();
      throw cause;
    }
  }

  /**
   * Updates the component to the error state.
   *
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @param {string} message Error message
   * @return {Promise<void>}
   */
  async updateComponentError(testId, componentName, message) {
    const transaction = this.store.transaction();
    const key = this.createTestComponentKey(testId, componentName);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const [component] = data;
      component.status = 'failed';
      component.error = true;
      component.hasLogs = false;
      component.message = message;
      transaction.save({
        key,
        data: component,
        excludeFromIndexes: ['total', 'success', 'failed', 'skipped', 'status', 'hasLogs', 'message', 'error'],
      });
      await transaction.commit();
    } catch (cause) {
      transaction.rollback();
    }
  }

  /**
   * Lists component tests
   * @param {string} testId The ID of the test
   * @param {TestComponentQueryOptions?} [opts={}] Query options
   * @return {Promise<TestComponentQueryResult>}
   */
  async list(testId, opts={}) {
    const { limit=this.listLimit, pageToken } = opts;
    const ancestorKey = this.createTestKey(testId);
    let query = this.store.createQuery(this.namespace, this.componentsKind).hasAncestor(ancestorKey);
    query = query.limit(limit);
    if (pageToken) {
      query = query.start(pageToken);
    }
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = /** @type TestComponentEntity[] */ (entitiesRaw.map(this.fromDatastore.bind(this)));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Resets the test to the default state.
   * @param {string} testId The ID of the test
   * @return {Promise<void>}
   */
  async clearResult(testId) {
    const transaction = this.store.transaction();
    const ancestorKey = this.createTestKey(testId);
    try {
      await transaction.run();
      const query = transaction.createQuery(this.namespace, this.componentsKind).hasAncestor(ancestorKey);
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
