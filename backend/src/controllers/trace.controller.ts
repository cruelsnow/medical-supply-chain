// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 追溯监管控制器
// =============================================================================
// 功能: 处理监管追溯相关的HTTP请求（全链追溯、哈希校验）
// =============================================================================

import { Context } from 'koa';
import Router from '@koa/router';
import assetService from '../services/asset.service';
import { validate, verifyHashSchema } from '../middleware/validator';
import hashService from '../services/hash.service';

const router = new Router({ prefix: '/trace' });

// =============================================================================
// 全链路追溯
// =============================================================================
router.get(
  '/report/:udi',
  async (ctx: Context) => {
    try {
      const { udi } = ctx.params;

      // 监管机构有全局追溯权限
      assetService.setContext('regulator', ctx.user?.walletId || '1');

      // 获取资产当前状态
      const assetResult = await assetService.queryAsset(udi);

      if (!assetResult.success) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: '资产不存在',
          udi,
        };
        return;
      }

      // 获取历史记录
      const historyResult = await assetService.getHistory(udi);

      ctx.body = {
        success: true,
        data: {
          asset: assetResult.data,
          history: historyResult.data || [],
        },
        udi,
        message: '追溯报告生成成功',
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
// 哈希一致性校验
// =============================================================================
router.post(
  '/verify',
  validate(verifyHashSchema),
  async (ctx: Context) => {
    try {
      const { udi, docHash } = ctx.validatedData;

      assetService.setContext('regulator', ctx.user?.walletId || '1');

      // 先获取资产信息
      const assetResult = await assetService.queryAsset(udi);

      if (!assetResult.success) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: '资产不存在',
          udi,
        };
        return;
      }

      // 调用链上验证
      const result = await assetService.verifyHash(udi, docHash);

      if (result.success) {
        const verifyResult = result.data as any;
        ctx.body = {
          success: true,
          data: {
            udi,
            isValid: verifyResult.isValid,
            storedHash: verifyResult.storedHash,
            providedHash: verifyResult.providedHash,
            verifiedAt: verifyResult.verifiedAt,
          },
          message: verifyResult.isValid ? '文档验证通过，未被篡改' : '文档验证失败，可能已被篡改',
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
        error: error.message || '哈希校验失败',
      };
    }
  }
);

// =============================================================================
// 批量追溯
// =============================================================================
router.post(
  '/batch',
  async (ctx: Context) => {
    try {
      const { udiList } = ctx.request.body as any;

      if (!Array.isArray(udiList) || udiList.length === 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '请提供UDI列表',
        };
        return;
      }

      assetService.setContext('regulator', ctx.user?.walletId || '1');

      const results = [];

      for (const udi of udiList) {
        const assetResult = await assetService.queryAsset(udi);
        const historyResult = await assetService.getHistory(udi);

        results.push({
          udi,
          success: assetResult.success,
          asset: assetResult.data,
          history: historyResult.data,
          error: assetResult.error,
        });
      }

      ctx.body = {
        success: true,
        data: results,
        total: results.length,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '批量追溯失败',
      };
    }
  }
);

// =============================================================================
// 全局统计
// =============================================================================
router.get(
  '/stats',
  async (ctx: Context) => {
    try {
      assetService.setContext('regulator', ctx.user?.walletId || '1');

      const countResult = await assetService.getAssetCount();

      // 获取各状态资产统计
      const statusCounts = {
        created: 0,
        inTransit: 0,
        inStock: 0,
        consumed: 0,
        recall: 0,
        exception: 0,
      };

      if (countResult.success && countResult.data) {
        Object.assign(statusCounts, countResult.data);
      }

      ctx.body = {
        success: true,
        data: {
          total: statusCounts.created + statusCounts.inTransit + statusCounts.inStock + statusCounts.consumed,
          byStatus: statusCounts,
          timestamp: new Date().toISOString(),
        },
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

// =============================================================================
// 计算文件哈希（辅助接口）
// =============================================================================
router.post(
  '/hash',
  async (ctx: Context) => {
    try {
      const { content } = ctx.request.body as any;

      if (!content) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '请提供待计算的内容',
        };
        return;
      }

      const hash = hashService.hashString(content);

      ctx.body = {
        success: true,
        data: {
          hash,
          algorithm: 'SHA-256',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '哈希计算失败',
      };
    }
  }
);

export default router;
