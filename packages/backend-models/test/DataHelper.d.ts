import { BaseModel } from '../src/BaseModel';
import { entity } from '@google-cloud/datastore/build/src/entity';
import { CoverageModel, EditableCoverageEntity, CoverageEntity, CoverageResult, CoverageSummaryResult, CoverageReport, CoverageFileResult } from '../src/CoverageModel';
import { DependencyEntry, DependencyModel } from '../src/DependencyModel';
import { TestReport, TestBrowserResult } from '../src/types/TestReport';
import { TestComponentModel } from '../src/TestComponentModel';
import { TestModel } from '../src/TestModel';
import { UserEntity } from '../src/UserModel';
import { PassportProfile } from '../src/types/PassportProfile';
import { TokenInfo, TokenModel } from '../src/TokenModel';
import { AmfTest, BottomUpTest } from '../src/types/ComponentTest';

export declare interface ComponentInsertOptions {
  name?: string;
  org?: string;
  npmName?: string;
  version?: string;
}
export declare interface ComponentInsertResult extends ComponentInsertOptions {
  key?: entity.Key;
  versions: string[];
}

export declare interface CreateComponentVersionResult {
  name: string;
  org: string;
  npmName: string;
  version: string;
}

export declare interface TokenCreateInfo {
  /**
   * List of scopes
   */
  scopes: string[];
  /**
   * Describes when the token expires.
   */
  expires?: number;
}

export declare class DataHelper {
  deleteEntities(model: BaseModel, kind: string): Promise<void>;
  insertComponentGroup(model: BaseModel, name: string): Promise<entity.Key>;
  insertComponent(model: BaseModel, opts: ComponentInsertOptions): Promise<ComponentInsertResult>;
  generateComponentVersion(): CreateComponentVersionResult;
  generateCoverageModel(): EditableCoverageEntity;
  populateCoverageEntities(model: CoverageModel, sample?: number): Promise<CoverageEntity[]>;
  generateCoverageReport(sample?: number): CoverageResult;
  generateCoverageReportSummary(): CoverageSummaryResult;
  generateCoverageReportDetails(sample?: number): CoverageReport[];
  generateCoverageFileResult(): CoverageFileResult;
  generatePackageName(): string;
  generateDependencyEntry(devDependencies?: string): DependencyEntry;
  populateDependenciesEntities(model: DependencyModel, sample?: number):Promise<string[]>;
  generateTestBrowserResult(): TestBrowserResult;
  generateTestReport(results?: number): TestReport;
  populateComponentTestReports(model: TestComponentModel, testId?: string, sample?: number): Promise<void>;
  generateAmfTestEntity(): AmfTest;
  generateBottomUpTestEntity(): BottomUpTest;
  populateTests(model: TestModel, sample?: number): Promise<string[]>;
  generatePassportProfile(): PassportProfile;
  generateUserEntity(): UserEntity;
  generateToken(user: UserEntity, createInfo: TokenCreateInfo): string;
  verifyToken(token: string): TokenInfo;
  populateTokens(model: TokenModel, user: UserEntity, sample?: number): Promise<string[]>;
}

declare const instance: DataHelper;
export default instance;
