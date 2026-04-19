// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 应用入口
// =============================================================================
// 功能: Koa应用初始化、中间件配置、路由注册、数据库连接
// =============================================================================

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import helmet from 'koa-helmet';
import cors from '@koa/cors';
import Router from '@koa/router';
import { createServer } from 'http';

import config from './config';
import { errorHandler } from './middleware/errorHandler';
import { responseFormatter } from './middleware/responseFormatter';
import { connectDB, closeDB } from './models';
import { initUsers } from './scripts/initUsers';
import { mockOrderService } from './services/mock-order.service';

// 创建Koa应用实例
const app = new Koa();
const server = createServer(app.callback());

// 创建路由实例
const router = new Router();

// 导入业务路由
import apiRoutes from './routes';

// =============================================================================
// 中间件配置
// =============================================================================

// 安全头中间件
app.use(helmet());

// CORS跨域配置
app.use(cors({
  origin: (ctx) => {
    // 开发环境允许所有来源
    if (config.server.env === 'development') {
      return '*';
    }
    // 生产环境只允许配置的域名
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
    ];
    const requestOrigin = ctx.request.header.origin || '';
    if (allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    return allowedOrigins[0] || '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// 请求日志中间件
if (config.server.env === 'development') {
  app.use(logger());
}

// 请求体解析中间件
app.use(bodyParser({
  enableTypes: ['json', 'form'],
  jsonLimit: '10mb',
  formLimit: '10mb',
}));

// 响应格式化中间件
app.use(responseFormatter);

// 全局错误处理中间件
app.use(errorHandler);

// =============================================================================
// 路由注册
// =============================================================================

// 健康检查 - 无需认证
router.get('/health', async (ctx) => {
  ctx.body = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  };
});

// 根路径
router.get('/', async (ctx) => {
  ctx.body = {
    success: true,
    data: {
      name: '医用耗材供应链管理系统 API',
      version: '1.0.0',
      description: '基于Hyperledger Fabric的医用耗材供应链管理系统后端服务',
      endpoints: {
        health: '/health',
        api: '/api',
        docs: '/api/docs',
      },
    },
  };
});

// 注册业务路由（apiRoutes 已经有 /api 前缀）
router.use(apiRoutes.routes(), apiRoutes.allowedMethods());

// 注册根路由
app.use(router.routes());
app.use(router.allowedMethods());

// =============================================================================
// 启动服务器
// =============================================================================

const PORT = config.server.port;
const HOST = config.server.host;

/**
 * 应用启动函数
 * 1. 连接数据库
 * 2. 初始化默认用户
 * 3. 启动HTTP服务
 */
async function start() {
  try {
    // 1. 连接数据库
    console.log('');
    console.log('🚀 正在启动服务...');
    console.log('');
    await connectDB();

    // 2. 初始化默认用户
    await initUsers();

    // 3. 初始化模拟订单和告警数据
    await mockOrderService.initMockData();

    // 4. 启动HTTP服务
    server.listen(PORT, HOST, () => {
      console.log('');
      console.log('='.repeat(60));
      console.log('    医用耗材供应链管理系统 - 后端服务');
      console.log('='.repeat(60));
      console.log(`    环境: ${config.server.env}`);
      console.log(`    地址: http://${HOST}:${PORT}`);
      console.log(`    时间: ${new Date().toLocaleString()}`);
      console.log('='.repeat(60));
      console.log('');
      console.log('可用的API接口:');
      console.log('');
      console.log('  [认证相关]');
      console.log('  POST   /api/auth/login          - 用户登录');
      console.log('  POST   /api/auth/logout         - 用户登出');
      console.log('  POST   /api/auth/refresh        - 刷新令牌');
      console.log('  GET    /api/auth/me             - 获取当前用户');
      console.log('  PUT    /api/auth/password       - 修改密码');
      console.log('  POST   /api/auth/register       - 创建用户(管理员)');
      console.log('  GET    /api/auth/users          - 用户列表(管理员)');
      console.log('');
      console.log('  [资产管理]');
      console.log('  POST   /api/asset/init          - 资产初始化');
      console.log('  POST   /api/asset/transfer      - 权属转移');
      console.log('  GET    /api/asset/query/:udi    - 查询资产');
      console.log('  GET    /api/asset/history/:udi  - 历史追溯');
      console.log('  POST   /api/asset/burn          - 消耗核销');
      console.log('');
      console.log('  [医院管理]');
      console.log('  POST   /api/hospital/inbound    - 医院入库');
      console.log('  GET    /api/hospital/inventory  - 库存查询');
      console.log('');
      console.log('  [物流管理]');
      console.log('  POST   /api/logistics/receive   - 收货确权');
      console.log('  POST   /api/logistics/envdata   - 环境数据');
      console.log('');
      console.log('  [追溯查询]');
      console.log('  POST   /api/trace/verify        - 哈希校验');
      console.log('  GET    /api/trace/report/:udi   - 溯源报告');
      console.log('');
      console.log('  [订单管理]');
      console.log('  POST   /api/order               - 创建订单');
      console.log('  GET    /api/order               - 订单列表');
      console.log('  GET    /api/order/:id           - 订单详情');
      console.log('  PUT    /api/order/:id/confirm   - 经销商确认');
      console.log('  PUT    /api/order/:id/dispatch  - 发货');
      console.log('  PUT    /api/order/:id/deliver   - 确认送达');
      console.log('');
      console.log('  [告警中心]');
      console.log('  GET    /api/alert               - 告警列表');
      console.log('  PUT    /api/alert/:id/acknowledge - 确认告警');
      console.log('  PUT    /api/alert/:id/resolve   - 解决告警');
      console.log('  POST   /api/alert/check         - 手动检查');
      console.log('');
    });
  } catch (error) {
    console.error('❌ 服务启动失败:', error);
    process.exit(1);
  }
}

// 启动应用
start();

// =============================================================================
// 优雅关闭
// =============================================================================

process.on('SIGTERM', async () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  await closeDB();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  await closeDB();
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

export default app;
