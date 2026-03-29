/**
 * =============================================================================
 * 医用耗材供应链管理系统 - Jest测试环境设置
 * =============================================================================
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';

// 数据库配置
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'supply_chain_test';

// Fabric配置
process.env.FABRIC_CHANNEL_NAME = 'test-channel';
process.env.FABRIC_CHAINCODE_NAME = 'test-chaincode';

// 增加测试超时时间
jest.setTimeout(15000);

// 全局beforeEach钩子
beforeEach(() => {
  // 清除所有模拟
  jest.clearAllMocks();
});

// 全局afterAll钩子
afterAll(async () => {
  // 清理资源
  await new Promise(resolve => setTimeout(resolve, 500));
});

// 控制台静默（可选，用于减少测试输出噪音）
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };
