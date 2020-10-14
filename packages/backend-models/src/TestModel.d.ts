import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';
import { TestReport } from './TestReport';
import { entity } from '@google-cloud/datastore/build/src/entity';
import { Transaction } from '@google-cloud/datastore';
import { Creator } from './Creator';

export declare interface BaseTestEntity {
  /**
   * The type of the test to perform.
   * `bottom-up` or `amf-build`.
   */
  type: string;
  /**
   * A person or system that created the test.
   */
  creator: Creator;
  /**
   * The purpose of the test
   */
  purpose?: string;
}

export declare interface EditableBottomUpEntity extends BaseTestEntity {
  /**
   * SHA commit to checkout
   */
  commit?: string;
  /**
   * The branch of the component to checkout when performing the test.
   */
  branch: string;
  /**
   * Name of the component that is a base for the bottom-up tests.
   * Not used for `amf-build` tests
   */
  component?: string;
  /**
   * Name of the component's organization
   * Not used for `amf-build` tests
   */
  org?: string;
  /**
   * Whether the bottom up test should include tests
   */
  includeDev?: boolean;
}

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

export declare interface BottomUpEntity extends EditableBottomUpEntity, TestInternalEntity, Entity {

}

export declare interface EditableAmfBuildEntity extends BaseTestEntity {
  /**
   * SHA commit to of the AMF library to checkout
   */
  commit?: string;
  /**
   * The branch of the AMF library to checkout when performing the test.
   */
  branch: string;
}
export declare interface AmfBuildEntity extends EditableAmfBuildEntity, TestInternalEntity, Entity {}

export declare type TestEntity = AmfBuildEntity | BottomUpEntity;
export declare type EditableTestEntity = EditableAmfBuildEntity | EditableBottomUpEntity;

export declare interface TestQueryResult extends QueryResult<TestEntity> {}

export declare interface TestQueryOptions extends QueryOptions {}

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
   * @param {EditableTestEntity} info Entity description
   * @return {Promise<string>} The key value of the generated identifier for the entity
   */
  create(info: EditableTestEntity): Promise<string>;

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
  get(id: string): Promise<TestEntity|null>;

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
