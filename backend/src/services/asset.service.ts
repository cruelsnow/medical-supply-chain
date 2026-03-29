// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 资产业务服务
// =============================================================================
// 功能: 封装资产相关的业务逻辑，调用智能合约
// =============================================================================

import fabricService from './fabric.service';
import mockService from './mock.service';
import { config } from '../config';

// 判断是否使用模拟模式
const useMockMode = (): boolean => {
  // 1. 环境变量强制指定
  if (process.env.MOCK_MODE === 'true') return true;
  if (process.env.MOCK_MODE === 'false') return false;

  // 2. 开发环境默认启用
  if (config.mockMode?.enabled) return true;

  // 3. 生产环境不启用
  if (config.server.env === 'production') return false;

  return true;
};

// =============================================================================
// 类型定义
// =============================================================================

// 资产状态枚举
export enum AssetStatus {
  CREATED = 'CREATED',
  IN_TRANSIT = 'IN_TRANSIT',
  IN_STOCK = 'IN_STOCK',
  CONSUMED = 'CONSUMED',
  RECALL = 'RECALL',
  EXCEPTION = 'EXCEPTION',
}

// 医用耗材资产接口
export interface MedicalAsset {
  udi: string;
  name: string;
  specification: string;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  docHash: string;
  status: AssetStatus;
  owner: string;
  producer: string;
  producerMSP: string;
  createdAt: string;
  updatedAt: string;
  txID: string;
}

// 资产初始化参数
export interface InitAssetParams {
  udi: string;
  name: string;
  specification: string;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  docHash: string;
  producer: string;
}

// 权属转移参数
export interface TransferParams {
  udi: string;
  newOwner: string;
  newOwnerMSP: string;
  description?: string;
}

// 收货确权参数
export interface ReceiptParams {
  udi: string;
  receiverName: string;
}

// 环境数据参数
export interface EnvDataParams {
  udi: string;
  temperature: number;
  humidity: number;
  location: string;
  isAbnormal: boolean;
}

// 消耗核销参数
export interface BurnParams {
  udi: string;
  hospital: string;
  department: string;
  surgeryId?: string;
  operator: string;
  remarks?: string;
}

// 服务响应接口
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  txId?: string;
}

// =============================================================================
// 资产服务类
// =============================================================================

export class AssetService {
  private orgName: string;
  private userId: string;

  constructor(orgName: string = 'producer', userId: string = 'appUser') {
    this.orgName = orgName;
    this.userId = userId;
  }

  /**
   * 检查是否应该使用模拟模式
   */
  private shouldUseMockMode(): boolean {
    return useMockMode();
  }

  /**
   * 设置组织上下文
   */
  public setContext(orgName: string, userId: string): void {
    this.orgName = orgName;
    this.userId = userId;
  }

  /**
   * 执行智能合约方法（支持模拟模式）
   */
  private async executeContract(
    method: 'submit' | 'evaluate',
    functionName: string,
    ...args: string[]
  ): Promise<ServiceResponse> {
    // 检查是否启用模拟模式
    if (this.shouldUseMockMode()) {
      return this.executeMockFunction(functionName, args);
    }

    // 真实区块链模式
    try {
      const { contract } = await fabricService.connect(this.orgName, this.userId);

      let result;
      if (method === 'submit') {
        result = await fabricService.submitTransaction(contract, functionName, ...args);
      } else {
        result = await fabricService.evaluateTransaction(contract, functionName, ...args);
      }

      return result;
    } catch (error: any) {
      // 区块链连接失败时，尝试使用模拟模式作为降级方案
      console.warn(`区块链连接失败，使用模拟数据: ${error.message}`);
      if (config.mockMode?.enabled) {
        console.log('自动降级到模拟模式');
        return this.executeMockFunction(functionName, args);
      }
      return {
        success: false,
        error: error.message,
      };
    } finally {
      fabricService.disconnect();
    }
  }

  /**
   * 执行模拟函数
   */
  private async executeMockFunction(functionName: string, args: string[]): Promise<ServiceResponse> {
    console.log(`[模拟模式] 执行: ${functionName}`);

    switch (functionName) {
      case 'QueryAllAssets':
        return mockService.queryAllAssets();

      case 'QueryAsset':
        return mockService.queryAsset(args[0]);

      case 'QueryByOwner':
        return mockService.queryByOwner(args[0]);

      case 'QueryByStatus':
        return mockService.queryByStatus(args[0]);

      case 'QueryByBatch':
        return mockService.queryByBatch(args[0]);

      case 'GetAssetCount':
        return mockService.getAssetCount();

      case 'GetHistory':
        return mockService.getHistory(args[0]);

      case 'InitAsset':
        return mockService.initAsset({
          udi: args[0],
          name: args[1],
          specification: args[2],
          batchNumber: args[3],
          productionDate: args[4],
          expiryDate: args[5],
          docHash: args[6],
          producer: args[7],
        });

      case 'TransferAsset':
        return mockService.transferAsset({
          udi: args[0],
          newOwner: args[1],
          newOwnerMSP: args[2],
          description: args[3],
        });

      case 'ConfirmReceipt':
        return mockService.confirmReceipt({
          udi: args[0],
          receiverName: args[1],
        });

      case 'UpdateEnvData':
        return mockService.updateEnvData({
          udi: args[0],
          temperature: parseFloat(args[1]),
          humidity: parseFloat(args[2]),
          location: args[3],
          isAbnormal: args[4] === 'true',
        });

      case 'BurnAsset':
        return mockService.burnAsset({
          udi: args[0],
          hospital: args[1],
          department: args[2],
          surgeryId: args[3],
          operator: args[4],
          remarks: args[5],
        });

      case 'RecallAsset':
        return mockService.recallAsset(args[0], args[1]);

      case 'VerifyHash':
        return mockService.verifyHash(args[0], args[1]);

      case 'QueryExpiringSoon':
        return mockService.queryExpiringSoon(parseInt(args[0], 10));

      default:
        console.warn(`[模拟模式] 未知函数: ${functionName}，返回空数据`);
        return { success: true, data: null };
    }
  }

  // =========================================================================
  // 资产初始化（源头赋码上链）
  // =========================================================================
  public async initAsset(params: InitAssetParams): Promise<ServiceResponse<MedicalAsset>> {
    const args = [
      params.udi,
      params.name,
      params.specification,
      params.batchNumber,
      params.productionDate,
      params.expiryDate,
      params.docHash,
      params.producer,
    ];

    return this.executeContract('submit', 'InitAsset', ...args);
  }

  // =========================================================================
  // 权属转移（发货）
  // =========================================================================
  public async transferAsset(params: TransferParams): Promise<ServiceResponse<MedicalAsset>> {
    const args = [
      params.udi,
      params.newOwner,
      params.newOwnerMSP,
      params.description || '资产转移',
    ];

    return this.executeContract('submit', 'TransferAsset', ...args);
  }

  // =========================================================================
  // 收货确权
  // =========================================================================
  public async confirmReceipt(params: ReceiptParams): Promise<ServiceResponse<MedicalAsset>> {
    const args = [
      params.udi,
      params.receiverName,
    ];

    return this.executeContract('submit', 'ConfirmReceipt', ...args);
  }

  // =========================================================================
  // 更新环境数据
  // =========================================================================
  public async updateEnvData(params: EnvDataParams): Promise<ServiceResponse> {
    const args = [
      params.udi,
      params.temperature.toString(),
      params.humidity.toString(),
      params.location,
      params.isAbnormal.toString(),
    ];

    return this.executeContract('submit', 'UpdateEnvData', ...args);
  }

  // =========================================================================
  // 消耗核销（临床消耗）
  // =========================================================================
  public async burnAsset(params: BurnParams): Promise<ServiceResponse> {
    const args = [
      params.udi,
      params.hospital,
      params.department,
      params.surgeryId || '',
      params.operator,
      params.remarks || '',
    ];

    return this.executeContract('submit', 'BurnAsset', ...args);
  }

  // =========================================================================
  // 资产召回
  // =========================================================================
  public async recallAsset(udi: string, reason: string): Promise<ServiceResponse<MedicalAsset>> {
    const args = [udi, reason];
    return this.executeContract('submit', 'RecallAsset', ...args);
  }

  // =========================================================================
  // 查询单个资产
  // =========================================================================
  public async queryAsset(udi: string): Promise<ServiceResponse<MedicalAsset>> {
    return this.executeContract('evaluate', 'QueryAsset', udi);
  }

  // =========================================================================
  // 查询所有资产
  // =========================================================================
  public async queryAllAssets(): Promise<ServiceResponse<MedicalAsset[]>> {
    return this.executeContract('evaluate', 'QueryAllAssets');
  }

  // =========================================================================
  // 按所有者查询
  // =========================================================================
  public async queryByOwner(owner: string): Promise<ServiceResponse<MedicalAsset[]>> {
    return this.executeContract('evaluate', 'QueryByOwner', owner);
  }

  // =========================================================================
  // 按状态查询
  // =========================================================================
  public async queryByStatus(status: string): Promise<ServiceResponse<MedicalAsset[]>> {
    return this.executeContract('evaluate', 'QueryByStatus', status);
  }

  // =========================================================================
  // 按批次查询
  // =========================================================================
  public async queryByBatch(batchNumber: string): Promise<ServiceResponse<MedicalAsset[]>> {
    return this.executeContract('evaluate', 'QueryByBatch', batchNumber);
  }

  // =========================================================================
  // 查询即将过期资产
  // =========================================================================
  public async queryExpiringSoon(days: number): Promise<ServiceResponse<MedicalAsset[]>> {
    return this.executeContract('evaluate', 'QueryExpiringSoon', days.toString());
  }

  // =========================================================================
  // 获取资产历史记录（全链追溯）
  // =========================================================================
  public async getHistory(udi: string): Promise<ServiceResponse> {
    return this.executeContract('evaluate', 'GetHistory', udi);
  }

  // =========================================================================
  // 验证文档哈希
  // =========================================================================
  public async verifyHash(udi: string, docHash: string): Promise<ServiceResponse> {
    return this.executeContract('evaluate', 'VerifyHash', udi, docHash);
  }

  // =========================================================================
  // 获取资产统计
  // =========================================================================
  public async getAssetCount(): Promise<ServiceResponse> {
    return this.executeContract('evaluate', 'GetAssetCount');
  }
}

// 导出默认实例
export const assetService = new AssetService();
export default assetService;
