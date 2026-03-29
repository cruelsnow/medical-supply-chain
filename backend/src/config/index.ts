// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 全局配置
// =============================================================================

import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// =============================================================================
// 配置接口定义
// =============================================================================

interface ServerConfig {
  port: number;
  host: string;
  env: string;
}

interface JwtConfig {
  secret: string;
  expiresIn: string;
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: 'mysql';
  logging: boolean;
}

interface FabricConfig {
  connectionProfilePath: string;
  channelName: string;
  chaincodeName: string;
  walletPath: string;
  mspId: string;
  userId: string;
}

// =============================================================================
// 配置对象
// =============================================================================

export const config = {
  // 服务器配置
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  } as ServerConfig,

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'medical-supply-chain-secret-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as JwtConfig,

  // 数据库配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'medical_supply_chain',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development',
  } as DatabaseConfig,

  // Hyperledger Fabric配置
  fabric: {
    connectionProfilePath: process.env.FABRIC_CONNECTION_PROFILE ||
      '../blockchain/network/config/connection-local.json',
    channelName: process.env.FABRIC_CHANNEL || 'supplychain-channel',
    chaincodeName: process.env.FABRIC_CHAINCODE || 'supplychain',
    walletPath: process.env.FABRIC_WALLET_PATH || '../blockchain/wallet',
    mspId: process.env.FABRIC_MSP_ID || 'ProducerMSP',
    userId: process.env.FABRIC_USER_ID || '1',
  } as FabricConfig,

  // 日志级别
  logLevel: process.env.LOG_LEVEL || 'info',

  // 文件上传配置
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10), // 10MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },

  // 模拟模式配置（开发时使用，避免连接区块链）
  mockMode: {
    enabled: process.env.MOCK_MODE === 'true' || process.env.NODE_ENV === 'development',
    responseDelay: parseInt(process.env.MOCK_DELAY || '100', 10), // 模拟延迟100ms
  },
};

// 判断是否为开发环境
export const isDevelopment = config.server.env === 'development';
export const isProduction = config.server.env === 'production';

export default config;
