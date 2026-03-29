// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 资产控制器
// =============================================================================
// 功能: 处理资产管理相关的HTTP请求
// =============================================================================

import { Context } from 'koa';
import Router from '@koa/router';
import assetService, { InitAssetParams, TransferParams } from '../services/asset.service';
import { validate, initAssetSchema, transferSchema } from '../middleware/validator';
import { requireWritePermission, orgCheckMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/asset' });

// =============================================================================
// 资产初始化（源头赋码上链）- 仅限生产商的操作员和管理员
// =============================================================================
router.post(
  '/init',
  requireWritePermission,
  orgCheckMiddleware(['producer']),
  validate(initAssetSchema),
  async (ctx: Context) => {
    try {
      const params = ctx.validatedData as InitAssetParams;

      // 设置组织上下文（使用共享钱包身份）
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext('producer', walletId);

      const result = await assetService.initAsset(params);

      if (result.success) {
        ctx.status = 201;
        ctx.body = {
          success: true,
          data: result.data,
          message: '资产初始化成功',
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
        error: error.message || '资产初始化失败',
      };
    }
  }
);

// =============================================================================
// 权属转移（发货）- 生产商和经销商的操作员和管理员
// =============================================================================
router.post(
  '/transfer',
  requireWritePermission,
  orgCheckMiddleware(['producer', 'distributor']),
  validate(transferSchema),
  async (ctx: Context) => {
    try {
      const params = ctx.validatedData as TransferParams;

      // 根据用户组织设置上下文（使用共享钱包身份）
      const orgName = ctx.user?.orgName || 'producer';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.transferAsset(params);

      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data,
          message: '资产转移成功',
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
        error: error.message || '资产转移失败',
      };
    }
  }
);

// =============================================================================
// 查询单个资产
// =============================================================================
router.get(
  '/query/:udi',
  async (ctx: Context) => {
    try {
      const { udi } = ctx.params;

      // 设置组织上下文（使用共享钱包身份）
      const orgName = ctx.user?.orgName || 'producer';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.queryAsset(udi);

      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data,
        };
      } else {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: result.error || '资产不存在',
        };
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '查询失败',
      };
    }
  }
);

// =============================================================================
// 查询所有资产（按组织权限过滤）
// =============================================================================
router.get(
  '/all',
  async (ctx: Context) => {
    try {
      const orgName = ctx.user?.orgName || 'producer';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.queryAllAssets();
      let assets = result.data || [];

      // 按组织权限过滤资产
      if (orgName !== 'regulator') {
        // 监管机构可以看到所有资产
        assets = (assets as any[]).filter((asset: any) => {
          if (orgName === 'producer') {
            // 生产商：只能看到自己生产的资产
            return asset.producer === orgName || asset.producerMSP?.toLowerCase().includes('producer');
          } else if (orgName === 'hospital') {
            // 医院：只能看到自己入库的资产（owner是自己）
            return asset.owner === orgName || asset.owner?.toLowerCase().includes('hospital');
          } else if (orgName === 'distributor') {
            // 经销商：可以看到当前在自己手中的 + 曾经经手过的（在途状态）
            return (
              asset.owner === orgName ||
              asset.owner?.toLowerCase().includes('distributor') ||
              asset.status === 'IN_TRANSIT' // 在途资产经销商也可见
            );
          }
          return true;
        });
      }

      ctx.body = {
        success: true,
        data: assets,
        total: assets.length,
        filteredBy: orgName !== 'regulator' ? orgName : null,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '查询失败',
      };
    }
  }
);

// =============================================================================
// 按所有者查询
// =============================================================================
router.get(
  '/owner/:owner',
  async (ctx: Context) => {
    try {
      const { owner } = ctx.params;
      const orgName = ctx.user?.orgName || 'producer';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.queryByOwner(owner);

      ctx.body = {
        success: true,
        data: result.data || [],
        total: (result.data as any[])?.length || 0,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '查询失败',
      };
    }
  }
);

// =============================================================================
// 按状态查询
// =============================================================================
router.get(
  '/status/:status',
  async (ctx: Context) => {
    try {
      const { status } = ctx.params;
      const orgName = ctx.user?.orgName || 'producer';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.queryByStatus(status);

      ctx.body = {
        success: true,
        data: result.data || [],
        total: (result.data as any[])?.length || 0,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '查询失败',
      };
    }
  }
);

// =============================================================================
// 按批次查询
// =============================================================================
router.get(
  '/batch/:batchNumber',
  async (ctx: Context) => {
    try {
      const { batchNumber } = ctx.params;
      const orgName = ctx.user?.orgName || 'producer';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.queryByBatch(batchNumber);

      ctx.body = {
        success: true,
        data: result.data || [],
        total: (result.data as any[])?.length || 0,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '查询失败',
      };
    }
  }
);

// =============================================================================
// 历史追溯
// =============================================================================
router.get(
  '/history/:udi',
  async (ctx: Context) => {
    try {
      const { udi } = ctx.params;
      const orgName = ctx.user?.orgName || 'regulator';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.getHistory(udi);

      ctx.body = {
        success: true,
        data: result.data || [],
        udi,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '追溯查询失败',
      };
    }
  }
);

// =============================================================================
// 消耗核销 - 仅限医院的操作员和管理员
// =============================================================================
router.post(
  '/burn',
  requireWritePermission,
  orgCheckMiddleware(['hospital']),
  validate(require('../middleware/validator').burnSchema),
  async (ctx: Context) => {
    try {
      const params = ctx.validatedData;

      // 只有医院可以核销
      const walletId = ctx.user?.walletId || '3';
      assetService.setContext('hospital', walletId);

      const result = await assetService.burnAsset(params);

      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data,
          message: '资产核销成功',
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
        error: error.message || '资产核销失败',
      };
    }
  }
);

// =============================================================================
// 资产召回 - 生产商或监管机构的操作员和管理员
// =============================================================================
router.post(
  '/recall',
  requireWritePermission,
  orgCheckMiddleware(['producer', 'regulator']),
  async (ctx: Context) => {
    try {
      const { udi, reason } = ctx.request.body as any;

      if (!udi || !reason) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '缺少必要参数',
        };
        return;
      }

      // 生产商或监管机构可以召回
      const orgName = ctx.user?.orgName || 'producer';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.recallAsset(udi, reason);

      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data,
          message: '资产召回成功',
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
        error: error.message || '资产召回失败',
      };
    }
  }
);

// =============================================================================
// 资产统计
// =============================================================================
router.get(
  '/stats',
  async (ctx: Context) => {
    try {
      const orgName = ctx.user?.orgName || 'regulator';
      const walletId = ctx.user?.walletId || '1';
      assetService.setContext(orgName, walletId);

      const result = await assetService.getAssetCount();

      ctx.body = {
        success: true,
        data: result.data,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '统计查询失败',
      };
    }
  }
);

export default router;
