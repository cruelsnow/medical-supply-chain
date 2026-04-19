<template>
  <div class="page-container">
    <div class="page-card">
      <h2>订单审计</h2>
      <p class="desc">监管审查所有采购订单流转情况</p>

      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-input v-model="keyword" placeholder="搜索订单编号/标题" clearable @clear="loadOrders" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="订单状态" clearable @change="loadOrders" style="width: 100%">
            <el-option v-for="s in allStatuses" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-col>
      </el-row>

      <el-table :data="orders" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="orderNumber" label="订单编号" width="180" />
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="hospitalName" label="医院" width="100" />
        <el-table-column prop="distributorName" label="经销商" width="100" />
        <el-table-column prop="producerName" label="生产商" width="100" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusColor(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="金额" width="120">
          <template #default="{ row }">¥{{ row.totalAmount?.toFixed(2) || '0.00' }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @change="loadOrders"
      />
    </div>

    <!-- 订单详情抽屉 -->
    <el-drawer v-model="detailVisible" title="订单详情" size="600px" destroy-on-close>
      <template v-if="currentOrder">
        <el-descriptions :column="2" border style="margin-bottom: 24px">
          <el-descriptions-item label="订单编号">{{ currentOrder.orderNumber }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentOrder.title }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusColor(currentOrder.status)">{{ statusLabel(currentOrder.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ currentOrder.totalAmount?.toFixed(2) || '0.00' }}</el-descriptions-item>
          <el-descriptions-item label="医院">{{ currentOrder.hospitalName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="经销商">{{ currentOrder.distributorName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="生产商">{{ currentOrder.producerName || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin-bottom: 12px">订单明细</h4>
        <el-table :data="currentOrder.items || []" border style="margin-bottom: 24px">
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="specification" label="规格" width="100" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unitPrice" label="单价" width="100">
            <template #default="{ row }">¥{{ row.unitPrice?.toFixed(2) || '0.00' }}</template>
          </el-table-column>
          <el-table-column prop="udi" label="UDI" min-width="140" />
        </el-table>

        <template v-if="currentOrder.trackingNumber">
          <h4 style="margin-bottom: 12px">物流信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="运输单号">{{ currentOrder.trackingNumber }}</el-descriptions-item>
          </el-descriptions>
        </template>

        <template v-if="currentOrder.statusHistory && currentOrder.statusHistory.length > 0">
          <h4 style="margin-bottom: 12px">状态流转记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in currentOrder.statusHistory"
              :key="index"
              :timestamp="formatDate(item.changedAt || item.createdAt)"
              placement="top"
            >
              <el-tag :type="statusColor(item.status)">{{ statusLabel(item.status) }}</el-tag>
              <span v-if="item.remark" style="margin-left: 8px; color: #666">{{ item.remark }}</span>
            </el-timeline-item>
          </el-timeline>
        </template>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { orderApi } from '@/api'

const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const statusFilter = ref('')
const detailVisible = ref(false)
const currentOrder = ref<any>(null)

const allStatuses = [
  { label: '待确认', value: 'PENDING' },
  { label: '已确认', value: 'CONFIRMED' },
  { label: '生产中', value: 'PRODUCING' },
  { label: '待发货', value: 'READY_TO_SHIP' },
  { label: '运输中', value: 'IN_TRANSIT' },
  { label: '已送达', value: 'DELIVERED' },
  { label: '已验收', value: 'ACCEPTED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
  { label: '已拒绝', value: 'REJECTED' },
]

const statusColor = (status: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' => {
  const map: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
    PENDING: 'info', CONFIRMED: 'primary', PRODUCING: 'warning',
    READY_TO_SHIP: 'warning', IN_TRANSIT: 'warning', DELIVERED: 'success',
    ACCEPTED: 'success', COMPLETED: 'success', CANCELLED: 'info', REJECTED: 'danger',
  }
  return map[status] || 'info'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    PENDING: '待确认', CONFIRMED: '已确认', PRODUCING: '生产中',
    READY_TO_SHIP: '待发货', IN_TRANSIT: '运输中', DELIVERED: '已送达',
    ACCEPTED: '已验收', COMPLETED: '已完成', CANCELLED: '已取消', REJECTED: '已拒绝',
  }
  return map[status] || status
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await orderApi.list({
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    if (res.success) {
      orders.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

const viewDetail = async (row: any) => {
  try {
    const res = await orderApi.detail(row.id)
    if (res.success) {
      currentOrder.value = res.data
      detailVisible.value = true
    }
  } catch {
    ElMessage.error('获取订单详情失败')
  }
}

onMounted(() => loadOrders())
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 20px; }
  }
}
</style>
