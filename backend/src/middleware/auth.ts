// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 认证中间件
// =============================================================================
// 功能: JWT令牌验证和用户身份解析
// =============================================================================

import { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// =============================================================================
// 类型定义
// =============================================================================

interface JwtPayload {
  userId: string;
  orgName: string;
  role: string;
  walletId: string;
  iat: number;
  exp: number;
}

// 扩展Context类型
declare module 'koa' {
  interface Context {
    user?: {
      userId: string;
      orgName: string;
      role: string;
      walletId: string;
    };
  }
}

// =============================================================================
// 认证中间件
// =============================================================================

/**
 * JWT认证中间件
 * 验证请求头中的Authorization令牌
 */
export const authMiddleware = async (ctx: Context, next: Next): Promise<void> => {
  // 跳过不需要认证的路径
  const publicPaths = [
    '/health',
    '/',
    '/api/auth/login',
    // /api/auth/register 需要管理员权限，不跳过认证
  ];

  if (publicPaths.includes(ctx.path)) {
    await next();
    return;
  }

  // 获取Authorization头
  const authHeader = ctx.headers.authorization;

  if (!authHeader) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '缺少认证令牌',
      code: 'MISSING_TOKEN',
    };
    return;
  }

  // 解析Bearer令牌
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '令牌格式无效',
      code: 'INVALID_TOKEN_FORMAT',
    };
    return;
  }

  const token = parts[1];

  try {
    // 验证JWT令牌
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // 将用户信息存储到上下文中
    ctx.user = {
      userId: decoded.userId,
      orgName: decoded.orgName,
      role: decoded.role,
      walletId: decoded.walletId,
    };

    await next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: '令牌已过期',
        code: 'TOKEN_EXPIRED',
      };
      return;
    }

    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '令牌无效',
      code: 'INVALID_TOKEN',
    };
  }
};

/**
 * 角色权限检查中间件
 * @param allowedRoles 允许的角色列表
 */
export const roleCheckMiddleware = (allowedRoles: string[]) => {
  return async (ctx: Context, next: Next): Promise<void> => {
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: '未认证',
        code: 'UNAUTHORIZED',
      };
      return;
    }

    if (!allowedRoles.includes(ctx.user.role)) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        error: '权限不足',
        code: 'FORBIDDEN',
      };
      return;
    }

    await next();
  };
};

/**
 * 组织权限检查中间件
 * @param allowedOrgs 允许的组织列表
 */
export const orgCheckMiddleware = (allowedOrgs: string[]) => {
  return async (ctx: Context, next: Next): Promise<void> => {
    if (!ctx.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        error: '未认证',
        code: 'UNAUTHORIZED',
      };
      return;
    }

    if (!allowedOrgs.includes(ctx.user.orgName)) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        error: '组织权限不足',
        code: 'ORG_FORBIDDEN',
      };
      return;
    }

    await next();
  };
};

// =============================================================================
// 操作权限定义
// =============================================================================

/**
 * 角色权限等级
 * viewer < operator < admin
 */
const ROLE_LEVELS: Record<string, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

/**
 * 检查用户是否有写操作权限（operator 或 admin）
 * viewer 只能查看，不能增删改
 */
export const requireWritePermission = async (ctx: Context, next: Next): Promise<void> => {
  if (!ctx.user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '未认证',
      code: 'UNAUTHORIZED',
    };
    return;
  }

  const userLevel = ROLE_LEVELS[ctx.user.role] || 0;

  // operator(2) 和 admin(3) 可以执行写操作
  if (userLevel < 2) {
    ctx.status = 403;
    ctx.body = {
      success: false,
      error: '权限不足，查看者无法执行此操作',
      code: 'FORBIDDEN',
      hint: '需要 operator 或 admin 角色',
    };
    return;
  }

  await next();
};

/**
 * 检查用户是否有管理员权限
 */
export const requireAdminPermission = async (ctx: Context, next: Next): Promise<void> => {
  if (!ctx.user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      error: '未认证',
      code: 'UNAUTHORIZED',
    };
    return;
  }

  if (ctx.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = {
      success: false,
      error: '权限不足，需要管理员权限',
      code: 'FORBIDDEN',
    };
    return;
  }

  await next();
};

export default authMiddleware;
