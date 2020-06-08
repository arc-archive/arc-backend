import { BaseModel } from './BaseModel.js';
import dateFormat from './DateFormat.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('./AnalyticsModel').ActiveUser} ActiveUser */
/** @typedef {import('./AnalyticsModel').ActiveSession} ActiveSession */
/** @typedef {import('./AnalyticsModel').DailyUser} DailyUser */
/** @typedef {import('./AnalyticsModel').DailySession} DailySession */
/** @typedef {import('./AnalyticsModel').DailyUsersQueryResult} DailyUsersQueryResult */
/** @typedef {import('./AnalyticsModel').WeeklyUsersQueryResult} WeeklyUsersQueryResult */
/** @typedef {import('./AnalyticsModel').MonthlyUsersQueryResult} MonthlyUsersQueryResult */
/** @typedef {import('./AnalyticsModel').DailySessionsQueryResult} DailySessionsQueryResult */
/** @typedef {import('./AnalyticsModel').WeeklySessionsQueryResult} WeeklySessionsQueryResult */
/** @typedef {import('./AnalyticsModel').MonthlySessionsQueryResult} MonthlySessionsQueryResult */
/** @typedef {import('./AnalyticsModel').CustomSessionsQueryResult} CustomSessionsQueryResult */
/** @typedef {import('./AnalyticsModel').CustomUserQueryResult} CustomUserQueryResult */

/**
 * A model for catalog items.
 */
export class AnalyticsModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('analytics');
  }

  /**
   * Records user and user's session in analytics datastore.
   *
   * @param {string} applicationId The client generated Application ID.
   * @param {number} timeZoneOffset Client's timezone offset.
   * @return {Promise<boolean>} True if new session has been recorded or false if existing
   * session has been updated.
   */
  async recordSession(applicationId, timeZoneOffset) {
    let time = Date.now();
    time += timeZoneOffset;
    await this.ensureUserRecord(applicationId, time);
    return this.ensureSession(applicationId, time);
  }

  /**
   * Ensures that the record in User entity group exists for given application ID.
   *
   * @param {string} applicationId Anonymized application ID.
   * @param {number} time A timestamp of the day of the user visit.
   * @return {Promise<ActiveUser>} Promise will resolve when there's a user object or if one hyas been
   * created.
   */
  async ensureUserRecord(applicationId, time) {
    let entity = await this.getActiveUser(applicationId, time);
    if (!entity) {
      entity = await this.createActiveUser(applicationId, time);
    }
    return entity;
  }

  /**
   * Gets existing record for the application ID.
   * It search for application id that has been recorded today.
   *
   * @param {string} applicationId Anonymized application ID.
   * @param {number} time A timestamp of the day of the user visit.
   * @return {Promise<ActiveUser>} Promise Will resolve to entity object or to null if not found.
   */
  async getActiveUser(applicationId, time) {
    const entryKey = this.getUserKey(applicationId, time);
    try {
      const [entry] = await this.store.get(entryKey);
      return entry;
    } catch (_) {
      return null;
    }
  }

  /**
   * Creates a user record for today.
   *
   * @param {string} applicationId Anonymized application ID.
   * @param {number} time A timestamp of the day of the user visit.
   * @return {Promise<ActiveUser>}
   */
  async createActiveUser(applicationId, time) {
    const entryKey = this.getUserKey(applicationId, time);
    await this.store.upsert({
      key: entryKey,
      data: {
        appId: applicationId,
        day: Date.now(),
      },
    });
    const [entry] = await this.store.get(entryKey);
    return entry;
  }

  /**
   * Generates a User group key based on the application ID.
   *
   * @param {string} applicationId Anonymized application ID.
   * @param {number} time A timestamp of the day of the user visit.
   * @return {Key}
   */
  getUserKey(applicationId, time) {
    time = time || Date.now();
    const entryStringKey = dateFormat(new Date(time), 'YYYYMMdd');
    return this.store.key({
      namespace: this.namespace,
      path: ['User', `${applicationId }/${ entryStringKey}`],
    });
  }

  /**
   * Ensures that the user session exists in the datastore.
   *
   * @param {string} applicationId Anonymized application ID.
   * @param {number} time A timestamp of the day of the user visit.
   * @return {Promise<boolean>} If true then new session wass created and false if session already
   * existed in the datastore.
   */
  async ensureSession(applicationId, time) {
    const entity = await this.getActiveSession(applicationId, time);
    if (entity) {
      return this.updateActiveSession(entity, time);
    }
    return this.createActiveSession(applicationId, time);
  }

  /**
   * Gets a user session recorded in last 30 minutes.
   *
   * @param {string} applicationId Anonymized application ID.
   * @param {number} time A timestamp of the day of the user visit.
   * @return {Promise<ActiveSession|null>} Promise resolved to an entity or to null if session not found.
   */
  async getActiveSession(applicationId, time) {
    const past = time - 1800000;
    const query = this.store.createQuery(this.namespace, 'Session')
        .filter('appId', '=', applicationId)
        .filter('lastActive', '>=', past)
        .order('lastActive', {
          descending: true,
        })
        .limit(1);
    const [entities] = await this.store.runQuery(query);
    if (entities && entities.length) {
      return /** @type ActiveSession */ (entities[0]);
    }
    return null;
  }

  /**
   * Updates active session data
   * @param {ActiveSession} entity An entity to update
   * @param {number} time Updated session time
   * @return {Promise<boolean>}
   */
  async updateActiveSession(entity, time) {
    entity.lastActive = time;
    await this.store.upsert(entity);
    return false;
  }

  /**
   * Creates a session entry
   * @param {string} applicationId The application ID
   * @param {number} time The time of the session
   * @return {Promise<boolean>}
   */
  async createActiveSession(applicationId, time) {
    const entryKey = this.store.key({
      namespace: this.namespace,
      path: ['Session'],
    });
    const entity = {
      key: entryKey,
      data: {
        appId: applicationId,
        day: time,
        lastActive: time,
      },
    };
    await this.store.save(entity);
    return true;
  }

  /**
   * Gets the computed number of users for a day
   *
   * @param {number} time A timestamp of the day
   * @return {Promise<DailyUsersQueryResult|null>} Null when it is not yet computed
   */
  async queryDailyUsers(time) {
    const key = this.store.key({
      namespace: this.namespace,
      path: ['DailyUsers', dateFormat(new Date(time), 'yyyy-MM-dd')],
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    return {
      users: entity.users,
      kind: 'ArcAnalytics#DailyUsers',
    };
  }

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the WeeklyUsers group
   * and `start` and `end` to query for days.
   *
   * @param {number} start A timestamp of the start day in the date range.
   * @param {number} end A timestamp of the last day in the date range.
   * @return {Promise<WeeklyUsersQueryResult|null>} Null when data is not yet computed
   */
  async queryWeeklyUsers(start, end) {
    const day = dateFormat(new Date(start), 'yyyy-MM-dd');
    const key = this.store.key({
      namespace: this.namespace,
      path: ['WeeklyUsers', day],
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    const items = await this._queryDailyUsers(start, end);
    return {
      users: entity.users,
      items,
      kind: 'ArcAnalytics#WeeklyUsers',
    };
  }

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the `MonthlyUsers` group
   * and `start` and `end` to query for days.
   *
   * @param {number} start A timestamp of the start day in the date range.
   * @param {number} end A timestamp of the last day in the date range.
   * @return {Promise<MonthlyUsersQueryResult|null>} Null when data is not yet computed
   */
  async queryMonthlyUsers(start, end) {
    const day = dateFormat(new Date(start), 'yyyy-MM');
    const key = this.store.key({
      namespace: this.namespace,
      path: ['MonthlyUsers', day],
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    const items = await this._queryDailyUsers(start, end);
    return {
      users: entity.users,
      items,
      kind: 'ArcAnalytics#MonthlyUsers',
    };
  }

  /**
   * Queries for daily uses list
   * @param {number} start Time start for the query
   * @param {number} end Time end of the query
   * @return {Promise<DailyUser[]>} List of users day by day
   */
  async _queryDailyUsers(start, end) {
    const query = this.store.createQuery(this.namespace, 'DailyUsers')
        .filter('day', '>=', start)
        .filter('day', '<=', end);
    const [entities] = await this.store.runQuery(query);
    if (!entities || !entities.length) {
      return [];
    }
    const keySymbol = this.store.KEY;
    return entities.map((entity) => {
      const day = entity[keySymbol].name;
      return {
        day,
        items: entity.users,
      };
    });
  }

  /**
   * Gets the computed number of sessions for given day
   *
   * @param {number} time A timestamp of the day
   * @return {Promise<DailySessionsQueryResult|null>} Null when data is not yet computed
   */
  async queryDailySessions(time) {
    const key = this.store.key({
      namespace: this.namespace,
      path: ['DailySessions', dateFormat(new Date(time), 'yyyy-MM-dd')],
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    return {
      kind: 'ArcAnalytics#DailySessions',
      sessions: entity.sessions,
    };
  }

  /**
   * Gets the computed number of users for given week bound in given date range
   * The function uses the `start` argument to get the data from the WeeklyUsers group
   * and `start` and `end` to query for days.
   *
   * @param {number} start A timestamp of the start day in the date range.
   * @param {number} end A timestamp of the last day in the date range.
   * @return {Promise<WeeklySessionsQueryResult|null>} Null when data is not yet computed
   */
  async queryWeeklySessions(start, end) {
    const day = dateFormat(new Date(start), 'yyyy-MM-dd');
    const key = this.store.key({
      namespace: this.namespace,
      path: ['WeeklySessions', day],
    });
    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    const items = await this._queryDailySessions(start, end);
    return {
      kind: 'ArcAnalytics#WeeklySessions',
      sessions: entity.sessions,
      items,
    };
  }

  /**
   * Gets the computed number of sessions for given month.
   * The function uses the `start` argument to get the data from the `MonthlySessions` group
   * and `start` and `end` to query for days.
   *
   * @param {number} start A timestamp of the start day in the date range.
   * @param {number} end A timestamp of the last day in the date range.
   * @return {Promise<MonthlySessionsQueryResult|null>} Null when data is not yet computed
   */
  async queryMonthlySessions(start, end) {
    const day = dateFormat(new Date(start), 'yyyy-MM');
    const key = this.store.key({
      namespace: this.namespace,
      path: ['MonthlySessions', day],
    });

    const [entity] = await this.store.get(key);
    if (!entity) {
      return null;
    }
    const items = await this._queryDailySessions(start, end);
    return {
      kind: 'ArcAnalytics#MonthlySessions',
      sessions: entity.sessions,
      items,
    };
  }

  /**
   * Queries for session data day-by-day
   * @param {number} start A timestamp of the start day in the date range.
   * @param {number} end A timestamp of the last day in the date range.
   * @return {Promise<DailySession[]>} Sessions in a date range
   */
  async _queryDailySessions(start, end) {
    const query = this.store.createQuery('analytics', 'DailySessions')
        .filter('day', '>=', start)
        .filter('day', '<=', end);
    const [entities] = await this.store.runQuery(query);
    if (!entities || !entities.length) {
      return [];
    }
    const keySymbol = this.store.KEY;
    return entities.map((entity) => {
      const day = entity[keySymbol].name;
      return {
        day,
        items: entity.sessions,
      };
    });
  }

  /**
   * Queries for session data in a custom range
   * @param {number} start A timestamp of the start day in the date range.
   * @param {number} end A timestamp of the last day in the date range.
   * @return {Promise<CustomSessionsQueryResult>} Sessions in a date range
   */
  async queryCustomRangeSessions(start, end) {
    const query = this.store.createQuery('analytics', 'DailySessions')
        .filter('day', '>=', start)
        .filter('day', '<=', end);
    const [entities] = await this.store.runQuery(query);
    if (!entities || !entities.length) {
      return {
        kind: 'ArcAnalytics#CutomRangeSessions',
        items: [],
      };
    }
    const keySymbol = this.store.KEY;
    const items = entities.map((entity) => {
      const day = entity[keySymbol].name;
      return {
        day,
        items: entity.sessions,
      };
    });
    return {
      kind: 'ArcAnalytics#CutomRangeSessions',
      items,
    };
  }

  /**
   * Queries for user data in a custom range
   * @param {number} start A timestamp of the start day in the date range.
   * @param {number} end A timestamp of the last day in the date range.
   * @return {Promise<CustomUserQueryResult>} Users in a date range
   */
  async queryCustomRangeUsers(start, end) {
    const query = this.store.createQuery('analytics', 'DailyUsers')
        .filter('day', '>=', start)
        .filter('day', '<=', end);
    const [entities] = await this.store.runQuery(query);
    if (!entities || !entities.length) {
      return {
        kind: 'ArcAnalytics#CutomRangeUsers',
        items: [],
      };
    }
    const keySymbol = this.store.KEY;
    const items = entities.map((entity) => {
      const day = entity[keySymbol].name;
      return {
        day,
        items: entity.users,
      };
    });
    return {
      kind: 'ArcAnalytics#CutomRangeUsers',
      items,
    };
  }
}
