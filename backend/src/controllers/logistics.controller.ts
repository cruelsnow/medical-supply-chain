// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 物流控制器
// =============================================================================
// 功能: 处理物流相关的HTTP请求（收货确权、环境监控）
// =============================================================================

import { Context } from 'koa';
import Router from '@koa/router';
import assetService, { ReceiptParams, EnvDataParams } from '../services/asset.service';
import { validate, receiptSchema, envDataSchema } from '../middleware/validator';
import { requireWritePermission, orgCheckMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/logistics' });

// =============================================================================
// 收货确权 - 仅限经销商的操作员和管理员
// =============================================================================
router.post(
  '/receive',
  requireWritePermission,
  orgCheckMiddleware(['distributor']),
  validate(receiptSchema),
  async (ctx: Context) => {
    try {
      const params = ctx.validatedData as ReceiptParams;

      // 设置经销商/物流组织上下文
      assetService.setContext('distributor', ctx.user?.walletId || '2');

      const result = await assetService.confirmReceipt(params);

      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data,
          message: '收货确权成功',
          txId: result.txId,
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: result.error,
        };
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '收货确权失败',
      };
    }
  }
);

// =============================================================================
// 更新环境数据（冷链监控）- 仅限经销商的操作员和管理员
// =============================================================================
router.post(
  '/envdata',
  requireWritePermission,
  orgCheckMiddleware(['distributor']),
  validate(envDataSchema),
  async (ctx: Context) => {
    try {
      const params = ctx.validatedData as EnvDataParams;

      // 只有经销商/物流可以更新环境数据
      assetService.setContext('distributor', ctx.user?.walletId || '2');

      const result = await assetService.updateEnvData(params);

      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data,
          message: '环境数据更新成功',
          txId: result.txId,
          isAbnormal: params.isAbnormal,
        };
      } else {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: result.error,
        };
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '环境数据更新失败',
      };
    }
  }
);

// =============================================================================
// 在途资产查询
// =============================================================================
router.get(
  '/transit',
  async (ctx: Context) => {
    try {
      assetService.setContext('distributor', ctx.user?.walletId || '2');

      const result = await assetService.queryByStatus('IN_TRANSIT');

      ctx.body = {
        success: true,
        data: result.data || [],
        total: (result.data as any[])?.length || 0,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '在途资产查询失败',
      };
    }
  }
);

// =============================================================================
// 环境异常资产查询
// =============================================================================
router.get(
  '/abnormal',
  async (ctx: Context) => {
    try {
      assetService.setContext('distributor', ctx.user?.walletId || '2');

      const result = await assetService.queryByStatus('EXCEPTION');

      ctx.body = {
        success: true,
        data: result.data || [],
        total: (result.data as any[])?.length || 0,
        warning: '以下资产存在环境异常，请及时处理',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '异常资产查询失败',
      };
    }
  }
);

export default router;
