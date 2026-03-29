/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 角色权限 E2E 测试
 * =============================================================================
 * 功能: 测试双层权限系统（组织权限 + 角色权限）的核心功能
 * =============================================================================
 */

import { test, expect, Page } from '@playwright/test'

// =============================================================================
// 测试用户配置
// =============================================================================
const TEST_USERS = {
  producer_admin: {
    orgName: 'producer',
    username: 'producer_admin',
    password: '123456',
  },
  hospital_admin: {
    orgName: 'hospital',
    username: 'hospital_admin',
    password: '123456',
  },
  distributor_admin: {
    orgName: 'distributor',
    username: 'distributor_admin',
    password: '123456',
  },
  regulator_admin: {
    orgName: 'regulator',
    username: 'regulator_admin',
    password: '123456',
  },
}

// =============================================================================
// 辅助函数
// =============================================================================
async function login(page: Page, orgName: string, username: string, password: string) {
  await page.goto('/login')

  // 等待页面完全加载
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 })
  await page.waitForSelector('.login-card', { state: 'visible', timeout: 30000 })

  // 选择组织
  await page.click('.el-select')
  await page.waitForSelector('.el-select-dropdown', { timeout: 10000 })
  await page.click(`.el-select-dropdown__item:has-text("${getOrgLabel(orgName)}")`)

  // 输入用户名和密码
  await page.fill('input[placeholder="请输入用户名"]', username)
  await page.fill('input[placeholder="请输入密码"]', password)

  // 点击登录按钮
  await page.click('button:has-text("登 录")')

  // 等待登录成功
  await page.waitForURL('**/dashboard', { timeout: 60000 })
}

function getOrgLabel(orgName: string): string {
  const labels: Record<string, string> = {
    producer: '生产商',
    distributor: '经销商/物流',
    hospital: '医院',
    regulator: '监管机构',
  }
  return labels[orgName] || orgName
}

// =============================================================================
// 测试套件
// =============================================================================
test.describe('角色权限系统核心功能测试', () => {

  // ==========================================================================
  // 1. 登录功能测试
  // ==========================================================================
  test('1.1 用户可以成功登录', async ({ page }) => {
    const user = TEST_USERS.producer_admin
    await login(page, user.orgName, user.username, user.password)

    // 验证已登录
    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('1.2 未登录访问受保护页面应重定向到登录页', async ({ page }) => {
    // 清除任何现有的认证状态
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())

    await page.goto('/dashboard')
    // 等待路由守卫生效
    await page.waitForURL(/.*login/, { timeout: 30000 })
    await expect(page).toHaveURL(/.*login/)
  })

  // ==========================================================================
  // 2. 菜单权限测试 - 生产商
  // ==========================================================================
  test('2.1 生产商用户看到正确的菜单', async ({ page }) => {
    const user = TEST_USERS.producer_admin
    await login(page, user.orgName, user.username, user.password)

    // 检查菜单项存在 - 使用 first() 选择第一个匹配的菜单
    await expect(page.locator('.el-menu').first()).toContainText('生产商管理')
    await expect(page.locator('.el-menu').first()).toContainText('系统管理')
  })

  // ==========================================================================
  // 3. 菜单权限测试 - 医院
  // ==========================================================================
  test('3.1 医院用户看到正确的菜单', async ({ page }) => {
    const user = TEST_USERS.hospital_admin
    await login(page, user.orgName, user.username, user.password)

    // 检查菜单项存在
    await expect(page.locator('.el-menu').first()).toContainText('医院管理')
    await expect(page.locator('.el-menu').first()).toContainText('系统管理')
  })

  // ==========================================================================
  // 4. 菜单权限测试 - 经销商
  // ==========================================================================
  test('4.1 经销商用户看到正确的菜单', async ({ page }) => {
    const user = TEST_USERS.distributor_admin
    await login(page, user.orgName, user.username, user.password)

    // 检查菜单项存在
    await expect(page.locator('.el-menu').first()).toContainText('物流管理')
    await expect(page.locator('.el-menu').first()).toContainText('系统管理')
  })

  // ==========================================================================
  // 5. 菜单权限测试 - 监管机构
  // ==========================================================================
  test('5.1 监管机构用户看到正确的菜单', async ({ page }) => {
    const user = TEST_USERS.regulator_admin
    await login(page, user.orgName, user.username, user.password)

    // 检查菜单项存在
    await expect(page.locator('.el-menu').first()).toContainText('监管追溯')
    await expect(page.locator('.el-menu').first()).toContainText('系统管理')
  })

  // ==========================================================================
  // 6. 登出功能测试
  // ==========================================================================
  test('6.1 用户可以成功登出', async ({ page }) => {
    const user = TEST_USERS.producer_admin
    await login(page, user.orgName, user.username, user.password)

    // 点击用户下拉菜单
    await page.click('.user-info')

    // 点击退出登录
    await page.click('text=退出登录')

    // 验证已登出
    await expect(page).toHaveURL(/.*login/, { timeout: 30000 })
  })

  // ==========================================================================
  // 7. Token 过期处理测试
  // ==========================================================================
  test('7.1 Token 清除后应跳转登录页', async ({ page }) => {
    const user = TEST_USERS.producer_admin
    await login(page, user.orgName, user.username, user.password)

    // 清除认证信息
    await page.evaluate(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    })

    // 刷新页面
    await page.reload()

    // 应该被重定向到登录页
    await expect(page).toHaveURL(/.*login/, { timeout: 30000 })
  })
})

// =============================================================================
// 性能测试
// =============================================================================
test.describe('性能测试', () => {
  test('登录性能应在合理范围内', async ({ page }) => {
    const startTime = Date.now()

    const user = TEST_USERS.producer_admin
    await login(page, user.orgName, user.username, user.password)

    const loadTime = Date.now() - startTime

    // 登录应该在 30 秒内完成
    expect(loadTime).toBeLessThan(30000)
  })
})
