import { BaseModel, entity, CoverageModel, EditableCoverageEntity, CoverageEntity, CoverageResult, CoverageSummaryResult, CoverageReport, CoverageFileResult, DependencyEntry, DependencyModel, TestReport, TestBrowserResult, TestComponentModel, TestModel, UserEntity, PassportProfile, TokenInfo, TokenModel, AmfTest, BottomUpTest } from '@advanced-rest-client/backend-models';

export declare interface ComponentInsertOptions {
  name?: string;
  version?: string;
  group?: string;
  pkg?: string;
  org?: string;
}
export declare interface ComponentInsertResult extends ComponentInsertOptions {
  key?: entity.Key;
  versions: string[];
}

export declare interface CreateComponentVersionResult {
  group: string;
  component: string;
  version: string;
  pkg: string;
  org: string;
  docs: string;
  changeLog: string;
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
