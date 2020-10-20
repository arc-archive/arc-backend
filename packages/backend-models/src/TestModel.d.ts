import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';
import { TestReport } from './types/TestReport';
import { entity } from '@google-cloud/datastore/build/src/entity';
import { Transaction } from '@google-cloud/datastore';
import { TestQueryResult, TestQueryOptions, AmfTest, BottomUpTest, AmfTestEntity, BottomUpTestEntity } from './types/ComponentTest';

declare interface TestInternalEntity {
  error: boolean;
  message: string;
  endTime: number;
  startTime: number;
  status: string;
  failed: number;
  passed: number;
  size: number;
  created: number;
}

/**
 * A model for catalog items.
 */
export class TestModel extends BaseModel {
  constructor();

  /**
   * @return Model properties excluded from indexes
   */
  readonly excludedIndexes: string[];

  /**
   * Lists test scheduled in the data store.
   * @param opts Query options
   */
  list(opts?: TestQueryOptions): Promise<TestQueryResult>;

  /**
   * Insets a test to the data store.
   * NOTE, it won't schedule a test in the corresponding background application.
   *
   * @param info Entity description
   * @return The key value of the generated identifier for the entity
   */
  create(info: AmfTest|BottomUpTest): Promise<string>;

  /**
   * Insets a test to the data store.
   * NOTE, it won't schedule a test in the corresponding background application.
   *
   * @param info Entity description
   * @returns The key value of the generated identifier for the entity
   */
  insertBottomUp(info: BottomUpTest): Promise<string>;

  /**
   * Insets a test to the data store.
   * NOTE, it won't schedule a test in the corresponding background application.
   *
   * @param info Entity description
   * @returns The key value of the generated identifier for the entity
   */
  insertAmf(info: AmfTest): Promise<string>;

  /**
   * Resets test state.
   * NOTE, it won't schedule a test in the corresponding background application.
   *
   * @param {string} testId The ID of the test to reset.
   */
  resetTest(testId: string): Promise<void>;

  /**
   * Gets test definition from the store.
   * @param id The ID of the test.
   */
  get(id: string): Promise<AmfTestEntity|BottomUpTestEntity|null>;

  /**
   * Gets test definition from the store.
   * @param id The ID of the test.
   */
  start(id: string): Promise<void>;

  setTestError(id: string, message: string): Promise<void>;

  setScope(id: string, size: number): Promise<void>;

  setComponentError(id: string): Promise<void>;

  updateComponentResult(id: string, report: TestReport): Promise<void>;

  finish(id: string, message?: string): Promise<void>;

  updateTestProperties(id: string, props: object): Promise<void>;

  delete(id: string): Promise<void>;

  /**
   * Deletes components associated with a test
   * @param transaction Running transaction
   * @param key Test key
   */
  _deleteComponents(transaction: Transaction, key: entity.Key): Promise<void>;

  /**
   * Deletes logs associated with a test
   * @param transaction Running transaction
   * @param Test key
   */
  _deleteLogs(transaction: Transaction, key: entity.Key): Promise<void>;
}
