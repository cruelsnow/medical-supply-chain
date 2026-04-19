// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 订单控制器
// =============================================================================
// 功能: 处理采购订单相关的HTTP请求
// =============================================================================

import { Context } from 'koa';
import Router from '@koa/router';
import orderService from '../services/order.service';
import { OrderStatus } from '../models/order.model';
import { validate, createOrderSchema, updateOrderStatusSchema, orderListQuerySchema } from '../middleware/validator';
import { requireWritePermission, orgCheckMiddleware } from '../middleware/auth';

const router = new Router({ prefix: '/order' });

// =============================================================================
// 创建订单 - 仅医院
// =============================================================================
router.post(
  '/',
  requireWritePermission,
  orgCheckMiddleware(['hospital']),
  validate(createOrderSchema),
  async (ctx: Context) => {
    try {
      const data = ctx.validatedData;

      const order = await orderService.createOrder({
        title: data.title,
        expectedDeliveryDate: data.expectedDeliveryDate,
        remarks: data.remarks,
        items: data.items,
        hospitalId: ctx.user!.userId,
        hospitalName: ctx.user!.orgName,
      });

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: order,
        message: '订单创建成功',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '创建订单失败',
      };
    }
  }
);

// =============================================================================
// 查询订单列表 - 按角色过滤
// =============================================================================
router.get(
  '/',
  validate(orderListQuerySchema, 'query'),
  async (ctx: Context) => {
    try {
      const { status, keyword, page, pageSize } = ctx.validatedData;

      const result = await orderService.listOrders({
        status,
        keyword,
        page,
        pageSize,
        orgName: ctx.user!.orgName,
        userId: ctx.user!.userId,
      });

      ctx.body = {
        success: true,
        data: {
          list: result.rows,
          total: result.count,
          page,
          pageSize,
        },
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '查询订单失败',
      };
    }
  }
);

// =============================================================================
// 查询订单详情
// =============================================================================
router.get(
  '/:id',
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const order = await orderService.getOrderById(id);

      if (!order) {
        ctx.status = 404;
        ctx.body = { success: false, error: '订单不存在' };
        return;
      }

      ctx.body = { success: true, data: order };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message || '查询失败' };
    }
  }
);

// =============================================================================
// 经销商确认订单
// =============================================================================
router.put(
  '/:id/confirm',
  requireWritePermission,
  orgCheckMiddleware(['distributor']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.CONFIRMED,
        ctx.user!.userId,
        ctx.user!.orgName,
        { distributorName: ctx.user!.orgName, ...(ctx.request.body as Record<string, any>) }
      );
      ctx.body = { success: true, data: order, message: '订单已确认' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 生产商确认并安排生产
// =============================================================================
router.put(
  '/:id/producer-confirm',
  requireWritePermission,
  orgCheckMiddleware(['producer']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.PRODUCING,
        ctx.user!.userId,
        ctx.user!.orgName,
        { producerName: ctx.user!.orgName, ...(ctx.request.body as Record<string, any>) }
      );
      ctx.body = { success: true, data: order, message: '已确认安排生产' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 标记待发货
// =============================================================================
router.put(
  '/:id/ready-to-ship',
  requireWritePermission,
  orgCheckMiddleware(['producer']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.READY_TO_SHIP,
        ctx.user!.userId,
        ctx.user!.orgName,
        ctx.request.body as Record<string, any>
      );
      ctx.body = { success: true, data: order, message: '已标记待发货' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 发货（关联运输单号）
// =============================================================================
router.put(
  '/:id/dispatch',
  requireWritePermission,
  orgCheckMiddleware(['distributor', 'producer']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const { shippingId, dispatchItems } = ctx.request.body as any;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.IN_TRANSIT,
        ctx.user!.userId,
        ctx.user!.orgName,
        { shippingId, dispatchItems }
      );
      ctx.body = { success: true, data: order, message: '已发货' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 确认送达
// =============================================================================
router.put(
  '/:id/deliver',
  requireWritePermission,
  orgCheckMiddleware(['distributor']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.DELIVERED,
        ctx.user!.userId,
        ctx.user!.orgName
      );
      ctx.body = { success: true, data: order, message: '已确认送达' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 医院验收收货
// =============================================================================
router.put(
  '/:id/accept',
  requireWritePermission,
  orgCheckMiddleware(['hospital']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.ACCEPTED,
        ctx.user!.userId,
        ctx.user!.orgName
      );
      ctx.body = { success: true, data: order, message: '已验收收货' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 完成订单
// =============================================================================
router.put(
  '/:id/complete',
  requireWritePermission,
  orgCheckMiddleware(['hospital']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.COMPLETED,
        ctx.user!.userId,
        ctx.user!.orgName
      );
      ctx.body = { success: true, data: order, message: '订单已完成' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 取消订单
// =============================================================================
router.put(
  '/:id/cancel',
  requireWritePermission,
  orgCheckMiddleware(['hospital']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.CANCELLED,
        ctx.user!.userId,
        ctx.user!.orgName,
        ctx.request.body as Record<string, any>
      );
      ctx.body = { success: true, data: order, message: '订单已取消' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 拒绝订单
// =============================================================================
router.put(
  '/:id/reject',
  requireWritePermission,
  orgCheckMiddleware(['distributor']),
  async (ctx: Context) => {
    try {
      const { id } = ctx.params;
      const { rejectReason } = ctx.request.body as any;
      const order = await orderService.transitionStatus(
        id,
        OrderStatus.REJECTED,
        ctx.user!.userId,
        ctx.user!.orgName,
        { rejectReason }
      );
      ctx.body = { success: true, data: order, message: '订单已拒绝' };
    } catch (error: any) {
      ctx.status = error.message.includes('不允许') ? 400 : 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 订单统计
// =============================================================================
router.get(
  '/stats/overview',
  async (ctx: Context) => {
    try {
      const stats = await orderService.getOrderStats(
        ctx.user!.orgName,
        ctx.user!.userId
      );
      ctx.body = { success: true, data: stats };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message || '统计查询失败' };
    }
  }
);

export default router;
