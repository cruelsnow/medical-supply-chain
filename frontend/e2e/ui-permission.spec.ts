/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 前端 UI 权限 E2E 测试
 * =============================================================================
 * 功能: 测试前端 UI 的权限控制：菜单显示/隐藏、按钮禁用、路由守卫
 * =============================================================================
 */

import { test, expect, Page } from '@playwright/test'

// =============================================================================
// 测试用户配置
// =============================================================================
const TEST_USERS = {
  // 生产商
  producer_viewer: {
    orgName: 'producer',
    username: 'producer_viewer',
    password: '123456',
    role: 'viewer',
  },
  producer_operator: {
    orgName: 'producer',
    username: 'producer_operator',
    password: '123456',
    role: 'operator',
  },
  producer_admin: {
    orgName: 'producer',
    username: 'producer_admin',
    password: '123456',
    role: 'admin',
  },

  // 医院
  hospital_viewer: {
    orgName: 'hospital',
    username: 'hospital_viewer',
    password: '123456',
    role: 'viewer',
  },
  hospital_operator: {
    orgName: 'hospital',
    username: 'hospital_operator',
    password: '123456',
    role: 'operator',
  },

  // 经销商
  distributor_operator: {
    orgName: 'distributor',
    username: 'distributor_operator',
    password: '123456',
    role: 'operator',
  },

  // 监管机构
  regulator_viewer: {
    orgName: 'regulator',
    username: 'regulator_viewer',
    password: '123456',
    role: 'viewer',
  },
}

// =============================================================================
// 辅助函数
// =============================================================================
async function login(page: Page, orgName: string, username: string, password: string) {
  await page.goto('/login')

  // 等待页面加载
  await page.waitForSelector('.login-card', { timeout: 10000 })

  // 选择组织
  await page.click('.el-select')
  await page.waitForSelector('.el-select-dropdown', { timeout: 5000 })
  await page.click(`.el-select-dropdown__item:has-text("${getOrgLabel(orgName)}")`)

  // 输入用户名和密码
  await page.fill('input[placeholder="请输入用户名"]', username)
  await page.fill('input[placeholder="请输入密码"]', password)

  // 点击登录按钮
  await page.click('button:has-text("登 录")')

  // 等待登录成功
  await page.waitForURL('**/dashboard', { timeout: 20000 })
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

async function isMenuVisible(page: Page, menuText: string): Promise<boolean> {
  const menu = page.locator(`.el-menu:visible >> text="${menuText}"`).first()
  return await menu.isVisible()
}

async function isMenuItemVisible(page: Page, menuItemText: string): Promise<boolean> {
  const menuItem = page.locator(`.el-menu-item:has-text("${menuItemText}")`).first()
  return await menuItem.isVisible()
}

// =============================================================================
// 测试套件
// =============================================================================
test.describe('前端 UI 权限控制测试', () => {

  // ==========================================================================
  // 1. 生产商 viewer 角色测试
  // ==========================================================================
  test.describe('1. 生产商 viewer 角色', () => {
    test.use({ storageState: '.auth/producer_viewer.json' })

    test('1.1 只能看到只读菜单，看不到操作菜单', async ({ page }) => {
      const user = TEST_USERS.producer_viewer
      await login(page, user.orgName, user.username, user.password)

      // 展开生产商菜单
      await page.click('.el-sub-menu:has-text("生产商管理")')

      // 应该看到：资产列表
      await expect(page.locator('.el-menu-item:has-text("资产列表")')).toBeVisible()

      // 不应该看到：资产登记、发货管理
      const initMenu = page.locator('.el-menu-item:has-text("资产登记")')
      const shipMenu = page.locator('.el-menu-item:has-text("发货管理")')

      // 这些菜单应该不存在或不可见
      expect(await initMenu.count()).toBe(0)
      expect(await shipMenu.count()).toBe(0)
    })

    test('1.2 看到查看模式提示', async ({ page }) => {
      const user = TEST_USERS.producer_viewer
      await login(page, user.orgName, user.username, user.password)

      // 应该看到查看模式提示
      const alert = page.locator('.el-alert:has-text("查看模式")')
      await expect(alert).toBeVisible()
    })

    test('1.3 可以访问资产列表页面', async ({ page }) => {
      const user = TEST_USERS.producer_viewer
      await login(page, user.orgName, user.username, user.password)

      // 点击资产列表
      await page.click('.el-sub-menu:has-text("生产商管理")')
      await page.click('.el-menu-item:has-text("资产列表")')

      // 应该成功导航
      await expect(page).toHaveURL(/.*\/producer\/list/)
    })

    test('1.4 直接访问受限 URL 应重定向', async ({ page }) => {
      const user = TEST_USERS.producer_viewer
      await login(page, user.orgName, user.username, user.password)

      // 尝试直接访问资产登记页面
      await page.goto('/producer/init')

      // 应该被重定向到仪表盘或其他页面
      await expect(page).not.toHaveURL(/.*\/producer\/init/)
    })

    test('1.5 可以访问监管追溯菜单', async ({ page }) => {
      const user = TEST_USERS.producer_viewer
      await login(page, user.orgName, user.username, user.password)

      // 应该能看到监管追溯菜单
      await expect(page.locator('.el-sub-menu:has-text("监管追溯")')).toBeVisible()

      // 可以访问全链追溯
      await page.click('.el-sub-menu:has-text("监管追溯")')
      await page.click('.el-menu-item:has-text("全链追溯")')
      await expect(page).toHaveURL(/.*\/regulator\/trace/)
    })

    test('1.6 不能看到用户管理菜单', async ({ page }) => {
      const user = TEST_USERS.producer_viewer
      await login(page, user.orgName, user.username, user.password)

      // 不应该看到系统管理菜单
      const adminMenu = page.locator('.el-sub-menu:has-text("系统管理")')
      expect(await adminMenu.count()).toBe(0)
    })
  })

  // ==========================================================================
  // 2. 生产商 operator 角色测试
  // ==========================================================================
  test.describe('2. 生产商 operator 角色', () => {
    test('2.1 可以看到所有操作菜单', async ({ page }) => {
      const user = TEST_USERS.producer_operator
      await login(page, user.orgName, user.username, user.password)

      // 展开生产商菜单
      await page.click('.el-sub-menu:has-text("生产商管理")')

      // 应该看到所有菜单项
      await expect(page.locator('.el-menu-item:has-text("资产登记")')).toBeVisible()
      await expect(page.locator('.el-menu-item:has-text("发货管理")')).toBeVisible()
      await expect(page.locator('.el-menu-item:has-text("资产列表")')).toBeVisible()
    })

    test('2.2 可以执行资产登记', async ({ page }) => {
      const user = TEST_USERS.producer_operator
      await login(page, user.orgName, user.username, user.password)

      // 导航到资产登记页面
      await page.click('.el-sub-menu:has-text("生产商管理")')
      await page.click('.el-menu-item:has-text("资产登记")')

      // 应该成功导航
      await expect(page).toHaveURL(/.*\/producer\/init/)

      // 确认登记按钮可用（不是禁用状态）
      const submitBtn = page.locator('button:has-text("确认登记上链")')
      await expect(submitBtn).not.toBeDisabled()
    })

    test('2.3 不能看到用户管理菜单', async ({ page }) => {
      const user = TEST_USERS.producer_operator
      await login(page, user.orgName, user.username, user.password)

      // 不应该看到系统管理菜单
      const adminMenu = page.locator('.el-sub-menu:has-text("系统管理")')
      expect(await adminMenu.count()).toBe(0)
    })
  })

  // ==========================================================================
  // 3. 生产商 admin 角色测试
  // ==========================================================================
  test.describe('3. 生产商 admin 角色', () => {
    test('3.1 可以看到所有菜单包括用户管理', async ({ page }) => {
      const user = TEST_USERS.producer_admin
      await login(page, user.orgName, user.username, user.password)

      // 应该看到系统管理菜单
      await expect(page.locator('.el-sub-menu:has-text("系统管理")')).toBeVisible()

      // 展开系统管理
      await page.click('.el-sub-menu:has-text("系统管理")')
      await expect(page.locator('.el-menu-item:has-text("用户管理")')).toBeVisible()
    })

    test('3.2 可以访问用户管理页面', async ({ page }) => {
      const user = TEST_USERS.producer_admin
      await login(page, user.orgName, user.username, user.password)

      // 导航到用户管理
      await page.click('.el-sub-menu:has-text("系统管理")')
      await page.click('.el-menu-item:has-text("用户管理")')

      await expect(page).toHaveURL(/.*\/admin\/users/)
    })
  })

  // ==========================================================================
  // 4. 医院 viewer 角色测试
  // ==========================================================================
  test.describe('4. 医院 viewer 角色', () => {
    test('4.1 只能看到库存管理，不能看到入库和核销', async ({ page }) => {
      const user = TEST_USERS.hospital_viewer
      await login(page, user.orgName, user.username, user.password)

      // 展开医院菜单
      await page.click('.el-sub-menu:has-text("医院管理")')

      // 应该看到：库存管理
      await expect(page.locator('.el-menu-item:has-text("库存管理")')).toBeVisible()

      // 不应该看到：验收入库、临床核销
      const inboundMenu = page.locator('.el-menu-item:has-text("验收入库")')
      const consumeMenu = page.locator('.el-menu-item:has-text("临床核销")')

      expect(await inboundMenu.count()).toBe(0)
      expect(await consumeMenu.count()).toBe(0)
    })
  })

  // ==========================================================================
  // 5. 医院 operator 角色测试
  // ==========================================================================
  test.describe('5. 医院 operator 角色', () => {
    test('5.1 可以看到所有医院菜单', async ({ page }) => {
      const user = TEST_USERS.hospital_operator
      await login(page, user.orgName, user.username, user.password)

      // 展开医院菜单
      await page.click('.el-sub-menu:has-text("医院管理")')

      // 应该看到所有菜单项
      await expect(page.locator('.el-menu-item:has-text("验收入库")')).toBeVisible()
      await expect(page.locator('.el-menu-item:has-text("库存管理")')).toBeVisible()
      await expect(page.locator('.el-menu-item:has-text("临床核销")')).toBeVisible()
    })
  })

  // ==========================================================================
  // 6. 经销商 operator 角色测试
  // ==========================================================================
  test.describe('6. 经销商 operator 角色', () => {
    test('6.1 可以看到物流管理所有菜单', async ({ page }) => {
      const user = TEST_USERS.distributor_operator
      await login(page, user.orgName, user.username, user.password)

      // 展开物流管理菜单
      await page.click('.el-sub-menu:has-text("物流管理")')

      // 应该看到所有菜单项
      await expect(page.locator('.el-menu-item:has-text("收货确认")')).toBeVisible()
      await expect(page.locator('.el-menu-item:has-text("发货管理")')).toBeVisible()
      await expect(page.locator('.el-menu-item:has-text("环境监控")')).toBeVisible()
    })
  })

  // ==========================================================================
  // 7. 监管机构 viewer 角色测试
  // ==========================================================================
  test.describe('7. 监管机构 viewer 角色', () => {
    test('7.1 可以看到所有监管菜单', async ({ page }) => {
      const user = TEST_USERS.regulator_viewer
      await login(page, user.orgName, user.username, user.password)

      // 展开监管追溯菜单
      await page.click('.el-sub-menu:has-text("监管追溯")')

      // 应该看到所有菜单项（监管功能都是只读的）
      await expect(page.locator('.el-menu-item:has-text("全链追溯")')).toBeVisible()
      await expect(page.locator('.el-menu-item:has-text("哈希校验")')).toBeVisible()
      await expect(page.locator('.el-menu-item:has-text("数据统计")')).toBeVisible()
    })

    test('7.2 不能看到其他组织的菜单', async ({ page }) => {
      const user = TEST_USERS.regulator_viewer
      await login(page, user.orgName, user.username, user.password)

      // 不应该看到生产商、医院、物流菜单
      expect(await page.locator('.el-sub-menu:has-text("生产商管理")').count()).toBe(0)
      expect(await page.locator('.el-sub-menu:has-text("医院管理")').count()).toBe(0)
      expect(await page.locator('.el-sub-menu:has-text("物流管理")').count()).toBe(0)
    })
  })

  // ==========================================================================
  // 8. 组织权限隔离测试
  // ==========================================================================
  test.describe('8. 组织权限隔离', () => {
    test('8.1 生产商不能看到医院菜单', async ({ page }) => {
      const user = TEST_USERS.producer_operator
      await login(page, user.orgName, user.username, user.password)

      expect(await page.locator('.el-sub-menu:has-text("医院管理")').count()).toBe(0)
    })

    test('8.2 医院不能看到生产商菜单', async ({ page }) => {
      const user = TEST_USERS.hospital_operator
      await login(page, user.orgName, user.username, user.password)

      expect(await page.locator('.el-sub-menu:has-text("生产商管理")').count()).toBe(0)
    })

    test('8.3 经销商不能看到医院菜单', async ({ page }) => {
      const user = TEST_USERS.distributor_operator
      await login(page, user.orgName, user.username, user.password)

      expect(await page.locator('.el-sub-menu:has-text("医院管理")').count()).toBe(0)
    })
  })

  // ==========================================================================
  // 9. 角色标签显示测试
  // ==========================================================================
  test.describe('9. 角色标签显示', () => {
    test('9.1 viewer 显示正确的角色标签', async ({ page }) => {
      const user = TEST_USERS.producer_viewer
      await login(page, user.orgName, user.username, user.password)

      // 检查角色标签
      const roleTag = page.locator('.el-tag:has-text("查看者")')
      await expect(roleTag).toBeVisible()
    })

    test('9.2 operator 显示正确的角色标签', async ({ page }) => {
      const user = TEST_USERS.producer_operator
      await login(page, user.orgName, user.username, user.password)

      const roleTag = page.locator('.el-tag:has-text("操作员")')
      await expect(roleTag).toBeVisible()
    })

    test('9.3 admin 显示正确的角色标签', async ({ page }) => {
      const user = TEST_USERS.producer_admin
      await login(page, user.orgName, user.username, user.password)

      const roleTag = page.locator('.el-tag:has-text("管理员")')
      await expect(roleTag).toBeVisible()
    })
  })
})

// =============================================================================
// 性能测试
// =============================================================================
test.describe('UI 权限性能测试', () => {
  test('菜单加载应在合理时间内完成', async ({ page }) => {
    const user = TEST_USERS.producer_operator

    const startTime = Date.now()
    await login(page, user.orgName, user.username, user.password)
    const loadTime = Date.now() - startTime

    // 登录和菜单渲染应在 10 秒内完成
    expect(loadTime).toBeLessThan(10000)
  })
})
