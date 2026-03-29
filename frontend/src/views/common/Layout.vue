<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="layout-aside">
      <div class="logo">
        <span v-if="!isCollapse">供应链管理系统</span>
        <span v-else>SCM</span>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>

        <!-- 生产商菜单 -->
        <el-sub-menu v-if="hasOrg('producer')" index="producer">
          <template #title>
            <el-icon><Box /></el-icon>
            <span>生产商管理</span>
          </template>
          <!-- 资产登记 - 仅 operator/admin 可见 -->
          <el-menu-item v-if="canAccessMenu('producer_init')" index="/producer/init">
            资产登记
          </el-menu-item>
          <!-- 发货管理 - 仅 operator/admin 可见 -->
          <el-menu-item v-if="canAccessMenu('producer_ship')" index="/producer/ship">
            发货管理
          </el-menu-item>
          <!-- 资产列表 - 所有角色可见 -->
          <el-menu-item index="/producer/list">资产列表</el-menu-item>
        </el-sub-menu>

        <!-- 经销商/物流菜单 -->
        <el-sub-menu v-if="hasOrg('distributor')" index="distributor">
          <template #title>
            <el-icon><Truck /></el-icon>
            <span>物流管理</span>
          </template>
          <!-- 收货确认 - 仅 operator/admin 可见 -->
          <el-menu-item v-if="canAccessMenu('distributor_receive')" index="/distributor/receive">
            收货确认
          </el-menu-item>
          <!-- 发货管理 - 仅 operator/admin 可见 -->
          <el-menu-item v-if="canAccessMenu('distributor_ship')" index="/distributor/ship">
            发货管理
          </el-menu-item>
          <!-- 环境监控 - 仅 operator/admin 可见 -->
          <el-menu-item v-if="canAccessMenu('distributor_env')" index="/distributor/env-monitor">
            环境监控
          </el-menu-item>
        </el-sub-menu>

        <!-- 医院菜单 -->
        <el-sub-menu v-if="hasOrg('hospital')" index="hospital">
          <template #title>
            <el-icon><FirstAidKit /></el-icon>
            <span>医院管理</span>
          </template>
          <!-- 验收入库 - 仅 operator/admin 可见 -->
          <el-menu-item v-if="canAccessMenu('hospital_inbound')" index="/hospital/inbound">
            验收入库
          </el-menu-item>
          <!-- 库存管理 - 所有角色可见 -->
          <el-menu-item index="/hospital/inventory">库存管理</el-menu-item>
          <!-- 临床核销 - 仅 operator/admin 可见 -->
          <el-menu-item v-if="canAccessMenu('hospital_consume')" index="/hospital/consume">
            临床核销
          </el-menu-item>
        </el-sub-menu>

        <!-- 监管菜单 - 监管机构所有角色都能看到完整菜单（只读功能） -->
        <el-sub-menu v-if="hasOrg('regulator')" index="regulator">
          <template #title>
            <el-icon><View /></el-icon>
            <span>监管追溯</span>
          </template>
          <el-menu-item index="/regulator/trace">全链追溯</el-menu-item>
          <el-menu-item index="/regulator/verify">哈希校验</el-menu-item>
          <el-menu-item index="/regulator/stats">数据统计</el-menu-item>
        </el-sub-menu>

        <!-- 系统管理菜单（仅管理员可见） -->
        <el-sub-menu v-if="isAdmin" index="admin">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/admin/users">用户管理</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="layout-main">
      <!-- 顶部导航 -->
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Fold v-if="!isCollapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
              {{ item.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-avatar :size="32" icon="User" />
              <span class="username">{{ userName }}</span>
              <el-tag size="small" :type="roleTagType" class="role-tag">{{ roleLabel }}</el-tag>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="layout-content">
        <!-- viewer 角色提示 -->
        <el-alert
          v-if="isViewer"
          title="查看模式"
          type="info"
          description="您当前是查看者角色，只能查看数据，无法执行操作。如需操作权限，请联系管理员。"
          :closable="false"
          show-icon
          style="margin-bottom: 16px"
        />
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePermission, getRoleLabel, getRoleTagType } from '@/composables/usePermission'

const route = useRoute()
const router = useRouter()

// 使用权限 composable
const {
  currentRole,
  isAdmin,
  isViewer,
  canAccessMenu,
  hasOrg,
} = usePermission()

const isCollapse = ref(false)

// 当前激活菜单
const activeMenu = computed(() => route.path)

// 面包屑
const breadcrumbs = computed(() => {
  const matched = route.matched.filter((item) => item.meta.title)
  return matched.map((item) => ({
    path: item.path,
    title: item.meta.title as string,
  }))
})

// 用户名
const userName = computed(() => {
  const user = localStorage.getItem('user')
  if (user) {
    return JSON.parse(user).name || '用户'
  }
  return '用户'
})

// 角色标签
const roleLabel = computed(() => getRoleLabel(currentRole.value))

// 角色标签类型
const roleTagType = computed(() => getRoleTagType(currentRole.value))

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<style scoped lang="scss">
.layout-container {
  display: flex;
  height: 100vh;
}

.layout-aside {
  background-color: #304156;
  transition: width 0.3s;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    border-bottom: 1px solid #3a4758;
  }

  .el-menu {
    border-right: none;
  }
}

.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: 0 20px;

  .header-left {
    display: flex;
    align-items: center;

    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      margin-right: 15px;

      &:hover {
        color: #409eff;
      }
    }
  }

  .header-right {
    .user-info {
      display: flex;
      align-items: center;
      cursor: pointer;

      .username {
        margin-left: 8px;
      }

      .role-tag {
        margin-left: 8px;
      }
    }
  }
}

.layout-content {
  background: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}
</style>
