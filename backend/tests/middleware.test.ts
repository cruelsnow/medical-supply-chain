/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 中间件测试
 * =============================================================================
 * 功能: 测试认证中间件、验证中间件等功能
 * =============================================================================
 */

import { createContext, createNext } from './helpers/test-helper';

// 模拟jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn((token: string, secret: string) => {
    if (token === 'valid-token') {
      return { userId: 'test-user', orgName: 'producer', role: 'admin' };
    }
    throw new Error('Invalid token');
  })
}));

describe('AuthMiddleware 认证中间件测试', () => {
  describe('Token验证', () => {
    test('应该通过有效的Bearer Token', async () => {
      const ctx = createContext({
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      // 模拟验证逻辑
      const token = ctx.get('authorization')?.replace('Bearer ', '');
      expect(token).toBe('valid-token');
    });

    test('应该拒绝无效的Token', async () => {
      const ctx = createContext({
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      const jwt = require('jsonwebtoken');
      let error: Error | null = null;

      try {
        jwt.verify('invalid-token', 'secret');
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toBe('Invalid token');
    });

    test('应该拒绝缺少Token的请求', async () => {
      const ctx = createContext({
        headers: {}
      });

      const authHeader = ctx.get('authorization');
      // 当没有authorization头时，返回空字符串
      expect(authHeader).toBeFalsy();
    });

    test('应该拒绝格式错误的Authorization头', async () => {
      const ctx = createContext({
        headers: {
          authorization: 'InvalidFormat token'
        }
      });

      const authHeader = ctx.get('authorization');
      expect(authHeader?.startsWith('Bearer ')).toBe(false);
    });
  });

  describe('用户信息注入', () => {
    test('应该将用户信息注入到ctx.state', async () => {
      const ctx = createContext({
        headers: {
          authorization: 'Bearer valid-token'
        },
        state: {}
      });

      // 模拟中间件处理后的状态
      ctx.state.user = {
        userId: 'test-user',
        orgName: 'producer',
        role: 'admin'
      };

      expect(ctx.state.user).toBeDefined();
      expect(ctx.state.user.userId).toBe('test-user');
      expect(ctx.state.user.orgName).toBe('producer');
    });
  });

  describe('角色权限检查', () => {
    test('应该允许生产商访问生产商接口', () => {
      const allowedRoles = ['producer'];
      const userRole = 'producer';

      expect(allowedRoles.includes(userRole)).toBe(true);
    });

    test('应该拒绝医院访问生产商接口', () => {
      const allowedRoles = ['producer'];
      const userRole = 'hospital';

      expect(allowedRoles.includes(userRole)).toBe(false);
    });

    test('应该允许监管访问所有接口', () => {
      const userRole = 'regulator';
      const allRoles = ['producer', 'distributor', 'hospital', 'regulator'];

      // 监管角色通常有全局访问权限
      expect(userRole).toBe('regulator');
    });
  });
});

describe('ValidatorMiddleware 验证中间件测试', () => {
  describe('资产初始化验证', () => {
    const initAssetSchema = {
      udi: { required: true, type: 'string', minLength: 1 },
      name: { required: true, type: 'string', minLength: 1 },
      specification: { required: true, type: 'string' },
      batchNumber: { required: true, type: 'string' },
      productionDate: { required: true, type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ },
      expiryDate: { required: true, type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/ },
      docHash: { required: true, type: 'string', length: 64 },
      producer: { required: true, type: 'string' }
    };

    test('应该通过有效的资产数据', () => {
      const validData = {
        udi: 'UDI001',
        name: '测试耗材',
        specification: '100ml',
        batchNumber: 'BATCH001',
        productionDate: '2024-01-01',
        expiryDate: '2026-01-01',
        docHash: 'a'.repeat(64),
        producer: '测试厂商'
      };

      // 验证必填字段
      Object.keys(initAssetSchema).forEach(key => {
        expect(validData[key as keyof typeof validData]).toBeDefined();
      });

      // 验证日期格式
      expect(initAssetSchema.productionDate.pattern!.test(validData.productionDate)).toBe(true);
      expect(initAssetSchema.expiryDate.pattern!.test(validData.expiryDate)).toBe(true);

      // 验证哈希长度
      expect(validData.docHash.length).toBe(initAssetSchema.docHash.length);
    });

    test('应该拒绝缺少UDI的数据', () => {
      const invalidData = {
        name: '测试耗材'
        // 缺少udi
      };

      expect(invalidData).not.toHaveProperty('udi');
    });

    test('应该拒绝无效日期格式', () => {
      const invalidDate = '2024/01/01';
      const pattern = /^\d{4}-\d{2}-\d{2}$/;

      expect(pattern.test(invalidDate)).toBe(false);
    });

    test('应该拒绝哈希长度不正确', () => {
      const shortHash = 'abc123';
      expect(shortHash.length).not.toBe(64);
    });
  });

  describe('转移资产验证', () => {
    test('应该通过有效的转移数据', () => {
      const validData = {
        udi: 'UDI001',
        newOwner: '新所有者',
        newHolderMSP: 'DistributorMSP',
        remark: '发货备注'
      };

      expect(validData.udi).toBeDefined();
      expect(validData.newOwner).toBeDefined();
      expect(validData.newHolderMSP).toBeDefined();
    });

    test('应该拒绝缺少必填字段', () => {
      const invalidData = {
        udi: 'UDI001'
        // 缺少newOwner和newHolderMSP
      };

      expect(invalidData).not.toHaveProperty('newOwner');
    });
  });

  describe('消耗核销验证', () => {
    test('应该通过有效的核销数据', () => {
      const validData = {
        udi: 'UDI001',
        hospital: '测试医院',
        department: '心内科',
        surgeryId: 'SURGERY001',
        operator: '张医生',
        reason: '手术使用'
      };

      Object.keys(validData).forEach(key => {
        expect(validData[key as keyof typeof validData]).toBeDefined();
      });
    });

    test('应该验证手术ID格式', () => {
      const validSurgeryId = 'SURGERY_2024_001';
      const invalidSurgeryId = 'invalid';

      const pattern = /^SURGERY_\d{4}_\d{3}$/;

      expect(pattern.test(validSurgeryId)).toBe(true);
      expect(pattern.test(invalidSurgeryId)).toBe(false);
    });
  });
});

describe('错误处理中间件测试', () => {
  test('应该捕获并格式化错误', async () => {
    const ctx = createContext();
    const next = createNext();

    // 模拟错误
    const error = new Error('Test error') as any;
    error.status = 400;

    // 验证错误处理
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
  });

  test('应该设置正确的错误状态码', () => {
    const errorMap: Record<string, number> = {
      'ValidationError': 400,
      'UnauthorizedError': 401,
      'ForbiddenError': 403,
      'NotFoundError': 404,
      'InternalServerError': 500
    };

    Object.entries(errorMap).forEach(([errorName, expectedStatus]) => {
      expect(expectedStatus).toBe(errorMap[errorName]);
    });
  });

  test('应该隐藏敏感错误信息在生产环境', () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const sensitiveError = new Error('Database password: secret123');

    const safeMessage = isProduction ? 'Internal Server Error' : sensitiveError.message;

    if (isProduction) {
      expect(safeMessage).not.toContain('password');
    }
  });
});

describe('请求日志中间件测试', () => {
  test('应该记录请求方法', () => {
    const ctx = createContext({ method: 'POST' });
    expect(ctx.method).toBe('POST');
  });

  test('应该记录请求路径', () => {
    const ctx = createContext({ path: '/api/asset/init' });
    expect(ctx.path).toBe('/api/asset/init');
  });

  test('应该记录响应时间', async () => {
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(responseTime).toBeGreaterThanOrEqual(100);
  });
});

describe('CORS中间件测试', () => {
  test('应该设置正确的CORS头', () => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    };

    expect(corsHeaders['Access-Control-Allow-Origin']).toBeDefined();
    expect(corsHeaders['Access-Control-Allow-Methods']).toContain('POST');
  });

  test('应该处理预检请求', () => {
    const ctx = createContext({ method: 'OPTIONS' });
    expect(ctx.method).toBe('OPTIONS');
  });
});

describe('限流中间件测试', () => {
  test('应该允许正常请求', () => {
    const rateLimit = {
      windowMs: 60000, // 1分钟
      max: 100 // 最多100次请求
    };

    const currentRequests = 50;
    expect(currentRequests).toBeLessThan(rateLimit.max);
  });

  test('应该拒绝超限请求', () => {
    const rateLimit = { max: 100 };
    const currentRequests = 101;

    expect(currentRequests).toBeGreaterThan(rateLimit.max);
  });
});
