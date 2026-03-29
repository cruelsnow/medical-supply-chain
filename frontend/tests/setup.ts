/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 前端测试配置
 * =============================================================================
 * 功能: 配置Vue Test Utils和全局测试环境
 * =============================================================================
 */

import { config } from '@vue/test-utils'
import { vi } from 'vitest'
import ElementPlus from 'element-plus'

// 配置全局组件
config.global.plugins = [ElementPlus]

// 模拟 localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// 模拟 sessionStorage
Object.defineProperty(window, 'sessionStorage', { value: localStorageMock })

// 模拟 router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  currentRoute: {
    value: {
      path: '/',
      params: {},
      query: {},
      meta: {},
    },
  },
}

const mockRoute = {
  path: '/',
  params: {},
  query: {},
  meta: {},
}

// 全局模拟
config.global.mocks = {
  $router: mockRouter,
  $route: mockRoute,
}

// 模拟 fetch
global.fetch = vi.fn()

// 清理函数
afterEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockReset()
  localStorageMock.setItem.mockReset()
  localStorageMock.removeItem.mockReset()
  localStorageMock.clear.mockReset()
})

export { mockRouter, mockRoute, localStorageMock }
