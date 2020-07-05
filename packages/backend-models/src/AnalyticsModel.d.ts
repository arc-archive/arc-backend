import { BaseModel } from './BaseModel.js';
import {entity} from '@google-cloud/datastore/build/src/entity';


export declare interface ActiveUser {
  appId: string;
  day: number;
}
export declare interface ActiveSession {
  appId: string;
  day: number;
  lastActive: number;
}
export declare interface ActiveSessionCreateResult extends ActiveSession {
  /**
   * When set to tru a new session was created (no previous session was find)
   */
  newSession: boolean;
}
export declare interface DailyUser {
  day: number;
  items: number;
}
export declare interface DailySession {
  day: number;
  items: number;
}
export declare interface DailyUsersQueryResult {
  kind: string;
  users: number;
}
export declare interface WeeklyUsersQueryResult {
  kind: string;
  users: number;
  items: DailyUser[];
}
export declare interface MonthlyUsersQueryResult {
  kind: string;
  users: number;
  items: DailyUser[];
}
export declare interface DailySessionsQueryResult {
  kind: string;
  sessions: number;
}
export declare interface WeeklySessionsQueryResult {
  kind: string;
  sessions: number;
  items: DailySession[];
}
export declare interface MonthlySessionsQueryResult {
  kind: string;
  sessions: number;
  items: DailySession[];
}
export declare interface CustomSessionsQueryResult {
  kind: string;
  items: DailySession[];
}
export declare interface CustomUserQueryResult {
  kind: string;
  items: DailyUser[];
}

/**
 * A model for catalog items.
 */
export class AnalyticsModel extends BaseModel {
  constructor();

  /**
   * Records user and user's session in analytics datastore.
   *
   * @param applicationId The client generated Application ID.
   * @param timeZoneOffset Client's timezone offset.
   * @returns True if new session has been recorded or false if existing
   * session has been updated.
   */
  recordSession(applicationId: string, timeZoneOffset: number): Promise<ActiveSessionCreateResult>;

  /**
   * Ensures that the record in User entity group exists for given application ID.
   *
   * @param applicationId Anonymized application ID.
   * @param time A timestamp of the day of the user visit.
   * @returns Promise will resolve when there's a user object or if one hyas been
   * created.
   */
  ensureUserRecord(applicationId: string, time: number): Promise<ActiveUser>;

  /**
   * Gets existing record for the application ID.
   * It search for application id that has been recorded today.
   *
   * @param applicationId Anonymized application ID.
   * @param time A timestamp of the day of the user visit.
   * @returns Promise Will resolve to entity object or to null if not found.
   */
  getActiveUser(applicationId: string, time: number): Promise<ActiveUser>;

  /**
   * Creates a user record for today.
   *
   * @param applicationId Anonymized application ID.
   * @param time A timestamp of the day of the user visit.
   * @returns
   */
  createActiveUser(applicationId: string, time: number): Promise<ActiveUser>;

  /**
   * Generates a User group key based on the application ID.
   *
   * @param applicationId Anonymized application ID.
   * @param time A timestamp of the day of the user visit.
   * @return
   */
  getUserKey(applicationId: string, time: number): entity.Key;

  /**
   * Ensures that the user session exists in the datastore.
   *
   * @param applicationId Anonymized application ID.
   * @param time A timestamp of the day of the user visit.
   * @returns If true then new session wass created and false if session already
   * existed in the datastore.
   */
  ensureSession(applicationId: string, time: number): Promise<ActiveSessionCreateResult>;

  /**
   * Gets a user session recorded in last 30 minutes.
   *
   * @param applicationId Anonymized application ID.
   * @param time A timestamp of the day of the user visit.
   * @returns Promise resolved to an entity or to null if session not found.
   */
  getActiveSession(applicationId: string, time: number): Promise<ActiveSession|null>;

  /**
   * Updates active session data
   * @param {ActiveSession} entity An entity to update
   * @param time Updated session time
   */
  updateActiveSession(entity: ActiveSession, time: number): Promise<ActiveSessionCreateResult>;

  /**
   * @returns Session store key with auto-increment value.
   */
  createSessionKey(): entity.Key;

  /**
   * Creates a session entry
   * @param applicationId The application ID
   * @param time The time of the session
   */
  createActiveSession(applicationId: string, time: number): Promise<ActiveSessionCreateResult>;

  /**
   * Gets the computed number of users for a day
   *
   * @param time A timestamp of the day
   * @returns Null when it is not yet computed
   */
  queryDailyUsers(time: number): Promise<DailyUsersQueryResult|null>;

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the WeeklyUsers group
   * and `start` and `end` to query for days.
   *
   * @param start A timestamp of the start day in the date range.
   * @param end A timestamp of the last day in the date range.
   * @returns Null when data is not yet computed
   */
  queryWeeklyUsers(start: number, end: number): Promise<WeeklyUsersQueryResult|null>;

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the `MonthlyUsers` group
   * and `start` and `end` to query for days.
   *
   * @param start A timestamp of the start day in the date range.
   * @param end A timestamp of the last day in the date range.
   * @returns Null when data is not yet computed
   */
  queryMonthlyUsers(start: number, end: number): Promise<MonthlyUsersQueryResult|null>;

  /**
   * Queries for daily uses list
   * @param start Time start for the query
   * @param end Time end of the query
   * @returns List of users day by day
   */
  _queryDailyUsers(start: number, end: number): Promise<DailyUser[]>;

  /**
   * Gets the computed number of sessions for given day
   *
   * @param time A timestamp of the day
   * @returns Null when data is not yet computed
   */
  queryDailySessions(time: number): Promise<DailySessionsQueryResult|null>;

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the WeeklyUsers group
   * and `start` and `end` to query for days.
   *
   * @param start A timestamp of the start day in the date range.
   * @param end A timestamp of the last day in the date range.
   * @returns Null when data is not yet computed
   */
  queryWeeklySessions(start: number, end: number): Promise<WeeklySessionsQueryResult|null>;

  /**
   * Gets the computed number of sessions for given month.
   * The function uses the `start` argument to get the data from the `MonthlySessions` group
   * and `start` and `end` to query for days.
   *
   * @param start A timestamp of the start day in the date range.
   * @param end A timestamp of the last day in the date range.
   * @returns Null when data is not yet computed
   */
  queryMonthlySessions(start: number, end: number): Promise<MonthlySessionsQueryResult|null>;

  /**
   * Queries for session data day-by-day
   * @param start A timestamp of the start day in the date range.
   * @param end A timestamp of the last day in the date range.
   * @returns Sessions in a date range
   */
  _queryDailySessions(start: number, end: number): Promise<DailySession[]>;

  /**
   * Queries for session data in a custom range
   * @param start A timestamp of the start day in the date range.
   * @param end A timestamp of the last day in the date range.
   * @returns Sessions in a date range
   */
  queryCustomRangeSessions(start: number, end: number): Promise<CustomSessionsQueryResult>;

  /**
   * Queries for user data in a custom range
   * @param start A timestamp of the start day in the date range.
   * @param end A timestamp of the last day in the date range.
   * @returns Users in a date range
   */
  queryCustomRangeUsers(start: number, end: number): Promise<CustomUserQueryResult>;
}
