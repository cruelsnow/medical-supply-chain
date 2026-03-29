/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 测试辅助工具
 * =============================================================================
 * 功能: 提供测试用的辅助函数和模拟对象
 * =============================================================================
 */

import { Context, Next } from 'koa';

// 模拟Koa上下文
interface MockContextOptions {
  method?: string;
  path?: string;
  body?: any;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  state?: Record<string, any>;
}

export function createContext(options: MockContextOptions = {}): Context {
  const ctx = {
    method: options.method || 'GET',
    path: options.path || '/',
    url: options.path || '/',
    request: {
      body: options.body || {} as any,
      header: options.headers || {},
      headers: options.headers || {}
    },
    params: options.params || {},
    query: options.query || {},
    header: options.headers || {},
    headers: options.headers || {},
    state: options.state || {},
    status: 200,
    body: null as any,
    message: '',
    app: {
      emit: jest.fn()
    } as any,
    throw: jest.fn((status: number, message: string) => {
      const error = new Error(message) as any;
      error.status = status;
      throw error;
    }),
    set: jest.fn(),
    get: jest.fn((field: string) => options.headers?.[field.toLowerCase()] || ''),
    cookies: {
      set: jest.fn(),
      get: jest.fn()
    }
  } as unknown as Context;

  return ctx;
}

// 模拟Next函数
export function createNext(): Next {
  return jest.fn().mockResolvedValue(undefined);
}

// 生成测试资产数据
export function generateTestAsset(overrides: Partial<any> = {}) {
  return {
    udi: `UDI_TEST_${Date.now()}`,
    name: '测试医用耗材',
    specification: '100ml',
    batchNumber: 'BATCH2024001',
    productionDate: '2024-01-01',
    expiryDate: '2026-01-01',
    docHash: 'a'.repeat(64), // SHA-256哈希长度
    producer: '测试生产商',
    ...overrides
  };
}

// 生成测试用户数据
export function generateTestUser(orgName: string = 'producer') {
  return {
    userId: `${orgName}_admin`,
    username: `${orgName}_admin`,
    orgName,
    role: 'admin',
    mspId: `${orgName.charAt(0).toUpperCase() + orgName.slice(1)}MSP`
  };
}

// 生成完整生命周期的测试数据
export function generateLifecycleTestData() {
  const timestamp = Date.now();
  return {
    producer: {
      udi: `UDI_LIFECYCLE_${timestamp}`,
      name: '心脏支架',
      specification: '10x50mm',
      batchNumber: `BATCH_${timestamp}`,
      productionDate: '2024-01-01',
      expiryDate: '2026-01-01',
      docHash: 'b'.repeat(64),
      producer: '美敦力医疗'
    },
    distributor: {
      owner: '国药控股',
      location: '北京中心仓库'
    },
    hospital: {
      owner: '北京协和医院',
      location: '中心库房',
      department: '心内科',
      surgeryId: `SURGERY_${timestamp}`,
      operator: '张医生',
      reason: '手术使用'
    }
  };
}

// 等待函数
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 断言辅助函数
export function assertSuccessResponse(ctx: Context, expectedData?: any) {
  expect(ctx.status).toBe(200);
  if (expectedData) {
    expect(ctx.body).toMatchObject(expectedData);
  }
}

export function assertErrorResponse(ctx: Context, expectedStatus: number) {
  expect(ctx.status).toBe(expectedStatus);
}

// 模拟时间
export function mockDate(date: Date | string) {
  const realDate = Date;
  const mockDateValue = new Date(date);

  (global as any).Date = class extends realDate {
    constructor() {
      super(mockDateValue.getTime());
    }

    static now() {
      return mockDateValue.getTime();
    }
  } as any;

  return () => {
    (global as any).Date = realDate;
  };
}

// 测试套件生成器
export function createTestSuite(name: string, tests: Record<string, () => Promise<void> | void>) {
  describe(name, () => {
    Object.entries(tests).forEach(([testName, testFn]) => {
      test(testName, testFn);
    });
  });
}

// 导出所有辅助函数
export default {
  createContext,
  createNext,
  generateTestAsset,
  generateTestUser,
  generateLifecycleTestData,
  wait,
  assertSuccessResponse,
  assertErrorResponse,
  mockDate,
  createTestSuite
};
