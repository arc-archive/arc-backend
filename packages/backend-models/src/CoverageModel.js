import semver from 'semver';
import { v4 } from 'uuid';
import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('@google-cloud/datastore').Transaction} Transaction */
/** @typedef {import('./CoverageModel').EditableCoverageEntity} EditableCoverageEntity */
/** @typedef {import('./CoverageModel').CoverageEntity} CoverageEntity */
/** @typedef {import('./CoverageModel').CoverageQueryResult} CoverageQueryResult */
/** @typedef {import('./CoverageModel').CoverageQueryOptions} CoverageQueryOptions */
/** @typedef {import('./CoverageModel').CoverageResult} CoverageResult */
/** @typedef {import('./CoverageModel').CoverageFilesQueryOptions} CoverageFilesQueryOptions */
/** @typedef {import('./CoverageModel').CoverageComponentVersionEntity} CoverageComponentVersionEntity */
/** @typedef {import('./CoverageModel').CoverageComponentEntity} CoverageComponentEntity */
/** @typedef {import('./BaseModel').QueryResult} QueryResult */

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
    let query = this.store.createQuery(this.coverageNamespace, this.coverageRunKind);
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
    const keyName = v4();
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

  /**
   * Reads a single coverage run from the data store
   * @param {string} id The id of the coverage run
   * @return {Promise<CoverageEntity|null>}
   */
  async get(id) {
    const key = this.createCoverageRunKey(id);
    const entity = await this.store.get(key);
    const result = entity && entity[0];
    if (result) {
      return this.fromDatastore(result);
    }
    return null;
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
      const item = /** @type CoverageEntity */ (data[0]);
      item.status = 'running';
      item.startTime = Date.now();
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
      const item = /** @type CoverageEntity */ (data[0]);
      item.status = 'finished';
      item.endTime = Date.now();
      item.error = true;
      item.message = message;
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
   * Marks tests as finished with the coverage results
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
      const item = /** @type CoverageEntity */ (data[0]);
      this._finishRunSummary(transaction, key, item, coverage);
      this._addComponentCoverageRun(transaction, item, coverage, runId);
      this._addComponentVersionCoverage(transaction, item, coverage, runId);
      await this._addComponentCoverage(transaction, item, coverage, runId);
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
   * @param {CoverageEntity} item Coverage run model
   * @param {CoverageResult} coverage Coverage results
   */
  _finishRunSummary(transaction, key, item, coverage) {
    item.status = 'finished';
    item.endTime = Date.now();
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
    item.coverage = report;
    transaction.save({
      key,
      data: item,
      excludeFromIndexes: excludedIndexes,
    });
  }

  /**
   * Creates coverage data entry for each file in the run
   *
   * @param {Transaction} transaction Datastore transaction
   * @param {CoverageEntity} item Coverage run model
   * @param {CoverageResult} report Coverage results
   * @param {string} coverageId Test run ID related to this coverage
   */
  _addComponentCoverageRun(transaction, item, report, coverageId) {
    const { details } = report;
    const { component, tag, org } = item;
    details.forEach((detail) => {
      const { file = v4(), title, functions, lines, branches, coverage } = detail;
      // file here has a default value just in case Karma decided not to report this.
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
          'coverageId',
        ],
        data: {
          file,
          title,
          functions,
          lines,
          branches,
          coverage,
          coverageId,
        },
      });
    });
  }

  /**
   * Queries for coverage results for each file in the run.
   * @param {string} runId The ID of the test run
   * @param {CoverageFilesQueryOptions=} opts Query options
   * @return {Promise<QueryResult>} A list of entities to return.
   */
  async queryRunFiles(runId, opts={}) {
    const runModel = await this.get(runId);
    const { component, org, tag } = runModel;
    const key = this.createComponentVersionCoverageKey(component, org, tag);
    const { limit=this.listLimit, pageToken } = opts;
    let query = this.store.createQuery(this.coverageNamespace, this.coverageComponentKind);
    query = query.hasAncestor(key);
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
   * Creates coverage data entry for a component version
   * @param {Transaction} transaction Datastore transaction
   * @param {CoverageEntity} item Coverage run model
   * @param {CoverageResult} coverage Coverage results
   * @param {string} coverageId Test run ID related to this coverage
   */
  _addComponentVersionCoverage(transaction, item, coverage, coverageId) {
    const { summary } = coverage;
    const { component, tag, org } = item;
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
        'coverageId',
      ],
      data: {
        coverage: summary,
        version: tag,
        coverageId,
      },
    });
  }

  /**
   * Reads a coverage for a version
   * @param {string} org The component's organization
   * @param {string} component The component name
   * @param {string} version The version of the component to query for the result for.
   * @return {Promise<CoverageComponentVersionEntity|null>}
   */
  async getVersionCoverage(org, component, version) {
    const key = this.createComponentVersionCoverageKey(component, org, version);
    const entity = await this.store.get(key);
    const result = entity && entity[0];
    if (result) {
      return this.fromDatastore(result);
    }
    return null;
  }

  /**
   * Creates coverage data entry for a component, if version is greater than
   * the current stored in the data store.
   *
   * @param {Transaction} transaction Datastore transaction
   * @param {CoverageEntity} item Coverage run model
   * @param {CoverageResult} coverage Coverage results
   * @param {string} coverageId Test run ID related to this coverage
   */
  async _addComponentCoverage(transaction, item, coverage, coverageId) {
    const { component, tag, org } = item;
    if (semver.prerelease(tag)) {
      return;
    }
    const key = this.createComponentCoverageKey(component, org);
    const data = await transaction.get(key);
    if (data && data[0]) {
      const { version } = data[0];
      // coverage for an older version
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
        'coverageId',
      ],
      data: {
        coverage: summary,
        version: tag,
        coverageId,
      },
    });
  }

  /**
   * Reads a coverage for a version
   * @param {string} org The component's organization
   * @param {string} component The component name
   * @return {Promise<CoverageComponentEntity|null>}
   */
  async getComponentCoverage(org, component) {
    const key = this.createComponentCoverageKey(component, org);
    const entity = await this.store.get(key);
    const result = entity && entity[0];
    if (result) {
      return this.fromDatastore(result);
    }
    return null;
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
