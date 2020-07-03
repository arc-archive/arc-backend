import { BaseModel } from '../src/BaseModel';
import { entity } from '@google-cloud/datastore/build/src/entity';
import { CoverageModel, EditableCoverageEntity, CoverageEntity, CoverageResult, CoverageSummaryResult, CoverageReport, CoverageFileResult } from '../src/CoverageModel';
import { DependencyEntry, DependencyModel } from '../src/DependencyModel';
import { TestReport, TestBrowserResult } from '../src/TestReport';
import { TestComponentModel } from '../src/TestComponentModel';

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
  populateDepenenciesEntities(model: DependencyModel, sample?: number):Promise<string[]>;
  generateTestBrowserResult(): TestBrowserResult;
  generateTestReport(results?: number): TestReport;
  populateComponentTestReports(model: TestComponentModel, testId?: string, sample?: number): Promise<void>
}

declare const instance: DataHelper;
export default instance;
