<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon created">
            <el-icon size="32"><Plus /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.created }}</div>
            <div class="stat-label">待出厂</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon transit">
            <el-icon size="32"><Van /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.inTransit }}</div>
            <div class="stat-label">在途</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon stock">
            <el-icon size="32"><Goods /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.inStock }}</div>
            <div class="stat-label">在库</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon consumed">
            <el-icon size="32"><Finished /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.consumed }}</div>
            <div class="stat-label">已消耗</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 功能入口 -->
    <div class="page-card mt-20">
      <h3>快捷操作</h3>
      <el-row :gutter="20" class="quick-actions">
        <!-- 资产登记 - 仅 operator/admin 可见 -->
        <el-col :span="6" v-if="hasOrg('producer') && canWrite">
          <el-button type="primary" size="large" @click="$router.push('/producer/init')">
            <el-icon><Plus /></el-icon>
            资产登记
          </el-button>
        </el-col>
        <!-- 收货确认 - 仅 operator/admin 可见 -->
        <el-col :span="6" v-if="hasOrg('distributor') && canWrite">
          <el-button type="warning" size="large" @click="$router.push('/distributor/receive')">
            <el-icon><CircleCheck /></el-icon>
            收货确认
          </el-button>
        </el-col>
        <!-- 验收入库 - 仅 operator/admin 可见 -->
        <el-col :span="6" v-if="hasOrg('hospital') && canWrite">
          <el-button type="success" size="large" @click="$router.push('/hospital/inbound')">
            <el-icon><Download /></el-icon>
            验收入库
          </el-button>
        </el-col>
        <!-- 全链追溯 - 所有角色可见 -->
        <el-col :span="6" v-if="hasOrg('regulator')">
          <el-button type="info" size="large" @click="$router.push('/regulator/trace')">
            <el-icon><Connection /></el-icon>
            全链追溯
          </el-button>
        </el-col>
      </el-row>

      <!-- viewer 角色提示 -->
      <el-alert
        v-if="!canWrite && (hasOrg('producer') || hasOrg('distributor') || hasOrg('hospital'))"
        title="查看模式"
        type="info"
        description="您当前是查看者角色，只能查看数据，无法执行操作。如需操作权限，请联系管理员。"
        :closable="false"
        show-icon
        style="margin-top: 20px"
      />
    </div>

    <!-- 最近资产 -->
    <div class="page-card mt-20">
      <h3>最近资产</h3>
      <el-table :data="recentAssets" stripe>
        <el-table-column prop="udi" label="UDI编码" width="200" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="batchNumber" label="批次号" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row.udi)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { assetApi } from '@/api'
import { formatTime } from '@/utils'
import { usePermission } from '@/composables/usePermission'

const router = useRouter()

// 使用权限 composable
const { canWrite, hasOrg } = usePermission()

const stats = reactive({
  created: 0,
  inTransit: 0,
  inStock: 0,
  consumed: 0,
  recall: 0,
  exception: 0,
})

const recentAssets = ref<any[]>([])

// 获取状态类型
const getStatusType = (status: string): 'success' | 'warning' | 'info' | 'danger' | 'primary' | undefined => {
  const types: Record<string, 'success' | 'warning' | 'info' | 'danger' | 'primary'> = {
    CREATED: 'primary',
    IN_TRANSIT: 'warning',
    IN_STOCK: 'success',
    CONSUMED: 'info',
    RECALL: 'danger',
    EXCEPTION: 'danger',
  }
  return types[status]
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    CREATED: '待出厂',
    IN_TRANSIT: '在途',
    IN_STOCK: '在库',
    CONSUMED: '已消耗',
    RECALL: '召回',
    EXCEPTION: '异常',
  }
  return texts[status] || status
}

// 查看详情
const viewDetail = (udi: string) => {
  router.push(`/regulator/trace?udi=${udi}`)
}

// 加载数据
const loadData = async () => {
  try {
    // 获取统计数据
    const statsRes = await assetApi.stats() as any
    if (statsRes.success && statsRes.data) {
      Object.assign(stats, statsRes.data)
    }

    // 获取最近资产（过滤空数据，按创建时间倒序）
    const assetsRes = await assetApi.all() as any
    if (assetsRes.success && assetsRes.data) {
      recentAssets.value = assetsRes.data
        .filter((item: any) => item.name && item.name.trim() !== '')
        .sort((a: any, b: any) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeB - timeA  // 最新的在前面
        })
        .slice(0, 10)
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.dashboard {
  .stat-card {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20px;
      color: #fff;

      &.created {
        background: linear-gradient(135deg, #409eff, #66b1ff);
      }

      &.transit {
        background: linear-gradient(135deg, #e6a23c, #f0c78a);
      }

      &.stock {
        background: linear-gradient(135deg, #67c23a, #95d475);
      }

      &.consumed {
        background: linear-gradient(135deg, #909399, #b4b4b4);
      }
    }

    .stat-info {
      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #333;
      }

      .stat-label {
        font-size: 14px;
        color: #666;
        margin-top: 5px;
      }
    }
  }

  .quick-actions {
    margin-top: 20px;

    .el-button {
      width: 100%;
      height: 80px;
      font-size: 16px;

      .el-icon {
        margin-right: 8px;
      }
    }
  }

  h3 {
    margin-bottom: 20px;
    font-size: 16px;
    color: #333;
  }
}
</style>
