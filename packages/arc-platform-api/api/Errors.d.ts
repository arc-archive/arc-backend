/**
 * Base error class for ARC APIs.
 */
export declare class ApiError extends Error {
  /**
   * Error code
   */
  code: number;
  /**
   * @param message Error message.
   * @param code Error code.
   */
  constructor(message: string, code: number)
}

/**
 * An error associated with missing access rights to a resource.
 */
export declare class AccessError extends ApiError {
  /**
   * @param message Error message. Default to "Unauthorized"
   * @param code Error code. Default to 401.
   */
  constructor(message?: string, code?: number);
}

/**
 * An error associated with client parameters issues.
 */
export declare class ClientError extends Error {
  /**
   * @param message Error message. Default to "Invalid request".
   * @param code Error code. Default to 400.
   */
  constructor(message?: string, code?: number);
}
