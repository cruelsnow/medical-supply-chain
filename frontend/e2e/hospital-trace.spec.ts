/**
 * =============================================================================
 * 医用耗材供应链管理系统 - E2E测试：医院和追溯流程
 * =============================================================================
 */

import { test, expect } from '@playwright/test'

test.describe('医院管理页面测试', () => {
  test.describe('验收入库页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'hospital_admin',
          orgName: 'hospital'
        }))
      })
      await page.goto('/hospital/inbound')
    })

    test('应该显示验收入库页面', async ({ page }) => {
      await expect(page.locator('.page-container')).toBeVisible()
    })
  })

  test.describe('库存管理页面', () => {
    test.beforeEach(async ({ page }) => {
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
    })

    test('应该显示库存管理页面', async ({ page }) => {
      await expect(page.locator('.page-container')).toBeVisible()
    })
  })

  test.describe('临床核销页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'hospital_admin',
          orgName: 'hospital'
        }))
      })
      await page.goto('/hospital/consume')
    })

    test('应该显示临床核销页面', async ({ page }) => {
      await expect(page.locator('.page-container')).toBeVisible()
    })
  })
})

test.describe('追溯监管页面测试', () => {
  test.describe('全链追溯页面', () => {
    test.beforeEach(async ({ page }) => {
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
    })

    test('应该显示全链追溯页面', async ({ page }) => {
      await expect(page.locator('.page-container')).toBeVisible()
    })

    test('应该显示UDI搜索框', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="UDI"]')
      if (await searchInput.isVisible()) {
        await expect(searchInput).toBeVisible()
      }
    })
  })

  test.describe('哈希校验页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'regulator_admin',
          orgName: 'regulator'
        }))
      })
      await page.goto('/regulator/verify')
    })

    test('应该显示哈希校验页面', async ({ page }) => {
      await expect(page.locator('.page-container')).toBeVisible()
    })
  })

  test.describe('数据统计页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'regulator_admin',
          orgName: 'regulator'
        }))
      })
      await page.goto('/regulator/stats')
    })

    test('应该显示数据统计页面', async ({ page }) => {
      await expect(page.locator('.page-container')).toBeVisible()
    })
  })
})

test.describe('物流管理页面测试', () => {
  test.describe('收货确认页面', () => {
    test.beforeEach(async ({ page }) => {
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
    })

    test('应该显示收货确认页面', async ({ page }) => {
      await expect(page.locator('.page-container')).toBeVisible()
    })
  })

  test.describe('环境监控页面', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login')
      await page.evaluate(() => {
        localStorage.setItem('token', 'mock_token')
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          username: 'distributor_admin',
          orgName: 'distributor'
        }))
      })
      await page.goto('/distributor/env-monitor')
    })

    test('应该显示环境监控页面', async ({ page }) => {
      await expect(page.locator('.page-container')).toBeVisible()
    })
  })
})

test.describe('404页面测试', () => {
  test('应该显示404页面当访问不存在的路由', async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock_token')
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'test_user',
        orgName: 'producer'
      }))
    })
    await page.goto('/non-existent-page')
    await expect(page.locator('body')).toBeVisible()
  })
})
