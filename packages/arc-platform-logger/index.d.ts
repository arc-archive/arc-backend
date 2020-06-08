import { LeveledLogMethod } from 'winston';
import { ErrorRequestHandler } from 'express';

declare interface ArcApiLogger {
  requestLogger: ErrorRequestHandler,
  errorLogger: ErrorRequestHandler,
  error: LeveledLogMethod;
  warn: LeveledLogMethod;
  info: LeveledLogMethod;
  log: LeveledLogMethod;
  verbose: LeveledLogMethod;
  debug: LeveledLogMethod;
  silly: LeveledLogMethod;
}
declare const logger: ArcApiLogger;

export default logger;
