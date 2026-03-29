// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 错误处理中间件
// =============================================================================
// 功能: 全局错误处理
// =============================================================================

import { Context, Next } from 'koa';

/**
 * 全局错误处理中间件
 */
export const errorHandler = async (ctx: Context, next: Next): Promise<void> => {
  try {
    await next();
  } catch (err: any) {
    ctx.status = err.status || 500;

    // 生产环境隐藏敏感错误信息
    const message = process.env.NODE_ENV === 'production' && ctx.status === 500
      ? '服务器内部错误'
      : err.message;

    ctx.body = {
      success: false,
      error: message,
      code: err.code || 'INTERNAL_ERROR',
    };

    // 记录错误日志
    console.error(`[Error] ${ctx.method} ${ctx.url}:`, err.message);
  }
};

export default errorHandler;
