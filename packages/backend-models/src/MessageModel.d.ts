import { BaseModel, Entity, QueryResult } from './BaseModel.js';
import {entity} from '@google-cloud/datastore/build/src/entity';
import {Query} from '@google-cloud/datastore';

export declare interface MessageFilter {
  /**
   * Pagination token
   */
  pageToken?: string;
  /**
   * Number of messages in response
   */
  limit?: number;
  /**
   * Upper limit of the time query
   */
  until?: number;
  /**
   * Lower limit of the time query
   */
  since?: number;
  /**
   * Target platform
   */
  target?: string;
  /**
   * Release channel of ARC
   */
  channel?: string;
}

export declare interface CreateMessageEntity {
  /**
   * The message
   */
  abstract: string;
  /**
   * Message title
   */
  title: string;
  /**
   * Main sction URL
   */
  actionUrl?: string;
  /**
   * Call to action - main action's label
   */
  cta?: string;
  /**
   * Target platform
   */
  target?: string;
  /**
   * Release channel of ARC
   */
  channel?: string;
}

export declare interface MessageEntity extends CreateMessageEntity, Entity {
  readonly time: number;
  kind: string;
}

export declare interface MessageQueryResult extends QueryResult<MessageEntity> {}

/**
 * Advanced REST CLient message entity
 */
export class MessageModel extends BaseModel {
  constructor();

  /**
   * @return Model properties excluded from indexes
   */
  readonly excludeIndexes: string[];

  /**
   * Creates the datastore key with auto incremented id.
   * @return Datastore key
   */
  autoKey(): entity.Key;

  /**
   * Creates a datastore key for a component in a test.
   * @param messageId Message id
   * @return Datastore key
   */
  createMessageKey(messageId: string): entity.Key;

  /**
   * Creates a datastore query object with options.
   * @param {Object} config Query configuration options.
   * @return Datastore query object
   */
  _createQuery(config: MessageFilter): Query;

  /**
   * Makes the query to the backend to retreive list or messages.
   * @param {Object} config Query options.
   * @return {Promise}
   */
  list(config: MessageFilter): Promise<MessageQueryResult>;

  /**
   * Insets new message to the datastore.
   * @param message Message object
   */
  insert(message: CreateMessageEntity): Promise<MessageEntity>;

  /**
   * Reads ARC message from the data store.
   * @param id An ID of the message
   */
  get(id: string): Promise<MessageEntity|null>;

  /**
   * Removes message from the store.
   * @param {string} id The id of the message to remove.
   * @return {Promise<void>}
   */
  delete(id: string): Promise<void>;
}
