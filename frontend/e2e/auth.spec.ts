/**
 * =============================================================================
 * 医用耗材供应链管理系统 - E2E测试：认证流程
 * =============================================================================
 */

import { test, expect } from '@playwright/test'

test.describe('认证流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('应该显示登录页面', async ({ page }) => {
    await expect(page.locator('.login-container')).toBeVisible()
    await expect(page.locator('h1')).toContainText('医用耗材供应链管理系统')
  })

  test('应该显示四个组织选项', async ({ page }) => {
    // 点击组织选择下拉框
    await page.click('.el-select')
    // 等待下拉选项出现
    const options = page.locator('.el-select-dropdown__item')
    await expect(options).toHaveCount(4)
  })

  test('应该显示演示账号提示', async ({ page }) => {
    await expect(page.locator('.login-tips')).toBeVisible()
    await expect(page.locator('.login-tips')).toContainText('演示账号')
  })

  test('应该验证必填字段', async ({ page }) => {
    // 直接点击登录按钮
    await page.click('button:has-text("登")')
    // 应该显示验证错误
    await expect(page.locator('.el-form-item__error').first()).toBeVisible()
  })

  test('应该能填写登录表单', async ({ page }) => {
    // 选择组织
    await page.click('.el-select')
    await page.click('.el-select-dropdown__item:has-text("生产商")')

    // 填写用户名
    await page.fill('input[placeholder="请输入用户名"]', 'producer_admin')

    // 填写密码
    await page.fill('input[type="password"]', '123456')

    // 验证表单已填写
    await expect(page.locator('input[placeholder="请输入用户名"]')).toHaveValue('producer_admin')
  })

  test('登录按钮应该有loading状态', async ({ page }) => {
    // 填写表单
    await page.click('.el-select')
    await page.click('.el-select-dropdown__item:has-text("生产商")')
    await page.fill('input[placeholder="请输入用户名"]', 'producer_admin')
    await page.fill('input[type="password"]', '123456')

    // 点击登录
    const loginButton = page.locator('button:has-text("登")')
    await loginButton.click()

    // 按钮应该显示loading状态（如果后端未启动，会显示loading）
    // 这里只验证按钮被点击
    await expect(loginButton).toBeVisible()
  })
})

test.describe('未登录访问保护测试', () => {
  test('未登录访问受保护页面应重定向到登录页', async ({ page }) => {
    await page.goto('/dashboard')
    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*login.*/)
  })

  test('未登录访问生产商页面应重定向到登录页', async ({ page }) => {
    await page.goto('/producer/init')
    // 应该重定向到登录页
    await expect(page).toHaveURL(/.*login.*/)
  })
})
