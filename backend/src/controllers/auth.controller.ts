// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 认证控制器
// =============================================================================
// 功能: 处理用户认证相关的HTTP请求（登录、注册、用户管理）
// 数据存储: SQLite 数据库
// =============================================================================

import { Context } from 'koa';
import Router from '@koa/router';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config';
import { validate, loginSchema } from '../middleware/validator';
import User from '../models/user.model';

const router = new Router({ prefix: '/auth' });

// =============================================================================
// 用户登录
// =============================================================================
router.post(
  '/login',
  validate(loginSchema),
  async (ctx: Context) => {
    try {
      const { username, password, orgName } = ctx.validatedData;

      // 从数据库查询用户
      const user = await User.findOne({
        where: { username, orgName },
      });

      // 验证用户存在且密码正确
      if (!user || !user.isActive()) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          error: '用户名、密码或组织错误',
          code: 'INVALID_CREDENTIALS',
        };
        return;
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          error: '用户名、密码或组织错误',
          code: 'INVALID_CREDENTIALS',
        };
        return;
      }

      // 生成JWT令牌
      const token = jwt.sign(
        {
          userId: user.id,
          orgName: user.orgName,
          role: user.role,
          walletId: user.walletId,  // 包含钱包身份
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
        }
      );

      ctx.body = {
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            orgName: user.orgName,
            role: user.role,
            walletId: user.walletId,
          },
          expiresIn: config.jwt.expiresIn,
        },
        message: '登录成功',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '登录失败',
      };
    }
  }
);

// =============================================================================
// 获取当前用户信息
// =============================================================================
router.get(
  '/me',
  async (ctx: Context) => {
    try {
      if (!ctx.user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          error: '未认证',
        };
        return;
      }

      // 从数据库获取最新用户信息
      const user = await User.findByPk(ctx.user.userId);

      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: '用户不存在',
        };
        return;
      }

      ctx.body = {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          name: user.name,
          orgName: user.orgName,
          role: user.role,
          status: user.status,
        },
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '获取用户信息失败',
      };
    }
  }
);

// =============================================================================
// 用户注册（仅管理员可创建新用户）
// =============================================================================
router.post(
  '/register',
  async (ctx: Context) => {
    try {
      // 权限检查：只有 admin 可以创建新用户
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          error: '权限不足，只有管理员可以创建新用户',
          code: 'FORBIDDEN',
        };
        return;
      }

      const { username, password, name, orgName, role } = ctx.request.body as any;

      // 检查必填字段
      if (!username || !password || !name || !orgName) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '缺少必填字段: username, password, name, orgName',
        };
        return;
      }

      // 检查用户名是否已存在
      const existing = await User.findOne({ where: { username } });
      if (existing) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '用户名已存在',
        };
        return;
      }

      // 密码加密
      const hashedPassword = await bcrypt.hash(password, 10);

      // 根据组织确定钱包身份（共享身份方案）
      // 每个组织有独立的 wallet 目录，同组织用户共享 '1' 身份
      const walletMap: Record<string, string> = {
        producer: '1',
        distributor: '1',
        hospital: '1',
        regulator: '1',
      };

      // 创建新用户
      const newUser = await User.create({
        username,
        password: hashedPassword,
        name,
        orgName,
        role: role || 'operator',
        walletId: walletMap[orgName] || '1',
        status: 'active',
      });

      ctx.status = 201;
      ctx.body = {
        success: true,
        data: {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          orgName: newUser.orgName,
          role: newUser.role,
        },
        message: '用户创建成功',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '注册失败',
      };
    }
  }
);

// =============================================================================
// 获取用户列表（仅监管机构管理员）
// =============================================================================
router.get(
  '/users',
  async (ctx: Context) => {
    try {
      // 权限检查：仅监管机构管理员可访问用户列表
      if (!ctx.user || ctx.user.role !== 'admin' || ctx.user.orgName !== 'regulator') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          error: '权限不足，仅监管机构管理员可查看用户列表',
        };
        return;
      }

      const { page = 1, pageSize = 20 } = ctx.query;

      // 监管端管理员可以查看所有组织的用户
      const where: any = {};
      if (ctx.user.orgName !== 'regulator') {
        where.orgName = ctx.user.orgName;
      }

      // 分页查询
      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: ['id', 'username', 'name', 'orgName', 'role', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        offset: (Number(page) - 1) * Number(pageSize),
        limit: Number(pageSize),
      });

      ctx.body = {
        success: true,
        data: {
          list: rows,
          total: count,
          page: Number(page),
          pageSize: Number(pageSize),
        },
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '获取用户列表失败',
      };
    }
  }
);

// =============================================================================
// 更新用户状态（启用/禁用）
// =============================================================================
router.put(
  '/users/:id/status',
  async (ctx: Context) => {
    try {
      // 权限检查
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
          success: false,
          error: '权限不足',
        };
        return;
      }

      const { id } = ctx.params;
      const { status } = ctx.request.body as any;

      if (!['active', 'disabled'].includes(status)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '无效的状态值',
        };
        return;
      }

      const user = await User.findByPk(id);
      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: '用户不存在',
        };
        return;
      }

      // 只能操作本组织用户（监管端可操作所有组织）
      if (ctx.user.orgName !== 'regulator' && user.orgName !== ctx.user.orgName) {
        ctx.status = 403;
        ctx.body = { success: false, error: '无法操作其他组织的用户' };
        return;
      }

      // 不能禁用自己
      if (user.id === ctx.user.userId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '不能禁用自己的账号',
        };
        return;
      }

      await user.update({ status });

      ctx.body = {
        success: true,
        message: `用户已${status === 'active' ? '启用' : '禁用'}`,
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '更新状态失败',
      };
    }
  }
);

// =============================================================================
// 修改密码
// =============================================================================
router.put(
  '/password',
  async (ctx: Context) => {
    try {
      if (!ctx.user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          error: '未认证',
        };
        return;
      }

      const { oldPassword, newPassword } = ctx.request.body as any;

      if (!oldPassword || !newPassword) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '缺少旧密码或新密码',
        };
        return;
      }

      const user = await User.findByPk(ctx.user.userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: '用户不存在',
        };
        return;
      }

      // 验证旧密码
      const isValid = await bcrypt.compare(oldPassword, user.password);
      if (!isValid) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: '旧密码错误',
        };
        return;
      }

      // 更新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      ctx.body = {
        success: true,
        message: '密码修改成功',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '修改密码失败',
      };
    }
  }
);

// =============================================================================
// 刷新令牌
// =============================================================================
router.post(
  '/refresh',
  async (ctx: Context) => {
    try {
      if (!ctx.user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          error: '未认证',
        };
        return;
      }

      // 生成新令牌
      const token = jwt.sign(
        {
          userId: ctx.user.userId,
          orgName: ctx.user.orgName,
          role: ctx.user.role,
          walletId: ctx.user.walletId,
        },
        config.jwt.secret,
        {
          expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
        }
      );

      ctx.body = {
        success: true,
        data: {
          token,
          expiresIn: config.jwt.expiresIn,
        },
        message: '令牌刷新成功',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message || '令牌刷新失败',
      };
    }
  }
);

// =============================================================================
// 登出
// =============================================================================
router.post(
  '/logout',
  async (ctx: Context) => {
    // JWT是无状态的，登出只需客户端删除令牌
    ctx.body = {
      success: true,
      message: '登出成功',
    };
  }
);

// =============================================================================
// 获取单个用户详情
// =============================================================================
router.get(
  '/users/:id',
  async (ctx: Context) => {
    try {
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, error: '权限不足' };
        return;
      }

      const { id } = ctx.params;
      const user = await User.findByPk(id, {
        attributes: ['id', 'username', 'name', 'orgName', 'role', 'status', 'walletId', 'createdAt', 'updatedAt'],
      });

      if (!user) {
        ctx.status = 404;
        ctx.body = { success: false, error: '用户不存在' };
        return;
      }

      ctx.body = { success: true, data: user };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 更新用户信息
// =============================================================================
router.put(
  '/users/:id',
  async (ctx: Context) => {
    try {
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, error: '权限不足' };
        return;
      }

      const { id } = ctx.params;
      const { name, role } = ctx.request.body as any;

      const user = await User.findByPk(id);
      if (!user) {
        ctx.status = 404;
        ctx.body = { success: false, error: '用户不存在' };
        return;
      }

      // 只能操作本组织用户（监管端可操作所有组织）
      if (ctx.user.orgName !== 'regulator' && user.orgName !== ctx.user.orgName) {
        ctx.status = 403;
        ctx.body = { success: false, error: '无法操作其他组织的用户' };
        return;
      }

      // 不能修改自己的角色
      if (user.id === ctx.user.userId && role && role !== user.role) {
        ctx.status = 400;
        ctx.body = { success: false, error: '不能修改自己的角色' };
        return;
      }

      const updateData: any = {};
      if (name) updateData.name = name;
      if (role) updateData.role = role;

      await user.update(updateData);

      ctx.body = {
        success: true,
        data: {
          id: user.id,
          username: user.username,
          name: user.name,
          orgName: user.orgName,
          role: user.role,
        },
        message: '更新成功',
      };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 重置用户密码
// =============================================================================
router.put(
  '/users/:id/password',
  async (ctx: Context) => {
    try {
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, error: '权限不足' };
        return;
      }

      const { id } = ctx.params;
      const { newPassword } = ctx.request.body as any;

      if (!newPassword || newPassword.length < 6) {
        ctx.status = 400;
        ctx.body = { success: false, error: '密码长度至少6位' };
        return;
      }

      const user = await User.findByPk(id);
      if (!user) {
        ctx.status = 404;
        ctx.body = { success: false, error: '用户不存在' };
        return;
      }

      // 监管方可以操作所有组织用户，其他组织只能操作本组织
      if (ctx.user.orgName !== 'regulator' && user.orgName !== ctx.user.orgName) {
        ctx.status = 403;
        ctx.body = { success: false, error: '无法操作其他组织的用户' };
        return;
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await user.update({ password: hashedPassword });

      ctx.body = { success: true, message: '密码重置成功' };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

// =============================================================================
// 删除用户
// =============================================================================
router.delete(
  '/users/:id',
  async (ctx: Context) => {
    try {
      if (!ctx.user || ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, error: '权限不足' };
        return;
      }

      const { id } = ctx.params;

      // 不能删除自己
      if (id === ctx.user.userId) {
        ctx.status = 400;
        ctx.body = { success: false, error: '不能删除自己的账号' };
        return;
      }

      const user = await User.findByPk(id);
      if (!user) {
        ctx.status = 404;
        ctx.body = { success: false, error: '用户不存在' };
        return;
      }

      // 监管方可以操作所有组织用户，其他组织只能操作本组织
      if (ctx.user.orgName !== 'regulator' && user.orgName !== ctx.user.orgName) {
        ctx.status = 403;
        ctx.body = { success: false, error: '无法操作其他组织的用户' };
        return;
      }

      // 检查是否是组织内最后一个管理员
      if (user.role === 'admin') {
        const adminCount = await User.count({
          where: { orgName: user.orgName, role: 'admin', status: 'active' },
        });
        if (adminCount <= 1) {
          ctx.status = 400;
          ctx.body = { success: false, error: '不能删除组织内唯一的管理员' };
          return;
        }
      }

      await user.destroy();

      ctx.body = { success: true, message: '用户已删除' };
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = { success: false, error: error.message };
    }
  }
);

export default router;
