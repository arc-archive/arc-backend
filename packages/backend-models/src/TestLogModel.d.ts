import { BaseModel, QueryResult, QueryOptions, Entity } from './BaseModel';
import { TestBrowserResult } from './TestReport';

export declare interface TestLogEntity extends TestBrowserResult, Entity {}

export declare interface TestLogQueryResult extends QueryResult<TestLogEntity> {}

export declare interface TestLogQueryOptions extends QueryOptions {}

/**
 * A model for a componet test results in a single run.
 */
export class TestLogModel extends BaseModel {
  constructor();

  /**
   * Creates a browser identificator
   * @param {object} browser A Karma's browser definition.
   */
  _makeBrowserId(browser: TestBrowserResult): string;

  /**
   * Model properties excluded from indexes
   */
  readonly excludeFromIndexes: string[];

  /**
   * @param testId The ID of the test
   * @param componentName The name of the component associated with the test
   * @param results List of browser results for a test
   * @returns Model properties excluded from indexes
   */
  addLogs(testId: string, componentName: string, results: TestBrowserResult[]): Promise<void>;

  list(testId: string, componentName: string, opts?: TestLogQueryOptions): TestLogQueryResult;

  /**
   * Reads a single browser test result
   * @param testId The ID of the test
   * @param componentName The name of the component associated with the test
   * @param logId Browser id
   */
  get(testId: string, componentName: string, logId: string): Promise<TestLogEntity|null>;

  /**
   * Removes all logs for a test.
   * @param testId The ID of the test
   */
  clearLogs(testId: string): Promise<void>;
}
