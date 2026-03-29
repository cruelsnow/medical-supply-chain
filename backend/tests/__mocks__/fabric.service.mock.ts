/**
 * =============================================================================
 * 医用耗材供应链管理系统 - Fabric服务模拟
 * =============================================================================
 * 功能: 模拟Fabric SDK交互，用于单元测试
 * =============================================================================
 */

// 资产数据结构
interface MedicalAsset {
  udi: string;
  name: string;
  specification: string;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  docHash: string;
  status: string;
  owner: string;
  producer: string;
  currentHolder: string;
  createdAt: string;
  updatedAt: string;
}

// 历史记录结构
interface HistoryRecord {
  txId: string;
  timestamp: string;
  value: MedicalAsset;
  isDelete: boolean;
}

// 消耗记录结构
interface ConsumeRecord {
  udi: string;
  hospital: string;
  department: string;
  surgeryId: string;
  operator: string;
  reason: string;
  consumedAt: string;
}

// 环境数据记录
interface EnvDataRecord {
  udi: string;
  temperature: number;
  humidity: number;
  location: string;
  recordedAt: string;
  recordedBy: string;
}

// 模拟的内存数据库
class MockDatabase {
  private assets: Map<string, MedicalAsset> = new Map();
  private history: Map<string, HistoryRecord[]> = new Map();
  private consumeRecords: ConsumeRecord[] = [];
  private envDataRecords: EnvDataRecord[] = [];

  // 资产操作
  createAsset(asset: MedicalAsset): void {
    this.assets.set(asset.udi, asset);
    this.addHistory(asset.udi, asset);
  }

  getAsset(udi: string): MedicalAsset | undefined {
    return this.assets.get(udi);
  }

  updateAsset(udi: string, asset: MedicalAsset): void {
    this.assets.set(udi, asset);
    this.addHistory(udi, asset);
  }

  deleteAsset(udi: string): void {
    this.assets.delete(udi);
  }

  getAllAssets(): MedicalAsset[] {
    return Array.from(this.assets.values());
  }

  getAssetsByOwner(owner: string): MedicalAsset[] {
    return this.getAllAssets().filter(a => a.owner === owner);
  }

  getAssetsByStatus(status: string): MedicalAsset[] {
    return this.getAllAssets().filter(a => a.status === status);
  }

  getAssetsByBatch(batchNumber: string): MedicalAsset[] {
    return this.getAllAssets().filter(a => a.batchNumber === batchNumber);
  }

  // 历史操作
  addHistory(udi: string, asset: MedicalAsset): void {
    if (!this.history.has(udi)) {
      this.history.set(udi, []);
    }
    const records = this.history.get(udi)!;
    records.push({
      txId: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      value: { ...asset },
      isDelete: false
    });
  }

  getHistory(udi: string): HistoryRecord[] {
    return this.history.get(udi) || [];
  }

  // 消耗记录
  addConsumeRecord(record: ConsumeRecord): void {
    this.consumeRecords.push(record);
  }

  getConsumeRecord(udi: string): ConsumeRecord | undefined {
    return this.consumeRecords.find(r => r.udi === udi);
  }

  // 环境数据
  addEnvDataRecord(record: EnvDataRecord): void {
    this.envDataRecords.push(record);
  }

  getEnvDataRecords(udi: string): EnvDataRecord[] {
    return this.envDataRecords.filter(r => r.udi === udi);
  }

  // 清空数据
  clear(): void {
    this.assets.clear();
    this.history.clear();
    this.consumeRecords = [];
    this.envDataRecords = [];
  }

  // 统计
  getAssetCount(): number {
    return this.assets.size;
  }
}

// 全局模拟数据库实例
const mockDb = new MockDatabase();

// 模拟Fabric服务
export const mockFabricService = {
  // 连接模拟
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  isConnected: jest.fn().mockReturnValue(true),

  // 资产初始化
  initAsset: jest.fn().mockImplementation(async (
    udi: string,
    name: string,
    specification: string,
    batchNumber: string,
    productionDate: string,
    expiryDate: string,
    docHash: string,
    producer: string
  ): Promise<MedicalAsset> => {
    const now = new Date().toISOString();
    const asset: MedicalAsset = {
      udi,
      name,
      specification,
      batchNumber,
      productionDate,
      expiryDate,
      docHash,
      status: 'CREATED',
      owner: producer,
      producer,
      currentHolder: producer,
      createdAt: now,
      updatedAt: now
    };
    mockDb.createAsset(asset);
    return asset;
  }),

  // 查询资产
  queryAsset: jest.fn().mockImplementation(async (udi: string): Promise<MedicalAsset | null> => {
    const asset = mockDb.getAsset(udi);
    return asset || null;
  }),

  // 查询所有资产
  queryAllAssets: jest.fn().mockImplementation(async (): Promise<MedicalAsset[]> => {
    return mockDb.getAllAssets();
  }),

  // 按所有者查询
  queryByOwner: jest.fn().mockImplementation(async (owner: string): Promise<MedicalAsset[]> => {
    return mockDb.getAssetsByOwner(owner);
  }),

  // 按状态查询
  queryByStatus: jest.fn().mockImplementation(async (status: string): Promise<MedicalAsset[]> => {
    return mockDb.getAssetsByStatus(status);
  }),

  // 按批次查询
  queryByBatch: jest.fn().mockImplementation(async (batchNumber: string): Promise<MedicalAsset[]> => {
    return mockDb.getAssetsByBatch(batchNumber);
  }),

  // 资产转移
  transferAsset: jest.fn().mockImplementation(async (
    udi: string,
    newOwner: string,
    newHolderMSP: string,
    remark: string
  ): Promise<MedicalAsset> => {
    const asset = mockDb.getAsset(udi);
    if (!asset) {
      throw new Error(`资产 ${udi} 不存在`);
    }
    asset.status = 'IN_TRANSIT';
    asset.owner = newOwner;
    asset.currentHolder = newOwner;
    asset.updatedAt = new Date().toISOString();
    mockDb.updateAsset(udi, asset);
    return asset;
  }),

  // 收货确权
  confirmReceipt: jest.fn().mockImplementation(async (
    udi: string,
    location: string
  ): Promise<MedicalAsset> => {
    const asset = mockDb.getAsset(udi);
    if (!asset) {
      throw new Error(`资产 ${udi} 不存在`);
    }
    asset.status = 'IN_STOCK';
    asset.updatedAt = new Date().toISOString();
    mockDb.updateAsset(udi, asset);
    return asset;
  }),

  // 消耗核销
  burnAsset: jest.fn().mockImplementation(async (
    udi: string,
    hospital: string,
    department: string,
    surgeryId: string,
    operator: string,
    reason: string
  ): Promise<ConsumeRecord> => {
    const asset = mockDb.getAsset(udi);
    if (!asset) {
      throw new Error(`资产 ${udi} 不存在`);
    }
    asset.status = 'CONSUMED';
    asset.updatedAt = new Date().toISOString();
    mockDb.updateAsset(udi, asset);

    const record: ConsumeRecord = {
      udi,
      hospital,
      department,
      surgeryId,
      operator,
      reason,
      consumedAt: new Date().toISOString()
    };
    mockDb.addConsumeRecord(record);
    return record;
  }),

  // 资产召回
  recallAsset: jest.fn().mockImplementation(async (
    udi: string,
    reason: string
  ): Promise<MedicalAsset> => {
    const asset = mockDb.getAsset(udi);
    if (!asset) {
      throw new Error(`资产 ${udi} 不存在`);
    }
    asset.status = 'RECALL';
    asset.updatedAt = new Date().toISOString();
    mockDb.updateAsset(udi, asset);
    return asset;
  }),

  // 获取历史
  getHistory: jest.fn().mockImplementation(async (udi: string): Promise<HistoryRecord[]> => {
    return mockDb.getHistory(udi);
  }),

  // 哈希验证
  verifyHash: jest.fn().mockImplementation(async (
    udi: string,
    hashToVerify: string
  ): Promise<{ isValid: boolean; asset: MedicalAsset | null }> => {
    const asset = mockDb.getAsset(udi);
    if (!asset) {
      throw new Error(`资产 ${udi} 不存在`);
    }
    return {
      isValid: asset.docHash === hashToVerify,
      asset
    };
  }),

  // 更新环境数据
  updateEnvData: jest.fn().mockImplementation(async (
    udi: string,
    temperature: number,
    humidity: number,
    location: string,
    recordedBy: string
  ): Promise<EnvDataRecord> => {
    const record: EnvDataRecord = {
      udi,
      temperature,
      humidity,
      location,
      recordedAt: new Date().toISOString(),
      recordedBy
    };
    mockDb.addEnvDataRecord(record);
    return record;
  }),

  // 获取环境数据
  getEnvData: jest.fn().mockImplementation(async (udi: string): Promise<EnvDataRecord[]> => {
    return mockDb.getEnvDataRecords(udi);
  }),

  // 资产统计
  getAssetCount: jest.fn().mockImplementation(async (): Promise<number> => {
    return mockDb.getAssetCount();
  }),

  // 即将过期资产
  queryExpiringSoon: jest.fn().mockImplementation(async (days: number): Promise<MedicalAsset[]> => {
    const assets = mockDb.getAllAssets();
    const now = new Date();
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return assets.filter(asset => {
      const expiryDate = new Date(asset.expiryDate);
      return expiryDate <= targetDate && expiryDate > now && asset.status !== 'CONSUMED';
    });
  }),

  // 获取模拟数据库（用于测试清理）
  getMockDb: () => mockDb,

  // 重置所有模拟
  resetAllMocks: () => {
    mockDb.clear();
    jest.clearAllMocks();
  }
};

export default mockFabricService;
