// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 路由配置
// =============================================================================
// 功能: 统一管理所有API路由
// =============================================================================

import Router from '@koa/router';

// 导入各模块路由
import assetRouter from '../controllers/asset.controller';
import hospitalRouter from '../controllers/hospital.controller';
import logisticsRouter from '../controllers/logistics.controller';
import traceRouter from '../controllers/trace.controller';
import authRouter from '../controllers/auth.controller';
import orderRouter from '../controllers/order.controller';
import alertRouter from '../controllers/alert.controller';

// 导入中间件
import { authMiddleware } from '../middleware/auth';

// 创建主路由
const router = new Router({ prefix: '/api' });

// =============================================================================
// 路由注册
// =============================================================================

// 认证路由 - 登录注册无需认证
// 注意：authRouter 中的用户管理接口需要认证，在后面单独处理

// 以下路由需要认证
router.use(authMiddleware);

// 认证相关路由（登录接口会在 controller 中跳过认证检查）
router.use(authRouter.routes());

// 资产管理路由
router.use(assetRouter.routes());

// 医院管理路由
router.use(hospitalRouter.routes());

// 物流管理路由
router.use(logisticsRouter.routes());

// 追溯监管路由
router.use(traceRouter.routes());

// 订单管理路由
router.use(orderRouter.routes());

// 告警管理路由
router.use(alertRouter.routes());

// =============================================================================
// API文档（简易版）
// =============================================================================
router.get('/docs', async (ctx) => {
  ctx.body = {
    success: true,
    data: {
      title: '医用耗材供应链管理系统 API 文档',
      version: '1.0.0',
      endpoints: {
        auth: {
          'POST /api/auth/login': '用户登录',
          'POST /api/auth/register': '用户注册',
          'GET /api/auth/me': '获取当前用户信息',
          'POST /api/auth/refresh': '刷新令牌',
          'POST /api/auth/logout': '登出',
        },
        asset: {
          'POST /api/asset/init': '资产初始化（上链）',
          'POST /api/asset/transfer': '权属转移（发货）',
          'GET /api/asset/query/:udi': '查询单个资产',
          'GET /api/asset/all': '查询所有资产',
          'GET /api/asset/owner/:owner': '按所有者查询',
          'GET /api/asset/status/:status': '按状态查询',
          'GET /api/asset/batch/:batchNumber': '按批次查询',
          'GET /api/asset/history/:udi': '资产历史追溯',
          'POST /api/asset/burn': '消耗核销',
          'POST /api/asset/recall': '资产召回',
          'GET /api/asset/stats': '资产统计',
        },
        hospital: {
          'POST /api/hospital/inbound': '扫码入库',
          'GET /api/hospital/inventory': '库存查询',
          'GET /api/hospital/inventory/:udi': '库存详情',
          'POST /api/hospital/consume': '临床消耗',
          'GET /api/hospital/expiring': '效期预警',
          'GET /api/hospital/consumption': '消耗记录',
        },
        logistics: {
          'POST /api/logistics/receive': '收货确权',
          'POST /api/logistics/envdata': '更新环境数据',
          'GET /api/logistics/transit': '在途资产查询',
          'GET /api/logistics/abnormal': '异常资产查询',
        },
        trace: {
          'GET /api/trace/report/:udi': '全链追溯报告',
          'POST /api/trace/verify': '哈希一致性校验',
          'POST /api/trace/batch': '批量追溯',
          'GET /api/trace/stats': '全局统计',
          'POST /api/trace/hash': '计算文件哈希',
        },
      },
    },
  };
});

export default router;
