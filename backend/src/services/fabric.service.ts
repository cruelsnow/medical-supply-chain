// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - Fabric SDK服务
// =============================================================================
// 功能: 封装Hyperledger Fabric SDK，提供区块链交互能力
// =============================================================================

import {
  Gateway,
  Wallets,
  Wallet,
  Network,
  Contract,
  GatewayOptions,
} from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';
import { config } from '../config';

// =============================================================================
// 类型定义
// =============================================================================

interface FabricConnection {
  gateway: Gateway;
  network: Network;
  contract: Contract;
}

interface TransactionResult {
  success: boolean;
  data?: any;
  error?: string;
  txId?: string;
}

// =============================================================================
// Fabric服务类
// =============================================================================

export class FabricService {
  private static instance: FabricService;
  private wallet: Wallet | null = null;
  private gateway: Gateway | null = null;
  private network: Network | null = null;
  private contract: Contract | null = null;
  private connectionCache: Map<string, { network: Network; contract: Contract; gateway: Gateway; lastUsed: number }> = new Map();
  private isConnecting: boolean = false;
  private connectionPromise: Promise<FabricConnection> | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // 连接缓存过期时间（5分钟）
  public static CACHE_TTL = 5 * 60 * 1000;

  // 私有构造函数（单例模式）
  private constructor() {
    // 启动定期清理过期连接的任务
    this.startCleanupTask();
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupTask(): void {
    // 每分钟清理一次过期连接
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredConnections();
    }, 60000);
  }

  /**
   * 清理过期连接
   */
  private cleanupExpiredConnections(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of this.connectionCache.entries()) {
      if (now - cached.lastUsed > FabricService.CACHE_TTL) {
        expiredKeys.push(key);
        try {
          cached.gateway.disconnect();
          console.log(`清理过期连接: ${key}`);
        } catch (error) {
          console.error(`断开过期连接失败: ${key}`, error);
        }
      }
    }

    expiredKeys.forEach(key => this.connectionCache.delete(key));
  }

  /**
   * 获取FabricService单例实例
   */
  public static getInstance(): FabricService {
    if (!FabricService.instance) {
      FabricService.instance = new FabricService();
    }
    return FabricService.instance;
  }

  /**
   * 初始化钱包
   * @param orgName 组织名称
   */
  public async initWallet(orgName: string): Promise<void> {
    const walletPath = path.join(
      __dirname,
      '../../',
      config.fabric.walletPath,
      orgName
    );

    // 确保钱包目录存在
    if (!fs.existsSync(walletPath)) {
      fs.mkdirSync(walletPath, { recursive: true });
    }

    this.wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`钱包初始化完成: ${walletPath}`);
  }

  /**
   * 检查用户是否已在钱包中
   * @param userId 用户ID
   */
  public async checkUserExists(userId: string): Promise<boolean> {
    if (!this.wallet) {
      throw new Error('钱包未初始化');
    }
    const identity = await this.wallet.get(userId);
    return identity !== undefined;
  }

  /**
   * 连接到Fabric网络
   * @param orgName 组织名称
   * @param userId 用户ID
   */
  public async connect(orgName: string, userId: string): Promise<FabricConnection> {
    const cacheKey = `${orgName}:${userId}`;

    // 检查缓存中是否有有效连接
    const cached = this.connectionCache.get(cacheKey);
    if (cached && (Date.now() - cached.lastUsed) < FabricService.CACHE_TTL) {
      cached.lastUsed = Date.now();
      console.log(`使用缓存的Fabric连接: ${cacheKey}`);
      return {
        gateway: cached.gateway,
        network: cached.network,
        contract: cached.contract,
      };
    }

    // 防止并发连接
    if (this.isConnecting && this.connectionPromise) {
      console.log('等待现有连接完成...');
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = this._doConnect(orgName, userId, cacheKey);

    try {
      return await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  /**
   * 实际执行连接
   */
  private async _doConnect(orgName: string, userId: string, cacheKey: string): Promise<FabricConnection> {
    try {
      // 初始化钱包
      await this.initWallet(orgName);

      // 检查用户身份
      if (!(await this.checkUserExists(userId))) {
        throw new Error(
          `用户 ${userId} 不存在于钱包中，请先注册用户`
        );
      }

      // 加载连接配置
      const ccpPath = path.join(
        __dirname,
        '../../',
        config.fabric.connectionProfilePath
      );

      let ccp: any;
      if (fs.existsSync(ccpPath)) {
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        ccp = JSON.parse(ccpJSON);
        // 设置客户端组织
        const orgNameCapitalized = orgName.charAt(0).toUpperCase() + orgName.slice(1);
        ccp.client = ccp.client || {};
        ccp.client.organization = orgNameCapitalized;

        // 将相对路径转换为绝对路径
        const ccpDir = path.dirname(ccpPath);
        if (ccp.peers) {
          for (const peerName in ccp.peers) {
            const peer = ccp.peers[peerName];
            if (peer.tlsCACerts && peer.tlsCACerts.path) {
              peer.tlsCACerts.path = path.resolve(ccpDir, peer.tlsCACerts.path);
            }
          }
        }
        if (ccp.orderers) {
          for (const ordererName in ccp.orderers) {
            const orderer = ccp.orderers[ordererName];
            if (orderer.tlsCACerts && orderer.tlsCACerts.path) {
              orderer.tlsCACerts.path = path.resolve(ccpDir, orderer.tlsCACerts.path);
            }
          }
        }
      } else {
        // 使用硬编码的连接配置
        ccp = this.getConnectionProfile(orgName);
      }

      // 创建Gateway连接
      this.gateway = new Gateway();

      // 获取MSP ID
      const mspId = this.getMspId(orgName);

      const gatewayOptions: GatewayOptions = {
        wallet: this.wallet!,
        identity: userId,
        discovery: {
          enabled: false,
          asLocalhost: true,
        },
      };

      // 添加超时处理
      const connectWithTimeout = Promise.race([
        this.gateway.connect(ccp, gatewayOptions),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('连接超时（10秒）')), 10000)
        ),
      ]);

      await connectWithTimeout;

      // 获取网络和合约
      const network = await this.gateway.getNetwork(config.fabric.channelName);
      const contract = network.getContract(config.fabric.chaincodeName);

      // 缓存连接
      this.connectionCache.set(cacheKey, {
        gateway: this.gateway,
        network,
        contract,
        lastUsed: Date.now(),
      });

      console.log(`成功连接到Fabric网络 - 通道: ${config.fabric.channelName}`);

      return {
        gateway: this.gateway,
        network,
        contract,
      };
    } catch (error) {
      console.error('连接Fabric网络失败:', error);
      throw error;
    }
  }

  /**
   * 获取组织的MSP ID
   */
  private getMspId(orgName: string): string {
    const mspMap: { [key: string]: string } = {
      producer: 'ProducerMSP',
      distributor: 'DistributorMSP',
      hospital: 'HospitalMSP',
      regulator: 'RegulatorMSP',
    };
    return mspMap[orgName.toLowerCase()] || 'ProducerMSP';
  }

  /**
   * 断开连接（现在只清除过期的缓存连接）
   */
  public disconnect(): void {
    // 清除过期的缓存连接
    const now = Date.now();
    for (const [key, cached] of this.connectionCache.entries()) {
      if (now - cached.lastUsed > FabricService.CACHE_TTL) {
        console.log(`断开过期连接: ${key}`);
        cached.gateway.disconnect();
        this.connectionCache.delete(key);
      }
    }
  }

  /**
   * 强制断开所有连接
   */
  public disconnectAll(): void {
    for (const [key, cached] of this.connectionCache.entries()) {
      console.log(`断开连接: ${key}`);
      cached.gateway.disconnect();
    }
    this.connectionCache.clear();

    if (this.gateway) {
      this.gateway.disconnect();
      this.gateway = null;
      console.log('已断开与Fabric网络的连接');
    }
  }

  /**
   * 提交交易（写入账本）
   * @param contract 合约实例
   * @param functionName 函数名
   * @param args 参数列表
   */
  public async submitTransaction(
    contract: Contract,
    functionName: string,
    ...args: string[]
  ): Promise<TransactionResult> {
    try {
      console.log(`提交交易: ${functionName}(${args.join(', ')})`);

      const result = await contract.submitTransaction(functionName, ...args);

      // 解析结果
      let data: any = null;
      if (result && result.length > 0) {
        data = JSON.parse(result.toString());
      }

      return {
        success: true,
        data,
        txId: this.gateway?.getIdentity()?.mspId || 'unknown',
      };
    } catch (error: any) {
      console.error(`交易提交失败: ${functionName}`, error);
      return {
        success: false,
        error: error.message || '交易提交失败',
      };
    }
  }

  /**
   * 评估交易（查询账本，不写入）
   * @param contract 合约实例
   * @param functionName 函数名
   * @param args 参数列表
   */
  public async evaluateTransaction(
    contract: Contract,
    functionName: string,
    ...args: string[]
  ): Promise<TransactionResult> {
    try {
      console.log(`评估交易: ${functionName}(${args.join(', ')})`);

      const result = await contract.evaluateTransaction(functionName, ...args);

      // 解析结果
      let data: any = null;
      if (result && result.length > 0) {
        data = JSON.parse(result.toString());
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error(`交易评估失败: ${functionName}`, error);
      return {
        success: false,
        error: error.message || '交易评估失败',
      };
    }
  }

  /**
   * 获取连接配置（根据组织名称）
   */
  private getConnectionProfile(orgName: string): any {
    const baseProfile: any = {
      name: 'medical-supply-chain-network',
      version: '1.0.0',
      client: {
        organization: orgName.charAt(0).toUpperCase() + orgName.slice(1),
        connection: {
          timeout: {
            peer: { endorser: '300' },
            orderer: '300',
          },
        },
      },
    };

    // 根据组织名称返回相应的配置
    // 实际项目中应该从配置文件加载
    return baseProfile;
  }

  /**
   * 监听链码事件
   * @param network 网络实例
   * @param eventName 事件名称
   * @param callback 回调函数
   */
  public async listenToEvents(
    network: Network,
    eventName: string,
    callback: (event: any) => void
  ): Promise<void> {
    const contract = network.getContract(config.fabric.chaincodeName);
    const listener = await contract.addContractListener(
      async (event) => {
        console.log(`收到链码事件: ${event.eventName}`);
        callback(event);
      }
    );

    console.log(`已注册事件监听器: ${eventName}`);
  }
}

// 导出单例实例
export const fabricService = FabricService.getInstance();
export default fabricService;
