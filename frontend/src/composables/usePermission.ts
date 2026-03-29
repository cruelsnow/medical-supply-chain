/**
 * =============================================================================
 * 医用耗材供应链管理系统 - 权限管理 Composable
 * =============================================================================
 * 功能: 提供统一的权限检查功能，用于菜单显示、按钮控制、路由守卫
 * =============================================================================
 */

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

// =============================================================================
// 类型定义
// =============================================================================
interface User {
  id: string
  username: string
  name: string
  orgName: string
  role: string
  walletId?: string
}

// =============================================================================
// 角色权限等级
// =============================================================================
const ROLE_LEVELS: Record<string, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
}

// =============================================================================
// 菜单权限配置
// key: 菜单标识
// value: 允许访问的角色列表
// =============================================================================
export const MENU_PERMISSIONS: Record<string, string[]> = {
  // ========== 公共菜单（所有角色可见）==========
  'dashboard': ['viewer', 'operator', 'admin'],

  // ========== 生产商菜单 ==========
  'producer': ['viewer', 'operator', 'admin'],           // 生产商管理（父菜单）
  'producer_init': ['operator', 'admin'],                 // 资产登记（写操作）
  'producer_ship': ['operator', 'admin'],                 // 发货管理（写操作）
  'producer_list': ['viewer', 'operator', 'admin'],       // 资产列表（只读）

  // ========== 经销商菜单 ==========
  'distributor': ['viewer', 'operator', 'admin'],         // 物流管理（父菜单）
  'distributor_receive': ['operator', 'admin'],           // 收货确认（写操作）
  'distributor_ship': ['operator', 'admin'],              // 发货管理（写操作）
  'distributor_env': ['operator', 'admin'],               // 环境监控（写操作）

  // ========== 医院菜单 ==========
  'hospital': ['viewer', 'operator', 'admin'],            // 医院管理（父菜单）
  'hospital_inbound': ['operator', 'admin'],              // 验收入库（写操作）
  'hospital_inventory': ['viewer', 'operator', 'admin'],  // 库存管理（只读）
  'hospital_consume': ['operator', 'admin'],              // 临床核销（写操作）

  // ========== 监管机构菜单 ==========
  'regulator': ['viewer', 'operator', 'admin'],           // 监管追溯（父菜单）
  'regulator_trace': ['viewer', 'operator', 'admin'],     // 全链追溯（只读）
  'regulator_verify': ['viewer', 'operator', 'admin'],    // 哈希校验（只读）
  'regulator_stats': ['viewer', 'operator', 'admin'],     // 数据统计（只读）

  // ========== 系统管理（仅管理员）==========
  'admin': ['admin'],                                     // 系统管理（父菜单）
  'admin_users': ['admin'],                               // 用户管理
}

// =============================================================================
// 操作权限配置
// key: 操作标识
// value: 允许执行的角色列表
// =============================================================================
export const ACTION_PERMISSIONS: Record<string, string[]> = {
  // 资产操作
  'asset_create': ['operator', 'admin'],      // 创建资产
  'asset_transfer': ['operator', 'admin'],    // 转移资产
  'asset_burn': ['operator', 'admin'],        // 核销资产
  'asset_recall': ['operator', 'admin'],      // 召回资产

  // 物流操作
  'logistics_receive': ['operator', 'admin'], // 收货确认
  'logistics_ship': ['operator', 'admin'],    // 发货
  'logistics_env': ['operator', 'admin'],     // 环境数据录入

  // 医院操作
  'hospital_inbound': ['operator', 'admin'],  // 入库
  'hospital_consume': ['operator', 'admin'],  // 消耗核销

  // 管理操作
  'user_create': ['admin'],                   // 创建用户
  'user_edit': ['admin'],                     // 编辑用户
  'user_delete': ['admin'],                   // 删除用户
  'user_reset_pwd': ['admin'],                // 重置密码
}

// =============================================================================
// Composable
// =============================================================================
export function usePermission() {
  const router = useRouter()

  /**
   * 获取当前用户信息
   */
  const user = computed<User | null>(() => {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  })

  /**
   * 当前用户角色
   */
  const currentRole = computed(() => user.value?.role || '')

  /**
   * 当前用户组织
   */
  const currentOrg = computed(() => user.value?.orgName || '')

  /**
   * 当前用户钱包ID
   */
  const walletId = computed(() => user.value?.walletId || '')

  /**
   * 角色等级
   */
  const roleLevel = computed(() => ROLE_LEVELS[currentRole.value] || 0)

  /**
   * 是否有写权限（operator 或 admin）
   */
  const canWrite = computed(() => roleLevel.value >= 2)

  /**
   * 是否是管理员
   */
  const isAdmin = computed(() => currentRole.value === 'admin')

  /**
   * 是否是查看者
   */
  const isViewer = computed(() => currentRole.value === 'viewer')

  /**
   * 检查是否可以访问指定菜单
   */
  const canAccessMenu = (menuKey: string): boolean => {
    if (!user.value) return false
    const allowedRoles = MENU_PERMISSIONS[menuKey]
    if (!allowedRoles) return true // 未配置的菜单默认可见
    return allowedRoles.includes(currentRole.value)
  }

  /**
   * 检查是否可以执行指定操作
   */
  const canPerformAction = (actionKey: string): boolean => {
    if (!user.value) return false
    const allowedRoles = ACTION_PERMISSIONS[actionKey]
    if (!allowedRoles) return canWrite.value // 未配置的操作默认需要写权限
    return allowedRoles.includes(currentRole.value)
  }

  /**
   * 检查用户是否属于指定组织
   */
  const hasOrg = (orgName: string): boolean => {
    return user.value?.orgName === orgName
  }

  /**
   * 检查用户是否属于多个组织中的任意一个
   */
  const hasAnyOrg = (orgNames: string[]): boolean => {
    return user.value ? orgNames.includes(user.value.orgName) : false
  }

  /**
   * 获取权限不足提示信息
   */
  const getPermissionDeniedMessage = (action?: string): string => {
    if (!user.value) return '请先登录'
    if (isViewer.value) {
      return action
        ? `您的角色是查看者，无法执行「${action}」操作`
        : '您的角色是查看者，无法执行此操作。如需操作权限，请联系管理员。'
    }
    return '权限不足'
  }

  /**
   * 显示权限不足提示
   */
  const showPermissionDenied = (action?: string) => {
    ElMessage.warning(getPermissionDeniedMessage(action))
  }

  /**
   * 检查写权限并提示
   * @returns 是否有权限
   */
  const requireWritePermission = (action?: string): boolean => {
    if (!canWrite.value) {
      showPermissionDenied(action)
      return false
    }
    return true
  }

  /**
   * 过滤菜单列表
   * @param menus 菜单配置数组
   * @returns 过滤后的菜单数组
   */
  const filterMenus = <T extends { key?: string; children?: T[] }>(menus: T[]): T[] => {
    return menus
      .filter(menu => {
        const key = (menu as any).key || (menu as any).index
        if (!key) return true
        return canAccessMenu(key.toString())
      })
      .map(menu => {
        if (menu.children) {
          return {
            ...menu,
            children: filterMenus(menu.children)
          }
        }
        return menu
      })
  }

  /**
   * 检查路由权限
   * @param path 路由路径
   * @returns 是否可以访问
   */
  const canAccessRoute = (path: string): boolean => {
    // 路由路径到菜单 key 的映射
    const routeMenuMap: Record<string, string> = {
      '/producer/init': 'producer_init',
      '/producer/ship': 'producer_ship',
      '/producer/list': 'producer_list',
      '/distributor/receive': 'distributor_receive',
      '/distributor/ship': 'distributor_ship',
      '/distributor/env-monitor': 'distributor_env',
      '/hospital/inbound': 'hospital_inbound',
      '/hospital/inventory': 'hospital_inventory',
      '/hospital/consume': 'hospital_consume',
      '/regulator/trace': 'regulator_trace',
      '/regulator/verify': 'regulator_verify',
      '/regulator/stats': 'regulator_stats',
      '/admin/users': 'admin_users',
    }

    const menuKey = routeMenuMap[path]
    if (!menuKey) return true // 未配置的路由默认可访问
    return canAccessMenu(menuKey)
  }

  return {
    // 状态
    user,
    currentRole,
    currentOrg,
    walletId,
    roleLevel,

    // 权限检查
    canWrite,
    isAdmin,
    isViewer,
    canAccessMenu,
    canPerformAction,
    canAccessRoute,
    hasOrg,
    hasAnyOrg,

    // 提示信息
    getPermissionDeniedMessage,
    showPermissionDenied,
    requireWritePermission,

    // 工具方法
    filterMenus,
  }
}

// =============================================================================
// 导出便捷函数
// =============================================================================
export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    viewer: '查看者',
    operator: '操作员',
    admin: '管理员',
  }
  return labels[role] || role
}

export const getRoleTagType = (role: string): string => {
  const types: Record<string, string> = {
    admin: 'danger',
    operator: 'primary',
    viewer: 'info',
  }
  return types[role] || 'info'
}

export default usePermission
