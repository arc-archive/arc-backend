import express from 'express';
import bodyParser from 'body-parser';
import { AnalyticsModel } from '@advanced-rest-client/backend-models';
import logging from '@advanced-rest-client/arc-platform-logger';
import { BaseApi } from './BaseApi.js';

/** @typedef {import('express').Response} Response */
/** @typedef {import('express').Request} Request */

const router = express.Router();
export default router;
router.use(bodyParser.json());

/**
 * A route for ARC analytics.
 */
class AnalyticsRoute extends BaseApi {
  /**
   * @return {string[]}
   */
  get allowedTypes() {
    return ['daily', 'weekly', 'monthly'];
  }

  /**
   * @return {string[]}
   */
  get allowedScopes() {
    return ['users', 'sessions'];
  }

  /**
   * @construcotr
   */
  constructor() {
    super();
    this.model = new AnalyticsModel();
  }

  /**
   * Validates date format and range for the given type.
   *
   * Daily type needs to be a date in the past (before today).
   * Weekly type needs to be date + 7 days in the past. Also it will adjust
   * date to last Monday
   * (first day of week) if the date is not pointing to Monday.
   * Monthly have to be date adjusted to first day of month + last day of month
   * in the past.
   *
   * @param {string} type Either daily, weekly or monthly.
   * @param {string} date The query start date
   * @return {number[]} In order, start and end date
   * @throws TypeError On the date validation error.
   */
  validateDate(type, date) {
    if (!date) {
      throw new TypeError('The date parameter is required for this method.');
    }

    let time = Date.parse(date);
    if (Number.isNaN(time)) {
      let error = 'The date parameter has invalid format. ';
      error = 'Accepted format is "YYYY-MM-dd".';
      throw new TypeError(error);
    }
    // Today minimum date to check if start date is in future.
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    // Start day's minimum
    let startCalendar = new Date(time);

    const offset = startCalendar.getTimezoneOffset();
    if (offset !== 0) {
      time += (offset * 60 * 1000);
      startCalendar = new Date(time);
    }
    startCalendar.setHours(0);
    startCalendar.setMinutes(0);
    startCalendar.setSeconds(0);
    startCalendar.setMilliseconds(0);

    if (today.getTime() <= startCalendar.getTime()) {
      throw new TypeError('The date parameter must be before today.');
    }

    let endCalendar;
    if (type === 'daily') {
      endCalendar = new Date(startCalendar.getTime());
    } else if (type === 'weekly') {
      // set previous monday if current date is not a Monday
      let day = startCalendar.getDay();
      const firstDayOfWeek = 1;
      while (day !== firstDayOfWeek) {
        // subtract day
        startCalendar.setTime(startCalendar.getTime() - 86400000);
        day = startCalendar.getDay();
      }
      endCalendar = new Date(startCalendar.getTime());
      // 6 * 86400000 - add 6 days
      endCalendar.setTime(endCalendar.getTime() + 518400000);
    } else if (type === 'monthly') {
      startCalendar.setDate(1); // first day of month
      endCalendar = new Date(startCalendar.getTime());
      endCalendar.setMonth(endCalendar.getMonth() + 1);
      // day earlier is the last day of month.
      endCalendar.setTime(endCalendar.getTime() - 86400000);
    }

    endCalendar.setDate(endCalendar.getDate() + 1); // midnight next day
    // substract one millisecond to have last millisecond of
    // the last daty of date range
    endCalendar.setMilliseconds(-1);
    if (today.getTime() <= endCalendar.getTime()) {
      let message = 'The date end range must be before today. Date range ends ';
      message += `${endCalendar.getFullYear() }-`;
      message += `${endCalendar.getMonth() + 1 }-`;
      message += endCalendar.getDate();
      throw new TypeError(message);
    }
    return [startCalendar.getTime(), endCalendar.getTime()];
  }

  /**
   * @param {string} date
   * @return {Date}
   */
  getDatePast(date) {
    if (!date) {
      throw new TypeError('Invalid parameter.');
    }

    let time = Date.parse(date);
    if (Number.isNaN(time)) {
      let error = 'The date parameter has invalid format. ';
      error = 'Accepted format is "YYYY-MM-dd".';
      throw new TypeError(error);
    }
    // Today minimum date to check if start date is in future.
    const today = new Date();
    today.setHours(0);
    today.setMinutes(0);
    today.setSeconds(0);
    today.setMilliseconds(0);

    // Start day's minimum
    let startCalendar = new Date(time);
    const offset = startCalendar.getTimezoneOffset();
    if (offset !== 0) {
      time += (offset * 60 * 1000);
      startCalendar = new Date(time);
    }
    startCalendar.setHours(0);
    startCalendar.setMinutes(0);
    startCalendar.setSeconds(0);
    startCalendar.setMilliseconds(0);

    if (today.getTime() <= startCalendar.getTime()) {
      throw new TypeError('The date parameter must be before today.');
    }

    return startCalendar;
  }

  /**
   * Sends query results
   * @param {Response} res
   * @param {Object} data
   */
  sendQueryResults(res, data) {
    const { kind, sessions, users, items } = data;
    const obj = {
      kind,
    };
    if (items) {
      obj.result = sessions || users;
      obj.items = items;
    } else {
      obj.items = sessions || users;
    }
    const body = JSON.stringify(obj, null, 2);
    res.set('Content-Type', 'application/json');
    res.status(200).send(body);
  }

  /**
   * Queries for a custom time range.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async queryCustom(req, res) {
    const scope = req.params.scope;
    if (this.allowedScopes.indexOf(scope) === -1) {
      return this.sendError(res, 'Unknown path', 400);
    }

    const { start, end } = req.query;
    try {
      const startDate = this.getDatePast(start ? String(start) : null);
      const endDate = this.getDatePast(end ? String(end) : null);
      let fn = 'queryCustomRange';
      fn += scope[0].toUpperCase();
      fn += scope.substr(1);
      const result = await this.model[fn](startDate.getTime(), endDate.getTime());
      if (!result) {
        // not yet ready
        this.sendError(res, 'Not yet computed.', 404);
      } else {
        this.sendQueryResults(res, result);
      }
    } catch (e) {
      this.sendError(res, e.message, 400);
    }
  }

  /**
   * Queries for data
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async query(req, res) {
    const { type, scope } = req.params;

    if (this.allowedTypes.indexOf(type) === -1 ||
      this.allowedScopes.indexOf(scope) === -1) {
      this.sendError(res, 'Unknown path', 400);
      return;
    }

    const { date } = req.query;
    try {
      const [start, end] = this.validateDate(type, date ? String(date) : null);
      const result = await this._runQueryService(type, scope, start, end);
      if (!result) {
        // not yet ready
        this.sendError(res, 'Not yet computed.', 404);
      } else {
        this.sendQueryResults(res, result);
      }
    } catch (e) {
      logging.error(e);
      this.sendError(res, e.message, 400);
      return;
    }
  }

  /**
   * Runs a function defined in the data model
   * @param {string} type
   * @param {string} scope
   * @param {number} start
   * @param {number} end
   * @return {Promise}
   */
  async _runQueryService(type, scope, start, end) {
    let fn = 'query';
    fn += type[0].toUpperCase();
    fn += type.substr(1);
    fn += scope[0].toUpperCase();
    fn += scope.substr(1);

    return this.model[fn](start, end);
  }

  /**
   * Rocords a session from ARC app.
   * @param {Request} req
   * @param {Response} res
   * @return {Promise<void>}
   */
  async record(req, res) {
    if (!req.body) {
      this.sendError(res, 'Body not present.', 400);
      return;
    }
    const tz = req.body.tz;
    const anonymousId = req.body.aid;

    let message = '';
    if (!anonymousId) {
      message += 'The `aid` (anonymousId) parameter is required. ';
    }
    if (!tz && tz !== 0) {
      message += 'The `tz` (timeZoneOffset) parameter is required.';
    }
    if (message) {
      this.sendError(res, message, 400);
      return;
    }
    const timeZoneOffset = Number(tz);
    if (Number.isNaN(timeZoneOffset)) {
      this.sendError(res, `timeZoneOffset is invalid: ${tz}. Expecting integer.`, 400);
      return;
    }
    try {
      const result = await this.model.recordSession(anonymousId, timeZoneOffset);
      if (result.newSession) {
        res.status(204).end();
      } else {
        res.status(205).end();
      }
    } catch (e) {
      this.sendError(res, e.message, 500);
      logging.error(e);
    }
  }
}

const api = new AnalyticsRoute();
api.setCors(router);
api.wrapApi(router, [
  ['/query/custom/:scope', 'queryCustom'],
  ['/query/:type/:scope', 'query'],
  ['/record', 'record', 'post'],
]);
