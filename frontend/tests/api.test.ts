/**
 * =============================================================================
 * 医用耗材供应链管理系统 - API模块测试
 * =============================================================================
 * 功能: 测试API请求封装
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { request, authApi, assetApi, hospitalApi, logisticsApi, traceApi } from '@/api'

// 模拟axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  }
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  }
})

describe('API模块测试', () => {
  describe('API接口定义', () => {
    it('应该定义authApi接口', () => {
      expect(authApi.login).toBeDefined()
      expect(authApi.register).toBeDefined()
      expect(authApi.getMe).toBeDefined()
      expect(authApi.refresh).toBeDefined()
      expect(authApi.logout).toBeDefined()
    })

    it('应该定义assetApi接口', () => {
      expect(assetApi.init).toBeDefined()
      expect(assetApi.transfer).toBeDefined()
      expect(assetApi.query).toBeDefined()
      expect(assetApi.all).toBeDefined()
      expect(assetApi.byOwner).toBeDefined()
      expect(assetApi.byStatus).toBeDefined()
      expect(assetApi.byBatch).toBeDefined()
      expect(assetApi.history).toBeDefined()
      expect(assetApi.burn).toBeDefined()
      expect(assetApi.recall).toBeDefined()
      expect(assetApi.stats).toBeDefined()
    })

    it('应该定义hospitalApi接口', () => {
      expect(hospitalApi.inbound).toBeDefined()
      expect(hospitalApi.inventory).toBeDefined()
      expect(hospitalApi.inventoryDetail).toBeDefined()
      expect(hospitalApi.consume).toBeDefined()
      expect(hospitalApi.expiring).toBeDefined()
      expect(hospitalApi.consumption).toBeDefined()
    })

    it('应该定义logisticsApi接口', () => {
      expect(logisticsApi.receive).toBeDefined()
      expect(logisticsApi.envData).toBeDefined()
      expect(logisticsApi.transit).toBeDefined()
      expect(logisticsApi.abnormal).toBeDefined()
    })

    it('应该定义traceApi接口', () => {
      expect(traceApi.report).toBeDefined()
      expect(traceApi.verify).toBeDefined()
      expect(traceApi.batch).toBeDefined()
      expect(traceApi.stats).toBeDefined()
      expect(traceApi.hash).toBeDefined()
    })
  })

  describe('请求对象测试', () => {
    it('应该定义request方法', () => {
      expect(request.get).toBeDefined()
      expect(request.post).toBeDefined()
      expect(request.put).toBeDefined()
      expect(request.delete).toBeDefined()
    })
  })
})
