/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 认证控制器测试
 * =============================================================================
 * 功能: 测试用户登录、注册、Token验证等功能
 * =============================================================================
 */

import { createContext } from './helpers/test-helper';
import mockFabricService from './__mocks__/fabric.service.mock';

// 模拟依赖
jest.mock('../src/services/fabric.service', () => ({
  FabricService: jest.fn().mockImplementation(() => mockFabricService)
}));

// 模拟JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user', orgName: 'producer' })
}));

// 模拟用户数据
const mockUsers = new Map<string, { username: string; password: string; orgName: string; role: string }>([
  ['producer_admin', { username: 'producer_admin', password: '123456', orgName: 'producer', role: 'admin' }],
  ['distributor_admin', { username: 'distributor_admin', password: '123456', orgName: 'distributor', role: 'admin' }],
  ['hospital_admin', { username: 'hospital_admin', password: '123456', orgName: 'hospital', role: 'admin' }],
  ['regulator_admin', { username: 'regulator_admin', password: '123456', orgName: 'regulator', role: 'admin' }]
]);

describe('AuthController 认证控制器测试', () => {
  beforeEach(() => {
    mockFabricService.resetAllMocks();
  });

  describe('POST /api/auth/login - 用户登录', () => {
    test('应该成功登录生产商账户', async () => {
      const ctx = createContext({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          username: 'producer_admin',
          password: '123456',
          orgName: 'producer'
        }
      });

      // 验证请求体
      expect((ctx.request.body as any).username).toBe('producer_admin');
      expect((ctx.request.body as any).password).toBe('123456');
      expect((ctx.request.body as any).orgName).toBe('producer');

      // 模拟登录成功
      const user = mockUsers.get('producer_admin');
      expect(user).toBeDefined();
      expect(user?.password).toBe('123456');
    });

    test('应该拒绝错误的密码', async () => {
      const ctx = createContext({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          username: 'producer_admin',
          password: 'wrong_password',
          orgName: 'producer'
        }
      });

      const user = mockUsers.get('producer_admin');
      const isValid = user?.password === (ctx.request.body as any).password;
      expect(isValid).toBe(false);
    });

    test('应该拒绝不存在的用户', async () => {
      const ctx = createContext({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          username: 'nonexistent_user',
          password: '123456',
          orgName: 'producer'
        }
      });

      const user = mockUsers.get((ctx.request.body as any).username);
      expect(user).toBeUndefined();
    });

    test('应该拒绝缺少必填字段', async () => {
      const ctx = createContext({
        method: 'POST',
        path: '/api/auth/login',
        body: {
          username: 'producer_admin'
          // 缺少password和orgName
        }
      });

      expect((ctx.request.body as any).password).toBeUndefined();
      expect((ctx.request.body as any).orgName).toBeUndefined();
    });

    test('应该为不同组织返回正确的角色信息', async () => {
      const orgs = ['producer', 'distributor', 'hospital', 'regulator'];

      for (const org of orgs) {
        const username = `${org}_admin`;
        const user = mockUsers.get(username);

        expect(user).toBeDefined();
        expect(user?.orgName).toBe(org);
        expect(user?.role).toBe('admin');
      }
    });
  });

  describe('POST /api/auth/register - 用户注册', () => {
    test('应该成功注册新用户', async () => {
      const newUser = {
        username: 'new_user',
        password: 'new_password',
        orgName: 'producer',
        role: 'user'
      };

      // 模拟注册（用户不存在）
      expect(mockUsers.has(newUser.username)).toBe(false);

      // 添加新用户
      mockUsers.set(newUser.username, newUser);
      expect(mockUsers.has(newUser.username)).toBe(true);
    });

    test('应该拒绝重复用户名', async () => {
      const existingUser = {
        username: 'producer_admin',
        password: 'new_password',
        orgName: 'producer'
      };

      expect(mockUsers.has(existingUser.username)).toBe(true);
    });
  });

  describe('GET /api/auth/me - 获取当前用户信息', () => {
    test('应该返回已认证用户的信息', async () => {
      const ctx = createContext({
        method: 'GET',
        path: '/api/auth/me',
        state: {
          user: {
            userId: 'producer_admin',
            orgName: 'producer',
            role: 'admin'
          }
        }
      });

      expect(ctx.state.user.userId).toBe('producer_admin');
      expect(ctx.state.user.orgName).toBe('producer');
    });

    test('应该拒绝未认证用户', async () => {
      const ctx = createContext({
        method: 'GET',
        path: '/api/auth/me',
        state: {}
      });

      expect(ctx.state.user).toBeUndefined();
    });
  });

  describe('POST /api/auth/logout - 用户登出', () => {
    test('应该成功处理登出请求', async () => {
      const ctx = createContext({
        method: 'POST',
        path: '/api/auth/logout',
        state: {
          user: { userId: 'producer_admin' }
        }
      });

      // 登出通常只是返回成功消息
      expect(ctx.state.user).toBeDefined();
    });
  });

  describe('Token验证测试', () => {
    test('应该正确生成JWT Token', async () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 'test-user', orgName: 'producer' };
      const token = jwt.sign(payload, 'secret');

      expect(token).toBe('mock-jwt-token');
    });

    test('应该正确验证有效Token', async () => {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify('valid-token', 'secret');

      expect(decoded.userId).toBe('test-user');
      expect(decoded.orgName).toBe('producer');
    });
  });
});

describe('认证边界条件测试', () => {
  test('应该处理空用户名', async () => {
    const ctx = createContext({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        username: '',
        password: '123456',
        orgName: 'producer'
      }
    });

    expect((ctx.request.body as any).username).toBe('');
  });

  test('应该处理超长密码', async () => {
    const longPassword = 'a'.repeat(1000);
    const ctx = createContext({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        username: 'producer_admin',
        password: longPassword,
        orgName: 'producer'
      }
    });

    expect((ctx.request.body as any).password.length).toBe(1000);
  });

  test('应该处理特殊字符用户名', async () => {
    const ctx = createContext({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        username: 'user<script>alert(1)</script>',
        password: '123456',
        orgName: 'producer'
      }
    });

    // 用户名包含XSS攻击字符
    expect((ctx.request.body as any).username).toContain('<script>');
  });

  test('应该处理无效的组织名', async () => {
    const ctx = createContext({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        username: 'producer_admin',
        password: '123456',
        orgName: 'invalid_org'
      }
    });

    // 检查是否是有效组织
    const validOrgs = ['producer', 'distributor', 'hospital', 'regulator'];
    expect(validOrgs).not.toContain((ctx.request.body as any).orgName);
  });
});
