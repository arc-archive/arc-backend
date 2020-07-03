import { BaseModel } from './BaseModel.js';

/** @typedef {import('@google-cloud/datastore/build/src/entity').entity.Key} Key */
/** @typedef {import('@google-cloud/datastore').Query} Query */
/** @typedef {import('./MessageModel').MessageFilter} MessageFilter */
/** @typedef {import('./MessageModel').CreateMessageEntity} CreateMessageEntity */
/** @typedef {import('./MessageModel').MessageEntity} MessageEntity */
/** @typedef {import('./MessageModel').MessageQueryResult} MessageQueryResult */

/**
 * Advanced REST Client message entity
 */
export class MessageModel extends BaseModel {
  /**
   * @constructor
   */
  constructor() {
    super('ArcInfo');
  }

  /**
   * @return {string[]} Model properties excluded from indexes
   */
  get excludeIndexes() {
    return ['abstract', 'actionUrl', 'cta', 'title'];
  }

  /**
   * Creates the datastore key with auto incremented id.
   * @return {Key} Datastore key
   */
  autoKey() {
    return this.store.key({
      namespace: this.namespace,
      path: [this.messageKind],
    });
  }

  /**
   * Creates a datastore key for a component in a test.
   * @param {string} messageId Message id
   * @return {Key} Datastore key
   */
  createMessageKey(messageId) {
    return this.store.key({
      namespace: this.namespace,
      path: [this.messageKind, Number(messageId)],
    });
  }

  /**
   * Creates a datastore query object with options.
   * @param {MessageFilter} config Query configuration options.
   * @return {Query} Datastore query object
   */
  _createQuery(config) {
    let query = this.store.createQuery(this.namespace, this.messageKind).order('time', {
      descending: true,
    });
    if (config.pageToken) {
      query = query.start(config.pageToken);
    } else {
      if (config.until) {
        query = query.filter('time', '<=', config.until);
      }
      if (config.since) {
        query = query.filter('time', '>=', config.since);
      }
    }
    if (config.target) {
      query = query.filter('target', '=', config.target);
    }
    if (config.channel) {
      query = query.filter('channel', '=', config.channel);
    }
    const limit = config.limit ? config.limit : this.listLimit;
    query = query.limit(limit);
    return query;
  }

  /**
   * Makes the query to the backend to retreive list or messages.
   * @param {MessageFilter=} config Query options.
   * @return {Promise<MessageQueryResult>}
   */
  async list(config={}) {
    const query = this._createQuery(config);
    const [entitiesRaw, queryInfo] = await this.store.runQuery(query);
    const entities = entitiesRaw.map(this.fromDatastore.bind(this));
    const newPageToken = queryInfo.moreResults !== this.NO_MORE_RESULTS ? queryInfo.endCursor : undefined;
    return {
      entities,
      pageToken: newPageToken,
    };
  }

  /**
   * Insets new message to the datastore.
   * @param {CreateMessageEntity} message Message object
   * @return {Promise<MessageEntity>}
   */
  async insert(message) {
    const key = this.autoKey();
    const results = [
      {
        name: 'abstract',
        value: message.abstract,
        excludeFromIndexes: true,
      },
      {
        name: 'title',
        value: message.title,
        excludeFromIndexes: true,
      },
      {
        name: 'time',
        value: Date.now(),
        excludeFromIndexes: false,
      },
    ];

    if (message.actionUrl) {
      results.push({
        name: 'actionUrl',
        value: message.actionUrl,
        excludeFromIndexes: true,
      });
    }

    if (message.cta) {
      results.push({
        name: 'cta',
        value: message.cta,
        excludeFromIndexes: true,
      });
    }

    if (message.target) {
      results.push({
        name: 'target',
        value: message.target,
        excludeFromIndexes: false,
      });
    }

    if (message.channel) {
      results.push({
        name: 'channel',
        value: message.channel,
        excludeFromIndexes: false,
      });
    }

    const entity = {
      key,
      data: results,
    };
    await this.store.upsert(entity);
    const [result] = await this.store.get(key);
    return this.fromDatastore(result);
  }

  /**
   * Reads ARC message from the data store.
   * @param {string} id An ID of the message
   * @return {Promise<MessageEntity|null>}
   */
  async get(id) {
    const key = this.createMessageKey(id);
    const [result] = await this.store.get(key);
    if (result) {
      return this.fromDatastore(result);
    }
    return null;
  }

  /**
   * Removes message from the store.
   * @param {string} id The id of the message to remove.
   * @return {Promise<void>}
   */
  async delete(id) {
    const transaction = this.store.transaction();
    const key = this.createMessageKey(id);
    try {
      await transaction.run();
      await transaction.delete(key);
      await transaction.commit();
    } catch (e) {
      transaction.rollback();
      throw e;
    }
  }
}
