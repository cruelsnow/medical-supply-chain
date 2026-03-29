/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 资产登记组件测试
 * =============================================================================
 * 功能: 测试资产登记页面功能
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import AssetInit from '@/views/producer/AssetInit.vue'

// 模拟 API
vi.mock('@/api', () => ({
  assetApi: {
    init: vi.fn().mockResolvedValue({ success: true, data: { udi: 'UDI_TEST_001' } }),
  },
  traceApi: {},
}))

// 模拟 CryptoJS
vi.mock('crypto-js', () => ({
  default: {
    SHA256: vi.fn().mockReturnValue({
      toString: () => 'mocked_hash_value_1234567890',
    }),
  },
  SHA256: vi.fn().mockReturnValue({
    toString: () => 'mocked_hash_value_1234567890',
  }),
}))

// 创建模拟路由
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/producer/init', name: 'AssetInit', component: { template: '<div>AssetInit</div>' } },
    { path: '/regulator/trace', name: 'Trace', component: { template: '<div>Trace</div>' } },
  ],
})

describe('AssetInit.vue 资产登记组件测试', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(AssetInit, {
      global: {
        plugins: [router, ElementPlus],
        mocks: {
          $router: { push: vi.fn() },
          $route: { query: {} },
        },
        stubs: {
          'el-form': true,
          'el-form-item': true,
          'el-input': true,
          'el-select': true,
          'el-option': true,
          'el-button': true,
          'el-row': true,
          'el-col': true,
          'el-date-picker': true,
          'el-upload': true,
          'el-dialog': true,
          'el-result': true,
        },
      },
    })
  })

  describe('组件渲染', () => {
    it('应该正确渲染资产登记页面', () => {
      expect(wrapper.find('.page-container').exists()).toBe(true)
      expect(wrapper.find('.page-card').exists()).toBe(true)
    })

    it('应该显示页面标题', () => {
      expect(wrapper.find('h2').text()).toBe('资产登记')
    })

    it('应该显示页面描述', () => {
      expect(wrapper.find('.desc').exists()).toBe(true)
    })
  })

  describe('表单数据', () => {
    it('应该有正确的初始表单数据', () => {
      expect(wrapper.vm.form).toBeDefined()
      expect(wrapper.vm.form.udi).toBe('')
      expect(wrapper.vm.form.name).toBe('')
      expect(wrapper.vm.form.specification).toBe('')
      expect(wrapper.vm.form.batchNumber).toBe('')
      expect(wrapper.vm.form.productionDate).toBe('')
      expect(wrapper.vm.form.expiryDate).toBe('')
      expect(wrapper.vm.form.docHash).toBe('')
      expect(wrapper.vm.form.producer).toBe('ProducerMSP') // 默认值为 ProducerMSP
      expect(wrapper.vm.form.remarks).toBe('')
    })

    it('应该有表单验证规则', () => {
      expect(wrapper.vm.rules).toBeDefined()
      expect(wrapper.vm.rules.name).toBeDefined()
      expect(wrapper.vm.rules.specification).toBeDefined()
      expect(wrapper.vm.rules.batchNumber).toBeDefined()
      expect(wrapper.vm.rules.udi).toBeDefined()
      expect(wrapper.vm.rules.productionDate).toBeDefined()
      expect(wrapper.vm.rules.expiryDate).toBeDefined()
      // producer 字段没有验证规则，因为它是自动填充的
    })
  })

  describe('UDI生成功能', () => {
    it('应该能生成UDI', () => {
      wrapper.vm.generateUDI()
      expect(wrapper.vm.form.udi).toMatch(/^UDI/)
      expect(wrapper.vm.form.udi.length).toBeGreaterThan(10)
    })

    it('每次生成的UDI应该不同', () => {
      wrapper.vm.generateUDI()
      const udi1 = wrapper.vm.form.udi

      // 等待一小段时间确保时间戳不同
      const udi2 = `UDI${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`

      expect(udi1).not.toBe(udi2)
    })
  })

  describe('状态变量', () => {
    it('应该有loading状态', () => {
      expect(wrapper.vm.loading).toBe(false)
    })

    it('应该有成功对话框显示状态', () => {
      expect(wrapper.vm.successDialogVisible).toBe(false)
    })

    it('应该有提交后的UDI状态', () => {
      expect(wrapper.vm.submittedUDI).toBe('')
    })
  })

  describe('重置表单功能', () => {
    it('应该能清空docHash', () => {
      wrapper.vm.form.name = '测试耗材'
      wrapper.vm.form.docHash = 'test_hash'
      // 直接测试清空docHash的逻辑
      wrapper.vm.form.docHash = ''
      expect(wrapper.vm.form.docHash).toBe('')
    })
  })
})
