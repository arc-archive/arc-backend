import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';
import { TestReport } from './TestReport';

export declare interface BaseTestComponentEntity {
  component: string;
}

export declare interface TestComponentEntity extends Entity, BaseTestComponentEntity {
  component: string;
  status: string;
  startTime: number;
  /**
   * Number of total tests performed in the run
   */
  total?: number;
  /**
   * Number of tests resulted with a success status
   */
  success?: number;
  /**
   * Number of tests resulted with a failed status
   */
  failed?: number;
  /**
   * Number of tests that were skipped
   */
  skipped?: number;
  /**
   * Whether has log data for the test
   */
  hasLogs?: boolean;
  /**
   * Indicates run error
   */
  error?: boolean;
  /**
   * Error message
   */
  message?: string;
}

export declare interface TestComponentQueryResult extends QueryResult<TestComponentEntity> {}

export declare interface TestComponentQueryOptions extends QueryOptions {}

/**
 * A model for a componet test results in a run.
 */
export class TestComponentModel extends BaseModel {
  constructor();

  /**
   * Creates a "running" test for a component.
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @return {Promise<void>}
   */
  create(testId: string, componentName: string): Promise<void>

  /**
   * Reads the model data from the data store
   * @param {string} testId The ID of the test
   * @param {string} componentName The name of the component associated with the test
   * @return {Promise<TestComponentEntity|null>}
   */
  get(testId: string, componentName: string): Promise<TestComponentEntity|null>

  /**
   * Updates component test results with the data from the test report.
   * @param testId The ID of the test
   * @param componentName The name of the component associated with the test
   * @param report The name of the component associated with the test
   */
  updateComponent(testId: string, componentName: string, report: TestReport): Promise<void>;

  /**
   * Updates the component to the error state.
   *
   * @param testId The ID of the test
   * @param componentName The name of the component associated with the test
   * @param message Error message
   */
  updateComponentError(testId: string, componentName: string, message: string): Promise<void>;

  /**
   * Lists component tests
   * @param testId [description]
   * @param opts Query options
   */
  list(testId: string, opts?: TestComponentQueryOptions): Promise<TestComponentQueryResult>;

  clearResult(testId: string): Promise<void>;
}
