// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - 路由配置
// =============================================================================
// 功能: 定义前端路由和页面导航，包含权限控制
// =============================================================================

import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { MENU_PERMISSIONS } from '@/composables/usePermission'

// =============================================================================
// 路由定义
// =============================================================================
const routes: RouteRecordRaw[] = [
  // 登录页
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/common/Login.vue'),
    meta: {
      title: '登录',
      requiresAuth: false,
    },
  },

  // 主布局
  {
    path: '/',
    component: () => import('@/views/common/Layout.vue'),
    redirect: '/dashboard',
    meta: {
      requiresAuth: true,
    },
    children: [
      // 仪表盘
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/common/Dashboard.vue'),
        meta: {
          title: '仪表盘',
          icon: 'DataAnalysis',
          permission: 'dashboard',
        },
      },

      // 生产商路由
      {
        path: 'producer',
        name: 'Producer',
        redirect: '/producer/list',
        meta: {
          title: '生产商管理',
          icon: 'Box',
          org: 'producer',
        },
        children: [
          {
            path: 'init',
            name: 'AssetInit',
            component: () => import('@/views/producer/AssetInit.vue'),
            meta: {
              title: '资产登记',
              icon: 'Plus',
              permission: 'producer_init',
            },
          },
          {
            path: 'ship',
            name: 'ShipManage',
            component: () => import('@/views/producer/ShipManage.vue'),
            meta: {
              title: '发货管理',
              icon: 'Van',
              permission: 'producer_ship',
            },
          },
          {
            path: 'list',
            name: 'AssetList',
            component: () => import('@/views/producer/AssetList.vue'),
            meta: {
              title: '资产列表',
              icon: 'List',
              permission: 'producer_list',
            },
          },
        ],
      },

      // 经销商/物流路由
      {
        path: 'distributor',
        name: 'Distributor',
        redirect: '/distributor/transit',
        meta: {
          title: '物流管理',
          icon: 'Truck',
          org: 'distributor',
        },
        children: [
          {
            path: 'receive',
            name: 'Receive',
            component: () => import('@/views/distributor/Receive.vue'),
            meta: {
              title: '收货确认',
              icon: 'CircleCheck',
              permission: 'distributor_receive',
            },
          },
          {
            path: 'ship',
            name: 'DistributorShip',
            component: () => import('@/views/distributor/ShipManage.vue'),
            meta: {
              title: '发货管理',
              icon: 'Van',
              permission: 'distributor_ship',
            },
          },
          {
            path: 'env-monitor',
            name: 'EnvMonitor',
            component: () => import('@/views/distributor/EnvMonitor.vue'),
            meta: {
              title: '环境监控',
              icon: 'Cloudy',
              permission: 'distributor_env',
            },
          },
          {
            path: 'transit',
            name: 'Transit',
            component: () => import('@/views/distributor/Transit.vue'),
            meta: {
              title: '在途资产',
              icon: 'Location',
              // 所有角色可见
            },
          },
        ],
      },

      // 医院路由
      {
        path: 'hospital',
        name: 'Hospital',
        redirect: '/hospital/inventory',
        meta: {
          title: '医院管理',
          icon: 'FirstAidKit',
          org: 'hospital',
        },
        children: [
          {
            path: 'inbound',
            name: 'Inbound',
            component: () => import('@/views/hospital/Inbound.vue'),
            meta: {
              title: '验收入库',
              icon: 'Download',
              permission: 'hospital_inbound',
            },
          },
          {
            path: 'inventory',
            name: 'Inventory',
            component: () => import('@/views/hospital/Inventory.vue'),
            meta: {
              title: '库存管理',
              icon: 'Goods',
              permission: 'hospital_inventory',
            },
          },
          {
            path: 'consume',
            name: 'Consume',
            component: () => import('@/views/hospital/Consume.vue'),
            meta: {
              title: '临床核销',
              icon: 'Finished',
              permission: 'hospital_consume',
            },
          },
        ],
      },

      // 监管路由 - 所有角色可见
      {
        path: 'regulator',
        name: 'Regulator',
        redirect: '/regulator/trace',
        meta: {
          title: '监管追溯',
          icon: 'View',
          // 不限制组织
        },
        children: [
          {
            path: 'trace',
            name: 'Trace',
            component: () => import('@/views/regulator/Trace.vue'),
            meta: {
              title: '全链追溯',
              icon: 'Connection',
              permission: 'regulator_trace',
            },
          },
          {
            path: 'verify',
            name: 'Verify',
            component: () => import('@/views/regulator/Verify.vue'),
            meta: {
              title: '哈希校验',
              icon: 'Key',
              permission: 'regulator_verify',
            },
          },
          {
            path: 'stats',
            name: 'Stats',
            component: () => import('@/views/regulator/Stats.vue'),
            meta: {
              title: '数据统计',
              icon: 'TrendCharts',
              permission: 'regulator_stats',
            },
          },
        ],
      },

      // 系统管理路由（仅管理员）
      {
        path: 'admin',
        name: 'Admin',
        redirect: '/admin/users',
        meta: {
          title: '系统管理',
          icon: 'Setting',
          permission: 'admin',
        },
        children: [
          {
            path: 'users',
            name: 'UserManage',
            component: () => import('@/views/admin/UserManage.vue'),
            meta: {
              title: '用户管理',
              icon: 'User',
              permission: 'admin_users',
            },
          },
        ],
      },
    ],
  },

  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/common/NotFound.vue'),
    meta: {
      title: '页面不存在',
    },
  },
]

// =============================================================================
// 创建路由实例
// =============================================================================
const router = createRouter({
  history: createWebHistory(),
  routes,
})

// =============================================================================
// 权限检查函数
// =============================================================================
function checkRoutePermission(to: any): boolean {
  const permission = to.meta?.permission as string | undefined

  // 如果没有配置权限，默认可访问
  if (!permission) return true

  // 检查组织限制
  const requiredOrg = to.meta?.org as string | undefined
  if (requiredOrg) {
    const userStr = localStorage.getItem('user')
    if (!userStr) return false
    const user = JSON.parse(userStr)
    if (user.orgName !== requiredOrg) return false
  }

  // 检查角色权限
  const userStr = localStorage.getItem('user')
  if (!userStr) return false

  const user = JSON.parse(userStr)
  const allowedRoles = MENU_PERMISSIONS[permission]

  if (!allowedRoles) return true // 未配置的权限默认可访问

  return allowedRoles.includes(user.role)
}

// =============================================================================
// 路由守卫
// =============================================================================
router.beforeEach((to, from, next) => {
  NProgress.start()

  // 设置页面标题
  document.title = `${to.meta.title || '医用耗材供应链管理系统'} - 供应链管理`

  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    const token = localStorage.getItem('token')

    if (!token) {
      next({
        path: '/login',
        query: { redirect: to.fullPath },
      })
      return
    }

    // 检查路由权限
    if (!checkRoutePermission(to)) {
      // 权限不足，重定向到仪表盘
      next({
        path: '/dashboard',
        replace: true,
      })
      return
    }
  }

  next()
})

router.afterEach(() => {
  NProgress.done()
})

export default router
