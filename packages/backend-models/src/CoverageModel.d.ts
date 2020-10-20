import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';
import { entity } from '@google-cloud/datastore/build/src/entity';
import { Transaction } from '@google-cloud/datastore';
import { Creator } from './types/Creator';

export declare interface EditableCoverageEntity {
  /**
   * Component's branch. Default to "master".
   */
  branch?: string;
  /**
   * The name of the component
   */
  component: string;
  /**
   * GitHub organization of the component.
   */
  org: string;
  /**
   * The release tag (version) of the component.
   */
  tag: string;
  /**
   * If the build is scheduled by a person then this person's info.
   */
  creator?: Creator;
}

export declare interface CoverageEntity extends EditableCoverageEntity, Entity {
  /**
   * Timestamp of when the object was created.
   */
  created: number;
  /**
   * Current status of the test run.
   */
  status: string;
  /**
   * The summary result of the coverage run.
   */
  coverage?: CoverageSummaryResult;
  /**
   * Timestamp when the test started
   */
  startTime?: number;
  /**
   * Timestamp when the test finished
   */
  endTime?: number;
  /**
   * A flag determining that the test resulted with an error
   */
  error?: boolean;
  /**
   * An error message.
   */
  message?: string;
}

export declare interface CoverageSummaryResult {
  /**
   * Coverage of functions
   */
  functions?: number;
  /**
   * Coverage of lines
   */
  lines?: number;
  /**
   * Coverage of branches
   */
  branches?: number;
  /**
   * Total coverage
   */
  coverage: number;
}

export declare interface CoverageFileResult {
  /**
   * Covered number
   */
  hit: number;
  /**
   * The total occurrences
   */
  found: number;
}

export declare interface CoverageReport {
  /**
   * Test title.
   */
  title?: string;
  /**
   * The file from which the report is coming from
   */
  file?: string;
  /**
   * Coverage result for functions
   */
  functions: CoverageFileResult;
  /**
   * Coverage result for lines
   */
  lines: CoverageFileResult;
  /**
   * Coverage result for branches
   */
  branches: CoverageFileResult;
  /**
   * Total coverage for the file
   */
  coverage: number;
}

declare interface CoverageRelatedEntity {
  /**
   * The id of the coverage run for the entity.
   */
  coverageId: string;
}

export declare interface CoverageReportEntity extends CoverageReport, CoverageRelatedEntity, Entity {}
export declare interface CoverageQueryResult extends QueryResult<CoverageEntity> {}
export declare interface CoverageQueryOptions extends QueryOptions {}
export declare interface CoverageFilesQueryOptions extends QueryOptions {}
export declare interface CoverageResult {
  /**
   * The summary value for the coverage runs listing
   */
  summary: CoverageSummaryResult;
  /**
   * Detailed results per file.
   */
  details: CoverageReport[];
}
export declare interface CoverageComponentVersionEntity extends CoverageRelatedEntity, Entity {
  coverage: CoverageSummaryResult,
  version: string;
}
export declare interface CoverageComponentEntity extends CoverageRelatedEntity, Entity {
  /**
   * Coverage summary
   */
  coverage: CoverageSummaryResult,
  /**
   * The version id that generated this report (the latest version)
   */
  version: string;
}

/**
 * A model for catalog items.
 */
export class CoverageModel extends BaseModel {
  constructor();

  /**
   * Lists test runs
   *
   * @param opts Query options
   * @returns Query results.
   */
  list(opts?: CoverageQueryOptions): Promise<CoverageQueryResult>;

  /**
   * Insert a definition of a coverage run to the data store.
   * @param info Test definition.
   * @returns The created resource
   */
  insert(info: EditableCoverageEntity): Promise<CoverageEntity>;

  /**
   * Reads a single coverage run from the data store
   * @param id The id of the coverage run
   */
  get(id: string): Promise<CoverageEntity|null>;

  /**
   * Marks coverage run as started
   * @param runId The id of the coverage run
   */
  start(runId: string): Promise<void>;

  /**
   * Marks coverage run as error
   * @param runId The id of the coverage run
   * @param message Error message to store
   */
  runError(runId: string, message: string): Promise<void>;

  /**
   * Marks tests as finished with the coverage results
   * @param runId The id of the coverage run
   * @param coverage Coverage results
   */
  finishRun(runId: string, coverage: CoverageResult): Promise<void>;

  /**
   * Updates values on the coverage run and stores the data in a transaction.
   * @param transaction Datastore transaction
   * @param key Datastore key
   * @param run Coverage run model
   * @param coverage Coverage results
   */
  _finishRunSummary(transaction: Transaction, key: entity.Key, run: CoverageEntity, coverage: CoverageResult): void;

  /**
   * Creates coverage data entry for each file in the run
   * @param transaction Datastore transaction
   * @param run Coverage run model
   * @param coverage Coverage results
   */
  _addComponentCoverageRun(transaction: Transaction, run: CoverageEntity, coverage: CoverageResult): void;

  /**
   * Queries for coverage results for each file in the run.
   * @param runId The ID of the test run
   * @param opts Query options
   * @return List of entities to return.
   */
  queryRunFiles(runId: string, opts?: CoverageFilesQueryOptions): Promise<QueryResult<CoverageReportEntity>>;

  /**
   * Creates coverage data entry for a component version
   * @param transaction Datastore transaction
   * @param run Coverage run model
   * @param coverage Coverage results
   */
  _addComponentVersionCoverage(transaction: Transaction, run: CoverageEntity, coverage: CoverageResult): void;

  /**
   * Creates coverage data entry for a component, if version is greater than
   * the current stored in the data store.
   *
   * @param transaction Datastore transaction
   * @param run Coverage run model
   * @param coverage Coverage results
   */
  _addComponentCoverage(transaction: Transaction, run: CoverageEntity, coverage: CoverageResult): void;

  /**
   * Reads a coverage for a version
   * @param org The component's organization
   * @param component The component name
   */
  getComponentCoverage(org: string, component: string): Promise<CoverageComponentEntity|null>;

  /**
   * Reads a coverage for a version
   * @param org The component's organization
   * @param component The component name
   * @param version The version of the component to query for the result for.
   */
  getVersionCoverage(org: string, component: string, version: string): Promise<CoverageComponentVersionEntity|null>;

  /**
   * Removes the coverage run.
   * @param runId The id of the coverage run
   */
  delete(runId: string): Promise<void>;
}
