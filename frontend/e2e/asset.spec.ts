/**
 * =============================================================================
 * 医用耗材供应链管理系统 - E2E测试：资产管理流程
 * =============================================================================
 */

import { test, expect } from '@playwright/test'

test.describe('资产登记页面测试', () => {
  test.beforeEach(async ({ page }) => {
    // 模拟登录状态
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'producer_admin',
        orgName: 'producer',
        name: '生产商管理员'
      }))
    })
    await page.goto('/producer/init')
  })

  test('应该显示资产登记页面', async ({ page }) => {
    await expect(page.locator('.page-container')).toBeVisible()
    await expect(page.locator('h2')).toContainText('资产登记')
  })

  test('应该显示所有表单字段', async ({ page }) => {
    // 检查表单字段 - 使用更精确的选择器
    await expect(page.locator('.el-form-item:has-text("耗材名称")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("规格型号")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("批次号")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("UDI编码")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("生产日期")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("有效期至")')).toBeVisible()
    await expect(page.locator('.el-form-item:has-text("质检报告")')).toBeVisible()
  })

  test('应该能自动生成UDI', async ({ page }) => {
    // 点击自动生成按钮
    await page.click('button:has-text("自动生成")')

    // UDI输入框应该有值 - 等待值被设置
    const udiInput = page.locator('input[placeholder="自动生成或手动输入"]')

    // 等待输入框有值
    await expect(udiInput).not.toHaveValue('', { timeout: 5000 })

    const value = await udiInput.inputValue()
    expect(value).toMatch(/^UDI/)
  })

  test('应该能填写资产表单', async ({ page }) => {
    // 填写表单
    await page.fill('input[placeholder="请输入耗材名称"]', '心脏支架')
    await page.fill('input[placeholder="请输入规格型号"]', '10x50mm')
    await page.fill('input[placeholder="请输入批次号"]', 'BATCH001')
    await page.fill('input[placeholder="请输入生产商名称"]', '美敦力医疗')

    // 验证值已填写
    await expect(page.locator('input[placeholder="请输入耗材名称"]')).toHaveValue('心脏支架')
  })

  test('应该显示确认登记按钮', async ({ page }) => {
    await expect(page.locator('button:has-text("确认登记上链")')).toBeVisible()
  })

  test('应该显示重置按钮', async ({ page }) => {
    await expect(page.locator('button:has-text("重置")')).toBeVisible()
  })
})

test.describe('资产列表页面测试', () => {
  test.beforeEach(async ({ page }) => {
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
    await page.goto('/producer/list')
  })

  test('应该显示资产列表页面', async ({ page }) => {
    await expect(page.locator('.page-container')).toBeVisible()
  })
})

test.describe('发货管理页面测试', () => {
  test.beforeEach(async ({ page }) => {
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
    await page.goto('/producer/ship')
  })

  test('应该显示发货管理页面', async ({ page }) => {
    await expect(page.locator('.page-container')).toBeVisible()
  })
})
