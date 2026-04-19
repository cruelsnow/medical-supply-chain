<template>
  <div class="page-container">
    <div class="page-card">
      <h2>告警中心</h2>
      <p class="desc">实时监控缺货、延迟等异常告警</p>

      <!-- 统计卡片 -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card stat-active">
            <div class="stat-value">{{ stats.active || 0 }}</div>
            <div class="stat-label">活跃告警</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card stat-critical">
            <div class="stat-value">{{ stats.critical || 0 }}</div>
            <div class="stat-label">严重告警</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card stat-warning">
            <div class="stat-value">{{ stats.warning || 0 }}</div>
            <div class="stat-label">警告</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card stat-resolved">
            <div class="stat-value">{{ stats.resolved || 0 }}</div>
            <div class="stat-label">已解决</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 搜索栏 -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="4">
          <el-select v-model="typeFilter" placeholder="告警类型" clearable @change="loadAlerts" style="width: 100%">
            <el-option v-for="t in alertTypes" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="告警状态" clearable @change="loadAlerts" style="width: 100%">
            <el-option v-for="s in alertStatuses" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="triggerCheck" :loading="checking">手动检查</el-button>
        </el-col>
      </el-row>

      <!-- 告警列表 -->
      <el-table :data="alerts" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="type" label="类型" width="130">
          <template #default="{ row }">
            <el-tag :type="typeColor(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="级别" width="90">
          <template #default="{ row }">
            <el-tag :type="levelColor(row.level)" size="small">{{ levelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="告警标题" min-width="200" />
        <el-table-column prop="message" label="详情" min-width="250" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusColor(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="orgName" label="组织" width="100" />
        <el-table-column prop="createdAt" label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'ACTIVE'">
              <el-button type="warning" link @click="acknowledgeAlert(row)">确认</el-button>
            </template>
            <template v-if="row.status === 'ACKNOWLEDGED'">
              <el-button type="success" link @click="resolveAlert(row)">解决</el-button>
            </template>
            <span v-if="row.status === 'RESOLVED'" class="text-muted">已处理</span>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @change="loadAlerts"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { alertApi } from '@/api'

const loading = ref(false)
const checking = ref(false)
const alerts = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const typeFilter = ref('')
const statusFilter = ref('')
const stats = ref<any>({})

const alertTypes = [
  { label: '库存不足', value: 'STOCK_LOW' },
  { label: '缺货', value: 'STOCK_ZERO' },
  { label: '交付延迟', value: 'DELIVERY_DELAYED' },
  { label: '运输超时', value: 'TRANSIT_TIMEOUT' },
  { label: '环境异常', value: 'ENV_ABNORMAL' },
  { label: '效期预警', value: 'EXPIRY_WARNING' },
]

const alertStatuses = [
  { label: '活跃', value: 'ACTIVE' },
  { label: '已确认', value: 'ACKNOWLEDGED' },
  { label: '已解决', value: 'RESOLVED' },
]

const typeLabel = (type: string) => {
  const map: Record<string, string> = {
    STOCK_LOW: '库存不足', STOCK_ZERO: '缺货', DELIVERY_DELAYED: '交付延迟',
    TRANSIT_TIMEOUT: '运输超时', ENV_ABNORMAL: '环境异常', EXPIRY_WARNING: '效期预警',
  }
  return map[type] || type
}

const typeColor = (type: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' => {
  const map: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
    STOCK_LOW: 'warning', STOCK_ZERO: 'danger', DELIVERY_DELAYED: 'warning',
    TRANSIT_TIMEOUT: 'danger', ENV_ABNORMAL: 'danger', EXPIRY_WARNING: 'warning',
  }
  return map[type] || 'info'
}

const levelLabel = (level: string) => {
  const map: Record<string, string> = { INFO: '信息', WARNING: '警告', CRITICAL: '严重' }
  return map[level] || level
}

const levelColor = (level: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' => {
  const map: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = { INFO: 'info', WARNING: 'warning', CRITICAL: 'danger' }
  return map[level] || 'info'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = { ACTIVE: '活跃', ACKNOWLEDGED: '已确认', RESOLVED: '已解决' }
  return map[status] || status
}

const statusColor = (status: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' => {
  const map: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = { ACTIVE: 'danger', ACKNOWLEDGED: 'warning', RESOLVED: 'success' }
  return map[status] || 'info'
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const loadAlerts = async () => {
  loading.value = true
  try {
    const res = await alertApi.list({
      type: typeFilter.value || undefined,
      status: statusFilter.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    if (res.success) {
      alerts.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

const loadStats = async () => {
  try {
    const res = await alertApi.stats()
    if (res.success) {
      stats.value = res.data
    }
  } catch { /* ignore */ }
}

const triggerCheck = async () => {
  checking.value = true
  try {
    const res = await alertApi.check()
    if (res.success) {
      ElMessage.success(res.message || '检查完成')
      loadAlerts()
      loadStats()
    }
  } catch { ElMessage.error('检查失败') }
  finally { checking.value = false }
}

const acknowledgeAlert = async (row: any) => {
  try {
    const res = await alertApi.acknowledge(row.id)
    if (res.success) { ElMessage.success('已确认'); loadAlerts(); loadStats() }
  } catch { ElMessage.error('操作失败') }
}

const resolveAlert = async (row: any) => {
  try {
    const res = await alertApi.resolve(row.id)
    if (res.success) { ElMessage.success('已解决'); loadAlerts(); loadStats() }
  } catch { ElMessage.error('操作失败') }
}

onMounted(() => { loadAlerts(); loadStats() })
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 20px; }
  }
}

.stat-card {
  text-align: center;
  padding: 10px 0;

  .stat-value {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: #666;
  }

  &.stat-active .stat-value { color: #e6a23c; }
  &.stat-critical .stat-value { color: #f56c6c; }
  &.stat-warning .stat-value { color: #e6a23c; }
  &.stat-resolved .stat-value { color: #67c23a; }
}

.text-muted {
  color: #999;
  font-size: 13px;
}
</style>
