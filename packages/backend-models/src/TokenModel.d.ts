import { BaseModel, Entity, QueryResult, QueryOptions } from './BaseModel.js';
import { UserEntity } from './UserModel';

export declare interface TokenIssuer {
  id: string;
  displayName?: string;
}

export declare interface EditableToken {
  expires?: number;
  name?: string;
  revoked?: boolean;
  scopes: string[];
}

export declare interface TokenEntity extends EditableToken, Entity {
  created: number;
  issuer: TokenIssuer;
  token: string[];
  expired?: boolean;
}

export declare interface TokenQueryResult extends QueryResult<TokenEntity> {}

export declare interface TokenQueryOptions extends QueryOptions {}

/**
 * A model representing user created authentication model
 */
export class TokenModel extends BaseModel {
  constructor();

  /**
   * Model properties excluded from indexes
   */
  readonly excludedIndexesToken: string[];
  /**
   * Finds a token in the data store.
   * @param token token
   * @return Promise resolved to the token or `null` if the token is not in the data store.
   */
  find(token: string): Promise<TokenEntity>|null;

  /**
   * Lists all user generated tokens.
   * @param userId User id
   * @param opts Query options
   * @returns Promise resolved to an array where first item is the list of results and second is either `nextPageToken` or false.
   */
  list(userId: string, opts: TokenQueryOptions): Promise<TokenQueryResult>;
  /**
   * Lookups and returns user token
   * @param userId Owner id
   * @param tokenId Token id
   * @return {} A promise resolved to the token value or undefined.
   */
  get(userId: string, tokenId: string): Promise<TokenEntity|null>;

  /**
   * Creates new user token.
   * @param user Session user
   * @param tokenInfo Decrypted token info
   * @param token The token
   * @param name Optional name for the token
   * @returns Promise resolved to the token object.
   */
  insert(user: UserEntity, tokenInfo: object, token: string, name?: string): Promise<TokenEntity>;

  /**
   * Sets `revoked` status on a token.
   * @param userId Owner id
   * @param tokenId Token id
   */
  revoke(userId: string, tokenId: string): Promise<void>;
  /**
   * Removes a token from the data store
   * @param userId
   * @param tokenId
   */
  delete(userId: string, tokenId: string): Promise<void>;
}
