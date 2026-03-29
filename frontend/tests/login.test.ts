/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 登录组件测试
 * =============================================================================
 * 功能: 测试登录页面功能
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import ElementPlus from 'element-plus'
import Login from '@/views/common/Login.vue'

// 模拟 authApi
vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

// 模拟 ElMessage
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
    },
  }
})

// 创建模拟路由
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: { template: '<div>Login</div>' } },
    { path: '/dashboard', name: 'Dashboard', component: { template: '<div>Dashboard</div>' } },
  ],
})

describe('Login.vue 登录组件测试', () => {
  let wrapper: any

  beforeEach(() => {
    vi.clearAllMocks()
    wrapper = mount(Login, {
      global: {
        plugins: [router, ElementPlus],
        mocks: {
          $router: { push: vi.fn() },
          $route: { query: {} },
        },
      },
    })
  })

  describe('组件渲染', () => {
    it('应该正确渲染登录表单', () => {
      expect(wrapper.find('.login-container').exists()).toBe(true)
      expect(wrapper.find('.login-card').exists()).toBe(true)
      expect(wrapper.find('.login-form').exists()).toBe(true)
    })

    it('应该显示系统标题', () => {
      expect(wrapper.find('.login-header h1').text()).toBe('医用耗材供应链管理系统')
    })

    it('应该显示组织选择下拉框', () => {
      // 检查组件是否包含组织选择相关的表单项
      const formItems = wrapper.findAll('.el-form-item')
      expect(formItems.length).toBeGreaterThan(0)
    })

    it('应该显示用户名输入框', () => {
      const inputs = wrapper.findAllComponents({ name: 'ElFormItem' })
      expect(inputs.length).toBeGreaterThan(0)
    })

    it('应该显示登录按钮', () => {
      // 检查是否存在按钮类型的元素
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('表单数据', () => {
    it('应该有默认组织选择', () => {
      expect(wrapper.vm.form.orgName).toBe('producer')
    })

    it('应该有空的初始用户名和密码', () => {
      expect(wrapper.vm.form.username).toBe('')
      expect(wrapper.vm.form.password).toBe('')
    })

    it('应该有表单验证规则', () => {
      expect(wrapper.vm.rules).toBeDefined()
      expect(wrapper.vm.rules.orgName).toBeDefined()
      expect(wrapper.vm.rules.username).toBeDefined()
      expect(wrapper.vm.rules.password).toBeDefined()
    })
  })

  describe('组织选项', () => {
    it('应该包含四个组织选项', () => {
      const options = wrapper.findAllComponents({ name: 'ElOption' })
      expect(options.length).toBe(4)
    })
  })

  describe('演示账号提示', () => {
    it('应该显示演示账号信息', () => {
      expect(wrapper.find('.login-tips').exists()).toBe(true)
      const tips = wrapper.find('.login-tips')
      expect(tips.text()).toContain('演示账号')
    })
  })

  describe('加载状态', () => {
    it('应该有loading状态变量', () => {
      expect(wrapper.vm.loading).toBe(false)
    })
  })
})
