export declare interface TestBrowserResult {
  browser: string;
  endTime: number;
  startTime: number;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  error: number;
  message?: string;
  /**
   * Stringified test logs
   */
  logs?: string;
}

export declare interface TestReport {
  /**
   * Whether a test run resulted with an error
   */
  error?: boolean;
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
   * Detailed test results.
   */
  results: TestBrowserResult[]
}
