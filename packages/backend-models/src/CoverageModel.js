import semver from 'semver';
import { v4 as uuidv4 } from '@advanced-rest-client/uuid-generator';
import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('@google-cloud/datastore').Transaction} Transaction */
/** @typedef {import('./CoverageModel').EditableCoverageEntity} EditableCoverageEntity */
/** @typedef {import('./CoverageModel').CoverageEntity} CoverageEntity */
/** @typedef {import('./CoverageModel').CoverageQueryResult} CoverageQueryResult */
/** @typedef {import('./CoverageModel').CoverageQueryOptions} CoverageQueryOptions */
/** @typedef {import('./CoverageModel').CoverageResult} CoverageResult */

/**
 * Properties excluded from indexes
 * @type {string[]}
 */
const excludedIndexes = [
  'branch',
  'component',
  'org',
  'tag',
  'status',
  'functions',
  'lines',
  'branches',
  'branches',
  'coverage',
  'startTime',
  'endTime',
  'error',
  'message',
  'creator',
  'creator.id',
  'creator.displayName',
  'coverage',
  'coverage.functions',
  'coverage.lines',
  'coverage.branches',
  'coverage.coverage',
];

/**
 * A model for catalog items.
 */
export class CoverageModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('api-components-coverage');
  }

  /**
   * Lists test runs
   * @param {CoverageQueryOptions=} opts Query options
   * @return {Promise<CoverageQueryResult>} Query results.
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
    const entities = /** @type CoverageEntity[] */ (entitiesRaw.map(this.fromDatastore.bind(this)));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Insert a definition of a coverage run to the data store.
   * @param {EditableCoverageEntity} info Test definition.
   * @return {Promise<CoverageEntity>} The created resource
   */
  async insert(info) {
    const now = Date.now();
    const keyName = uuidv4();
    const key = this.createCoverageRunKey(keyName);
    const { branch='master', component, org, tag } = info;
    const insert = /** @type EditableCoverageEntity */ ({
      branch,
      created: now,
      status: 'queued',
      component,
      org,
      tag,
    });
    if (info.creator) {
      insert.creator = info.creator;
    }
    const entity = {
      key,
      data: insert,
      excludeLargeProperties: true,
      excludeFromIndexes: excludedIndexes,
    };
    await this.store.upsert(entity);
    return this.get(keyName);
  }

  // /**
  //  * Resets a run state of a coverage for a component.
  //  * @param {String} runId The id of the test run.
  //  * @return {Promise<void>}
  //  */
  // async reset(runId) {
  //   const transaction = this.store.transaction();
  //   const key = this.createCoverageRunKey(runId);
  //   try {
  //     await transaction.run();
  //     const data = await transaction.get(key);
  //     const run = /** @type CoverageEntity */ (data[0]);
  //     run.status = 'queued';
  //     delete run.functions;
  //     delete run.lines;
  //     delete run.branches;
  //     delete run.coverage;
  //     delete run.endTime;
  //     delete run.error;
  //     delete run.message;
  //     transaction.save({
  //       key,
  //       data: run,
  //       excludeFromIndexes: excludedIndexes,
  //     });
  //     await transaction.commit();
  //     background.queueCoverageRun(runId);
  //   } catch (e) {
  //     transaction.rollback();
  //     throw e;
  //   }
  // }

  /**
   * Reads a single coverage run from the data store
   * @param {string} id The id of the coverage run
   * @return {Promise<CoverageEntity>}
   */
  async get(id) {
    const key = this.createCoverageRunKey(id);
    const entity = await this.store.get(key);
    const result = entity && entity[0];
    if (result) {
      return this.fromDatastore(result);
    }
  }

  /**
   * Marks coverage run as started
   * @param {string} runId The id of the coverage run
   * @return {Promise<void>}
   */
  async start(runId) {
    const transaction = this.store.transaction();
    const key = this.createCoverageRunKey(runId);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const run = /** @type CoverageEntity */ (data[0]);
      run.status = 'running';
      run.startTime = Date.now();
      transaction.save({
        key,
        data: run,
        excludeFromIndexes: excludedIndexes,
      });
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }

  /**
   * Marks coverage run as error
   * @param {string} runId The id of the coverage run
   * @param {string} message Error message to store
   * @return {Promise<void>}
   */
  async runError(runId, message) {
    const transaction = this.store.transaction();
    const key = this.createCoverageRunKey(runId);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const run = /** @type CoverageEntity */ (data[0]);
      run.status = 'finished';
      run.endTime = Date.now();
      run.error = true;
      run.message = message;
      transaction.save({
        key,
        data: run,
        excludeFromIndexes: excludedIndexes,
      });
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }

  /**
   * Makrs tests as finished with the coverage results
   * @param {string} runId The id of the coverage run
   * @param {CoverageResult} coverage Coverage results
   * @return {Promise<void>}
   */
  async finishRun(runId, coverage) {
    const transaction = this.store.transaction();
    const key = this.createCoverageRunKey(runId);
    try {
      await transaction.run();
      const data = await transaction.get(key);
      const run = /** @type CoverageEntity */ (data[0]);
      this._finishRunSummary(transaction, key, run, coverage);
      this._addComponentCoverageRun(transaction, run, coverage);
      this._addComponentVersionCoverage(transaction, run, coverage);
      await this._addComponentCoverage(transaction, run, coverage);
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }

  /**
   * Updates values on the coverage run and stores the data in a transaction.
   * @param {Transaction} transaction Datastore transaction
   * @param {Key} key Datastore key
   * @param {CoverageEntity} run Coverage run model
   * @param {CoverageResult} coverage Coverage results
   */
  _finishRunSummary(transaction, key, run, coverage) {
    run.status = 'finished';
    run.endTime = Date.now();
    const report = { ...coverage.summary };
    if (report.branches === null) {
      delete report.branches;
    }
    if (report.functions === null) {
      delete report.functions;
    }
    if (report.lines === null) {
      delete report.lines;
    }
    run.coverage = report;
    transaction.save({
      key,
      data: run,
      excludeFromIndexes: excludedIndexes,
    });
  }

  /**
   * Creates coverage data entry for a component version
   * @param {Transaction} transaction Datastore transaction
   * @param {CoverageEntity} run Coverage run model
   * @param {CoverageResult} coverage Coverage results
   */
  _addComponentCoverageRun(transaction, run, coverage) {
    const { details } = coverage;
    const { component, tag, org } = run;
    details.forEach((detail) => {
      const { file, title, functions, lines, branches, coverage } = detail;
      const key = this.createComponentVersionFileCoverageKey(component, org, tag, file);
      transaction.save({
        key,
        excludeFromIndexes: [
          'file',
          'title',
          'functions',
          'functions.hit',
          'functions.found',
          'lines',
          'lines.hit',
          'lines.found',
          'branches',
          'branches.hit',
          'branches.found',
          'coverage',
        ],
        data: {
          file,
          title,
          functions,
          lines,
          branches,
          coverage,
        },
      });
    });
  }

  /**
   * Creates coverage data entry for a component version
   * @param {Transaction} transaction Datastore transaction
   * @param {CoverageEntity} run Coverage run model
   * @param {CoverageResult} coverage Coverage results
   */
  _addComponentVersionCoverage(transaction, run, coverage) {
    const { summary } = coverage;
    const { component, tag, org } = run;
    const key = this.createComponentVersionCoverageKey(component, org, tag);
    transaction.save({
      key,
      excludeFromIndexes: [
        'coverage',
        'coverage.functions',
        'coverage.lines',
        'coverage.branches',
        'coverage.coverage',
        'version',
      ],
      data: {
        coverage: summary,
        version: tag,
      },
    });
  }

  /**
   * Creates coverage data entry for a component, if version is greater than
   * the current stored in the data store.
   *
   * @param {Transaction} transaction Datastore transaction
   * @param {CoverageEntity} run Coverage run model
   * @param {CoverageResult} coverage Coverage results
   */
  async _addComponentCoverage(transaction, run, coverage) {
    const { component, tag, org } = run;
    if (semver.prerelease(tag)) {
      return;
    }
    const key = this.createComponentCoverageKey(component, org);
    const data = await transaction.get(key);
    if (data && data[0]) {
      const { version } = data[0];
      if (semver.gt(version, tag)) {
        return;
      }
    }
    const { summary } = coverage;
    transaction.save({
      key,
      excludeFromIndexes: [
        'coverage',
        'coverage.functions',
        'coverage.lines',
        'coverage.branches',
        'coverage.coverage',
        'version',
      ],
      data: {
        coverage: summary,
        version: tag,
      },
    });
  }

  /**
   * Removes the coverage run.
   * @param {string} runId The id of the coverage run
   * @return {Promise<void>}
   */
  async delete(runId) {
    const key = this.createCoverageRunKey(runId);
    await this.store.delete(key);
  }
}
