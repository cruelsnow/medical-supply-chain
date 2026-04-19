// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 告警控制器
// =============================================================================
// 功能: 处理告警相关的HTTP请求
// =============================================================================

import { Context } from 'koa';
import Router from '@koa/router';
import alertService from '../services/alert.service';

const router = new Router({ prefix: '/alert' });

// =============================================================================
// 查询告警列表（按组织过滤）
// =============================================================================
router.get(
  '/',
  async (ctx: Context) => {
    try {
      const { type, level, status, page, pageSize } = ctx.query;
      const filters: any = { page: 1, pageSize: 20 };

      if (type) filters.type = type;
      if (level) filters.level = level;
      if (status) filters.status = status;
      filters.page = parseInt(page as string) || 1;
      filters.pageSize = parseInt(pageSize as string) || 20;

      // 按组织过滤（regulator 看全部告警，其他只看本组织）
      if (ctx.user!.orgName === 'regulator') {
        filters.orgName = 'regulator'; // regulator 可以看到所有
      } else {
        filters.orgName = ctx.user!.orgName;
      }

      const result = await alertService.listAlerts(filters);
      ctx.body = {
        success: true,
        data: {
          list: result.rows,
          total: result.count,
          page: filters.page,
          pageSize: filters.pageSize,
        },
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message || '查询告警失败' };
    }
  }
);

// =============================================================================
// 告警统计（必须在 /:id 之前注册）
// =============================================================================
router.get(
  '/stats',
  async (ctx: Context) => {
    try {
      const stats = await alertService.getAlertStats(ctx.user!.orgName);
      ctx.body = { success: true, data: stats };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message || '统计查询失败' };
    }
  }
);

// =============================================================================
// 查询告警规则（必须在 /:id 之前注册）
// =============================================================================
router.get(
  '/rules',
  async (ctx: Context) => {
    try {
      const rules = await alertService.getAlertRules();
      ctx.body = { success: true, data: rules };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message || '查询规则失败' };
    }
  }
);

// =============================================================================
// 手动触发告警检查
// =============================================================================
router.post(
  '/check',
  async (ctx: Context) => {
    try {
      const results = await alertService.runAllChecks();
      ctx.body = {
        success: true,
        data: results,
        message: `检查完成，新产生 ${results} 条告警`,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message || '告警检查失败' };
    }
  }
);

// =============================================================================
// 查询告警详情
// =============================================================================
router.get(
  '/:id',
  async (ctx: Context) => {
    try {
      const alert = await alertService.getAlertById(ctx.params.id);
      if (!alert) {
        ctx.status = 404;
        ctx.body = { success: false, error: '告警不存在' };
        return;
      }
      ctx.body = { success: true, data: alert };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message || '查询失败' };
    }
  }
);

// =============================================================================
// 告警确认
// =============================================================================
router.put(
  '/:id/acknowledge',
  async (ctx: Context) => {
    try {
      const alert = await alertService.acknowledgeAlert(
        ctx.params.id,
        ctx.user!.userId
      );
      ctx.body = { success: true, data: alert, message: '告警已确认' };
    } catch (error: any) {
      ctx.status = error.message.includes('不存在') ? 404 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 解决告警
// =============================================================================
router.put(
  '/:id/resolve',
  async (ctx: Context) => {
    try {
      const alert = await alertService.resolveAlert(
        ctx.params.id,
        ctx.user!.userId
      );
      ctx.body = { success: true, data: alert, message: '告警已解决' };
    } catch (error: any) {
      ctx.status = error.message.includes('不存在') ? 404 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 更新告警规则
// =============================================================================
router.put(
  '/rules/:id',
  async (ctx: Context) => {
    try {
      const { thresholdValue, timeLimitHours, isEnabled, description } = ctx.request.body as any;
      const rule = await alertService.updateAlertRule(ctx.params.id, {
        thresholdValue,
        timeLimitHours,
        isEnabled,
        description,
      });
      ctx.body = { success: true, data: rule, message: '规则更新成功' };
    } catch (error: any) {
      ctx.status = error.message.includes('不存在') ? 404 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

export default router;
