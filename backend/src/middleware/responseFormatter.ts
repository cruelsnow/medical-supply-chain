// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 响应格式化中间件
// =============================================================================
// 功能: 统一API响应格式
// =============================================================================

import { Context, Next } from 'koa';

/**
 * 响应格式化中间件
 * 确保所有API响应使用统一的格式
 */
export const responseFormatter = async (ctx: Context, next: Next): Promise<void> => {
  await next();

  // 如果响应体存在且是对象，确保使用统一格式
  if (ctx.body && typeof ctx.body === 'object' && !('success' in ctx.body)) {
    ctx.body = {
      success: true,
      data: ctx.body,
    };
  }
};

export default responseFormatter;
