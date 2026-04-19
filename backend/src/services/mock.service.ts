// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 模拟数据服务
// =============================================================================
// 功能: 在区块链网络不可用时提供模拟数据，加速开发体验
// =============================================================================

import { config } from '../config';

// =============================================================================
// 模拟资产数据
// =============================================================================
const mockAssets = [
  {
    udi: 'UDI20240328001',
    name: '一次性医用口罩',
    specification: '10只/盒',
    batchNumber: 'B20240328',
    productionDate: '2024-03-28',
    expiryDate: '2026-03-28',
    docHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
    status: 'IN_STOCK',
    owner: '医院A',
    producer: '生产商A',
    producerMSP: 'ProducerMSP',
    createdAt: '2024-03-28T10:00:00Z',
    updatedAt: '2024-03-28T15:00:00Z',
  },
  {
    udi: 'UDI20240328002',
    name: '医用外科手套',
    specification: '100只/盒',
    batchNumber: 'B20240329',
    productionDate: '2024-03-29',
    expiryDate: '2027-03-29',
    docHash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3',
    status: 'IN_TRANSIT',
    owner: '经销商B',
    producer: '生产商A',
    producerMSP: 'ProducerMSP',
    createdAt: '2024-03-29T09:00:00Z',
    updatedAt: '2024-03-30T14:00:00Z',
  },
  {
    udi: 'UDI20240328003',
    name: '一次性注射器',
    specification: '5ml/支',
    batchNumber: 'B20240330',
    productionDate: '2024-03-30',
    expiryDate: '2026-09-30',
    docHash: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4',
    status: 'CREATED',
    owner: '生产商A',
    producer: '生产商A',
    producerMSP: 'ProducerMSP',
    createdAt: '2024-03-30T08:00:00Z',
    updatedAt: '2024-03-30T08:00:00Z',
  },
  {
    udi: 'UDI20240328004',
    name: '医用敷料',
    specification: '10cm×10cm',
    batchNumber: 'B20240325',
    productionDate: '2024-03-25',
    expiryDate: '2025-03-25',
    docHash: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
    status: 'CONSUMED',
    owner: '医院B',
    producer: '生产商B',
    producerMSP: 'ProducerMSP',
    createdAt: '2024-03-25T10:00:00Z',
    updatedAt: '2024-04-01T16:00:00Z',
  },
  {
    udi: 'UDI20240328005',
    name: '输液器',
    specification: '标准型',
    batchNumber: 'B20240327',
    productionDate: '2024-03-27',
    expiryDate: '2026-03-27',
    docHash: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',
    status: 'IN_STOCK',
    owner: '医院A',
    producer: '生产商A',
    producerMSP: 'ProducerMSP',
    createdAt: '2024-03-27T11:00:00Z',
    updatedAt: '2024-03-29T13:00:00Z',
  },
];

// =============================================================================
// 模拟历史记录
// =============================================================================
const mockHistory: Record<string, any[]> = {
  'UDI20240328001': [
    {
      txId: 'tx001',
      timestamp: '2024-03-28T10:00:00Z',
      status: 'CREATED',
      owner: '生产商A',
      action: '资产初始化',
      mspId: 'ProducerMSP',
    },
    {
      txId: 'tx002',
      timestamp: '2024-03-28T14:00:00Z',
      status: 'IN_TRANSIT',
      owner: '经销商B',
      action: '转移给经销商',
      mspId: 'ProducerMSP',
    },
    {
      txId: 'tx003',
      timestamp: '2024-03-28T15:00:00Z',
      status: 'IN_STOCK',
      owner: '医院A',
      action: '收货确认',
      mspId: 'HospitalMSP',
    },
  ],
  'UDI20240328002': [
    {
      txId: 'tx004',
      timestamp: '2024-03-29T09:00:00Z',
      status: 'CREATED',
      owner: '生产商A',
      action: '资产初始化',
      mspId: 'ProducerMSP',
    },
    {
      txId: 'tx005',
      timestamp: '2024-03-30T14:00:00Z',
      status: 'IN_TRANSIT',
      owner: '经销商B',
      action: '转移给经销商',
      mspId: 'ProducerMSP',
    },
  ],
};

// =============================================================================
// 模拟服务类
// =============================================================================
export class MockService {
  private static instance: MockService;
  private delay: number;

  private constructor() {
    this.delay = config.mockMode?.responseDelay || 100;
  }

  public static getInstance(): MockService {
    if (!MockService.instance) {
      MockService.instance = new MockService();
    }
    return MockService.instance;
  }

  /**
   * 模拟延迟
   */
  private async simulateDelay(): Promise<void> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
  }

  /**
   * 查询所有资产
   */
  public async queryAllAssets(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    await this.simulateDelay();
    return { success: true, data: mockAssets };
  }

  /**
   * 查询单个资产
   */
  public async queryAsset(udi: string): Promise<{ success: boolean; data?: any; error?: string }> {
    await this.simulateDelay();
    const asset = mockAssets.find(a => a.udi === udi);
    if (asset) {
      return { success: true, data: asset };
    }
    return { success: false, error: '资产不存在' };
  }

  /**
   * 按所有者查询
   */
  public async queryByOwner(owner: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    await this.simulateDelay();
    const assets = mockAssets.filter(a =>
      a.owner.includes(owner) || a.producer.includes(owner)
    );
    return { success: true, data: assets };
  }

  /**
   * 按状态查询
   */
  public async queryByStatus(status: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    await this.simulateDelay();
    const assets = mockAssets.filter(a => a.status === status);
    return { success: true, data: assets };
  }

  /**
   * 获取资产统计
   */
  public async getAssetCount(): Promise<{ success: boolean; data?: any; error?: string }> {
    await this.simulateDelay();
    const counts = {
      created: mockAssets.filter(a => a.status === 'CREATED').length,
      inTransit: mockAssets.filter(a => a.status === 'IN_TRANSIT').length,
      inStock: mockAssets.filter(a => a.status === 'IN_STOCK').length,
      consumed: mockAssets.filter(a => a.status === 'CONSUMED').length,
      recall: mockAssets.filter(a => a.status === 'RECALL').length,
      exception: mockAssets.filter(a => a.status === 'EXCEPTION').length,
    };
    return { success: true, data: counts };
  }

  /**
   * 获取历史记录
   */
  public async getHistory(udi: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    await this.simulateDelay();
    const history = mockHistory[udi] || [];
    return { success: true, data: history };
  }

  /**
   * 初始化资产
   */
  public async initAsset(params: any): Promise<{ success: boolean; data?: any; error?: string; txId?: string }> {
    await this.simulateDelay();
    const newAsset = {
      udi: params.udi,
      name: params.name,
      specification: params.specification,
      batchNumber: params.batchNumber,
      quantity: params.quantity,
      productionDate: params.productionDate,
      expiryDate: params.expiryDate,
      docHash: params.docHash,
      status: 'CREATED',
      owner: params.producer,
      producer: params.producer,
      producerMSP: 'ProducerMSP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockAssets.push(newAsset);
    mockHistory[params.udi] = [{
      txId: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'CREATED',
      owner: params.producer,
      action: '资产初始化',
      mspId: 'ProducerMSP',
    }];
    return { success: true, data: newAsset, txId: `mock_tx_${Date.now()}` };
  }

  /**
   * 转移资产
   */
  public async transferAsset(params: any): Promise<{ success: boolean; data?: any; error?: string; txId?: string }> {
    await this.simulateDelay();
    const assetIndex = mockAssets.findIndex(a => a.udi === params.udi);
    if (assetIndex === -1) {
      return { success: false, error: '资产不存在' };
    }
    mockAssets[assetIndex].owner = params.newOwner;
    mockAssets[assetIndex].status = 'IN_TRANSIT';
    mockAssets[assetIndex].updatedAt = new Date().toISOString();

    if (!mockHistory[params.udi]) {
      mockHistory[params.udi] = [];
    }
    mockHistory[params.udi].push({
      txId: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'IN_TRANSIT',
      owner: params.newOwner,
      action: params.description || '资产转移',
      mspId: params.newOwnerMSP,
    });

    return { success: true, data: mockAssets[assetIndex], txId: `mock_tx_${Date.now()}` };
  }

  /**
   * 消耗核销
   */
  public async burnAsset(params: any): Promise<{ success: boolean; data?: any; error?: string; txId?: string }> {
    await this.simulateDelay();
    const assetIndex = mockAssets.findIndex(a => a.udi === params.udi);
    if (assetIndex === -1) {
      return { success: false, error: '资产不存在' };
    }
    mockAssets[assetIndex].status = 'CONSUMED';
    mockAssets[assetIndex].updatedAt = new Date().toISOString();

    if (!mockHistory[params.udi]) {
      mockHistory[params.udi] = [];
    }
    mockHistory[params.udi].push({
      txId: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'CONSUMED',
      owner: params.hospital,
      action: `临床核销 - ${params.department}`,
      mspId: 'HospitalMSP',
    });

    return { success: true, data: mockAssets[assetIndex], txId: `mock_tx_${Date.now()}` };
  }

  /**
   * 验证哈希
   */
  public async verifyHash(udi: string, docHash: string): Promise<{ success: boolean; data?: any; error?: string }> {
    await this.simulateDelay();
    const asset = mockAssets.find(a => a.udi === udi);
    if (!asset) {
      return { success: false, error: '资产不存在' };
    }
    const isValid = asset.docHash === docHash;
    return {
      success: true,
      data: {
        isValid,
        storedHash: asset.docHash,
        providedHash: docHash,
        verifiedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * 按批次查询
   */
  public async queryByBatch(batchNumber: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    await this.simulateDelay();
    const assets = mockAssets.filter(a => a.batchNumber === batchNumber);
    return { success: true, data: assets };
  }

  /**
   * 查询即将过期资产
   */
  public async queryExpiringSoon(days: number): Promise<{ success: boolean; data?: any[]; error?: string }> {
    await this.simulateDelay();
    const now = new Date();
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const assets = mockAssets.filter(a => {
      const expiryDate = new Date(a.expiryDate);
      return expiryDate <= targetDate && expiryDate > now;
    });
    return { success: true, data: assets };
  }

  /**
   * 收货确认
   */
  public async confirmReceipt(params: { udi: string; receiverName: string }): Promise<{ success: boolean; data?: any; error?: string; txId?: string }> {
    await this.simulateDelay();
    const assetIndex = mockAssets.findIndex(a => a.udi === params.udi);
    if (assetIndex === -1) {
      return { success: false, error: '资产不存在' };
    }
    mockAssets[assetIndex].status = 'IN_STOCK';
    mockAssets[assetIndex].owner = params.receiverName;
    mockAssets[assetIndex].updatedAt = new Date().toISOString();

    if (!mockHistory[params.udi]) {
      mockHistory[params.udi] = [];
    }
    mockHistory[params.udi].push({
      txId: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'IN_STOCK',
      owner: params.receiverName,
      action: '收货确认',
      mspId: 'DistributorMSP',
    });

    return { success: true, data: mockAssets[assetIndex], txId: `mock_tx_${Date.now()}` };
  }

  /**
   * 更新环境数据
   */
  public async updateEnvData(params: any): Promise<{ success: boolean; error?: string; txId?: string }> {
    await this.simulateDelay();
    const assetIndex = mockAssets.findIndex(a => a.udi === params.udi);
    if (assetIndex === -1) {
      return { success: false, error: '资产不存在' };
    }
    // 模拟更新环境数据
    return { success: true, txId: `mock_tx_${Date.now()}` };
  }

  /**
   * 召回资产
   */
  public async recallAsset(udi: string, reason: string): Promise<{ success: boolean; data?: any; error?: string; txId?: string }> {
    await this.simulateDelay();
    const assetIndex = mockAssets.findIndex(a => a.udi === udi);
    if (assetIndex === -1) {
      return { success: false, error: '资产不存在' };
    }
    mockAssets[assetIndex].status = 'RECALL';
    mockAssets[assetIndex].updatedAt = new Date().toISOString();

    if (!mockHistory[udi]) {
      mockHistory[udi] = [];
    }
    mockHistory[udi].push({
      txId: `tx_${Date.now()}`,
      timestamp: new Date().toISOString(),
      status: 'RECALL',
      owner: mockAssets[assetIndex].owner,
      action: `资产召回: ${reason}`,
      mspId: 'RegulatorMSP',
    });

    return { success: true, data: mockAssets[assetIndex], txId: `mock_tx_${Date.now()}` };
  }
}

export const mockService = MockService.getInstance();
export default mockService;
