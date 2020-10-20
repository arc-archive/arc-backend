import { Request } from 'express';
import { UserEntity } from '@advanced-rest-client/backend-models';

declare interface PassportSession {
  oauth2return?: string;
}

export declare interface SessionRequest extends Request {
  user?: UserEntity;
  session?: PassportSession;
}