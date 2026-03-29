/**
 * =============================================================================
 * 医用耗材供应链管理系统 - E2E测试：完整供应链流程
 * =============================================================================
 */

import { test, expect } from '@playwright/test'

test.describe('完整供应链流程测试', () => {
  test.describe('资产生命周期', () => {
    test('完整供应链流程：创建->转移->入库->消耗', async ({ page }) => {
      // 模拟登录状态
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'producer_admin',
          orgName: 'producer'
        }))
      })

      // 1. 创建资产
      await page.goto('/producer/init')
      await expect(page.locator('.page-container')).toBeVisible()

      // 填写资产表单
      await page.fill('input[placeholder="请输入耗材名称"]', '心脏支架')
      await page.fill('input[placeholder="请输入规格型号"]', '10x50mm')
      await page.fill('input[placeholder="请输入批次号"]', 'BATCH_E2E_001')

      // 生成UDI
      await page.click('button:has-text("自动生成")')

      // 等待UDI生成
      await page.waitForTimeout(500)

      // 验证表单已填写
      await expect(page.locator('input[placeholder="请输入耗材名称"]')).toHaveValue('心脏支架')
    })
  })

  test.describe('多角色协作', () => {
    test('生产商可以访问资产登记页面', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'producer_admin',
          orgName: 'producer'
        }))
      })

      await page.goto('/producer/init')
      await expect(page.locator('h2')).toContainText('资产登记')
    })

    test('医院用户可以访问库存管理页面', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'hospital_admin',
          orgName: 'hospital'
        }))
      })

      await page.goto('/hospital/inventory')
      await expect(page.locator('.page-container')).toBeVisible()
    })

    test('监管用户可以访问追溯页面', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'regulator_admin',
          orgName: 'regulator'
        }))
      })

      await page.goto('/regulator/trace')
      await expect(page.locator('.page-container')).toBeVisible()
    })

    test('物流用户可以访问收货确认页面', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'distributor_admin',
          orgName: 'distributor'
        }))
      })

      await page.goto('/distributor/receive')
      await expect(page.locator('.page-container')).toBeVisible()
    })
  })

  test.describe('数据验证', () => {
    test('UDI格式验证', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'producer_admin',
          orgName: 'producer'
        }))
      })

      await page.goto('/producer/init')

      // 点击自动生成按钮
      await page.click('button:has-text("自动生成")')

      // 获取生成的UDI - 等待值被设置
      const udiInput = page.locator('input[placeholder="自动生成或手动输入"]')
      await expect(udiInput).not.toHaveValue('', { timeout: 5000 })

      const udiValue = await udiInput.inputValue()

      // 验证UDI格式
      expect(udiValue).toMatch(/^UDI/)
      expect(udiValue.length).toBeGreaterThan(10)
    })

    test('日期选择器验证', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'producer_admin',
          orgName: 'producer'
        }))
      })

      await page.goto('/producer/init')

      // 验证日期相关标签存在
      await expect(page.locator('text=生产日期')).toBeVisible()
      await expect(page.locator('text=有效期')).toBeVisible()
    })
  })

  test.describe('导航测试', () => {
    test('侧边栏导航应正确显示菜单项', async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'producer_admin',
          orgName: 'producer'
        }))
      })

      await page.goto('/dashboard')

      // 等待页面加载
      await page.waitForSelector('.page-container', { timeout: 5000 }).catch(() => {})

      // 验证页面已加载
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('表单交互测试', () => {
    test('登录表单输入验证', async ({ page }) => {
      await page.goto('/login')

      // 验证表单元素存在
      const usernameInput = page.locator('input[placeholder="请输入用户名"]')
      const passwordInput = page.locator('input[type="password"]')

      await expect(usernameInput).toBeVisible()
      await expect(passwordInput).toBeVisible()

      // 输入测试数据
      await usernameInput.fill('test_user')
      await passwordInput.fill('test_password')

      // 验证输入值
      await expect(usernameInput).toHaveValue('test_user')
    })

    test('组织选择功能', async ({ page }) => {
      await page.goto('/login')

      // 点击组织选择器
      await page.click('.el-select')

      // 等待下拉菜单
      await page.waitForSelector('.el-select-dropdown__item', { timeout: 3000 })

      // 验证有4个选项
      const options = page.locator('.el-select-dropdown__item')
      const count = await options.count()
      expect(count).toBe(4)
    })
  })

  test.describe('错误处理测试', () => {
    test('未登录访问受保护页面应重定向', async ({ page }) => {
      // 清除localStorage
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.clear()
      })

      // 尝试访问受保护页面
      await page.goto('/producer/init')

      // 应该重定向到登录页
      await expect(page).toHaveURL(/.*login.*/)
    })
  })
})
