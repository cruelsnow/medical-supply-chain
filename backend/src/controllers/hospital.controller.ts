// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 医院控制器
// =============================================================================
// 功能: 处理医院相关的HTTP请求（入库验收、库存管理、临床核销）
// =============================================================================

import { Context } from 'koa';
import Router from '@koa/router';
import assetService, { ReceiptParams, BurnParams } from '../services/asset.service';
import { validate, receiptSchema, burnSchema } from '../middleware/validator';
import { requireWritePermission, orgCheckMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/hospital' });

// =============================================================================
// 扫码验收入库 - 仅限医院的操作员和管理员
// =============================================================================
router.post(
  '/inbound',
  requireWritePermission,
  orgCheckMiddleware(['hospital']),
  validate(receiptSchema),
  async (ctx: Context) => {
    try {
      const params = ctx.validatedData as ReceiptParams;

      // 设置医院组织上下文
      assetService.setContext('hospital', ctx.user?.walletId || '1');

      const result = await assetService.confirmReceipt(params);

      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data,
          message: '入库验收成功',
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
        error: error.message || '入库验收失败',
      };
    }
  }
);

// =============================================================================
// 库存查询
// =============================================================================
router.get(
  '/inventory',
  async (ctx: Context) => {
    try {
      const { status, batchNumber, keyword } = ctx.query as any;

      // 设置医院组织上下文
      assetService.setContext('hospital', ctx.user?.walletId || '1');

      let result;

      // 根据不同条件查询
      if (status) {
        result = await assetService.queryByStatus(status);
        // 按状态查询时，也要过滤为仅本组织的资产
        if (result.data) {
          result.data = (result.data as any[]).filter((a: any) => a.owner === 'hospital');
        }
      } else if (batchNumber) {
        result = await assetService.queryByBatch(batchNumber);
        if (result.data) {
          result.data = (result.data as any[]).filter((a: any) => a.owner === 'hospital');
        }
      } else {
        // 默认：查询 owner 为 hospital 的所有资产（排除已消耗）
        result = await assetService.queryByOwner('hospital');
        if (result.data) {
          result.data = (result.data as any[]).filter((a: any) => a.status !== 'CONSUMED');
        }
      }

      ctx.body = {
        success: true,
        data: result.data || [],
        total: (result.data as any[])?.length || 0,
        filters: { status, batchNumber, keyword },
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '库存查询失败',
      };
    }
  }
);

// =============================================================================
// 库存详情
// =============================================================================
router.get(
  '/inventory/:udi',
  async (ctx: Context) => {
    try {
      const { udi } = ctx.params;

      assetService.setContext('hospital', ctx.user?.walletId || '1');

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
          error: '资产不存在',
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
// 临床消耗核销 - 仅限医院的操作员和管理员
// =============================================================================
router.post(
  '/consume',
  requireWritePermission,
  orgCheckMiddleware(['hospital']),
  validate(burnSchema),
  async (ctx: Context) => {
    try {
      const params = ctx.validatedData as BurnParams;

      // 只有医院可以核销
      assetService.setContext('hospital', ctx.user?.walletId || '1');

      const result = await assetService.burnAsset(params);

      if (result.success) {
        ctx.body = {
          success: true,
          data: result.data,
          message: '消耗核销成功',
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
        error: error.message || '消耗核销失败',
      };
    }
  }
);

// =============================================================================
// 效期预警
// =============================================================================
router.get(
  '/expiring',
  async (ctx: Context) => {
    try {
      const days = parseInt((ctx.query.days as string) || '30', 10);

      assetService.setContext('hospital', ctx.user?.walletId || '1');

      const result = await assetService.queryExpiringSoon(days);

      // 过滤为仅本医院的资产
      const hospitalAssets = (result.data || []).filter((a: any) => a.owner === 'hospital');

      ctx.body = {
        success: true,
        data: hospitalAssets,
        total: (result.data as any[])?.length || 0,
        warningDays: days,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '效期预警查询失败',
      };
    }
  }
);

// =============================================================================
// 消耗记录
// =============================================================================
router.get(
  '/consumption',
  async (ctx: Context) => {
    try {
      const { startDate, endDate, department } = ctx.query as any;

      assetService.setContext('hospital', ctx.user?.walletId || '1');

      // 查询消耗记录（包含科室、操作者、消耗数量等详情）
      const result = await assetService.queryConsumeRecords(ctx.user?.orgName || 'hospital');

      let filteredData = result.data || [];

      if (startDate || endDate) {
        filteredData = filteredData.filter((record: any) => {
          const recordDate = new Date(record.consumedAt || record.updatedAt);
          if (startDate && recordDate < new Date(startDate)) return false;
          if (endDate && recordDate > new Date(endDate + 'T23:59:59')) return false;
          return true;
        });
      }

      if (department) {
        filteredData = filteredData.filter((record: any) =>
          record.department?.toLowerCase().includes(department.toLowerCase())
        );
      }

      // 补充资产详情（name, specification, batchNumber）
      const udiList = [...new Set(filteredData.map((r: any) => r.udi as string).filter(Boolean))] as string[];
      const assetMap: Record<string, any> = {};
      for (const udi of udiList) {
        try {
          const assetRes = await assetService.queryAsset(udi);
          if (assetRes.success && assetRes.data) {
            assetMap[udi] = assetRes.data;
          }
        } catch {
          // 查不到就跳过
        }
      }

      const enrichedData = filteredData.map((record: any) => {
        const asset = assetMap[record.udi] || {};
        return {
          ...record,
          name: record.name || asset.name || '-',
          specification: record.specification || asset.specification || '-',
          batchNumber: record.batchNumber || asset.batchNumber || '-',
        };
      });

      ctx.body = {
        success: true,
        data: enrichedData,
        total: enrichedData.length,
        filters: { startDate, endDate, department },
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '消耗记录查询失败',
      };
    }
  }
);

export default router;
