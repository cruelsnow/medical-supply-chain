<template>
  <div class="page-container">
    <div class="page-card">
      <div class="page-header">
        <div>
          <h2>采购订单</h2>
          <p class="desc">管理采购订单，查看订单状态，确认收货入库</p>
        </div>
        <el-button
          v-if="canWrite"
          type="primary"
          @click="$router.push('/hospital/order-create')"
        >
          + 创建订单
        </el-button>
      </div>

      <!-- 搜索栏 -->
      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-input
            v-model="keyword"
            placeholder="搜索订单编号/标题"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="4">
          <el-select
            v-model="statusFilter"
            placeholder="订单状态"
            clearable
            @change="handleSearch"
            style="width: 100%"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-col>
        <el-col :span="2">
          <el-button type="primary" @click="handleSearch">搜索</el-button>
        </el-col>
      </el-row>

      <!-- 订单列表 -->
      <el-table :data="orders" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="orderNumber" label="订单编号" width="180" />
        <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ row.totalAmount?.toFixed(2) || '0.00' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openDetail(row)">查看详情</el-button>
            <el-button
              v-if="canWrite && row.status === 'DISTRIBUTOR_SHIPPING'"
              type="success"
              link
              @click="acceptOrder(row)"
            >
              确认收货入库
            </el-button>
            <el-button
              v-if="canWrite && row.status === 'ACCEPTED'"
              type="success"
              link
              @click="completeOrder(row)"
            >
              完成
            </el-button>
            <el-button
              v-if="canWrite && row.status === 'PENDING'"
              type="danger"
              link
              @click="cancelOrder(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 20px; justify-content: flex-end"
        @change="loadOrders"
      />
    </div>

    <!-- 订单详情 Drawer -->
    <el-drawer
      v-model="drawerVisible"
      :title="`订单详情 - ${currentOrder?.orderNumber || ''}`"
      size="680px"
      :destroy-on-close="true"
    >
      <div v-loading="detailLoading" class="order-detail">
        <!-- 基本信息 -->
        <h4 class="section-title">基本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单编号">{{ currentOrder?.orderNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="订单标题">{{ currentOrder?.title || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(currentOrder?.status)">
              {{ statusLabel(currentOrder?.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="总金额">
            <span class="amount">¥{{ currentOrder?.totalAmount?.toFixed(2) || '0.00' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="预计交付日期">
            {{ currentOrder?.expectedDeliveryDate || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(currentOrder?.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ currentOrder?.remarks || '-' }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 物流信息 (IN_TRANSIT 及之后状态显示) -->
        <template v-if="showLogisticsSection">
          <h4 class="section-title">物流信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="运输单号">
              {{ currentOrder?.shippingId || '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 货品明细 -->
        <h4 class="section-title">货品明细</h4>
        <el-table :data="currentOrder?.items || []" border style="width: 100%">
          <el-table-column prop="materialName" label="名称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="specification" label="规格" width="120" show-overflow-tooltip />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unitPrice" label="单价" width="100">
            <template #default="{ row }">¥{{ row.unitPrice?.toFixed(2) || '0.00' }}</template>
          </el-table-column>
          <el-table-column prop="udi" label="UDI编号" width="160" show-overflow-tooltip>
            <template #default="{ row }">{{ row.udi || '-' }}</template>
          </el-table-column>
          <el-table-column prop="dispatchStatus" label="配送状态" width="110">
            <template #default="{ row }">
              <el-tag v-if="row.udi" type="success" size="small">已分配</el-tag>
              <el-tag v-else type="info" size="small">待分配</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <!-- 收货确认 (仅 DELIVERED 状态) -->
        <template v-if="currentOrder?.status === 'DISTRIBUTOR_SHIPPING' && canWrite">
          <h4 class="section-title">收货确认</h4>
          <el-alert
            title="订单已送达，请核对货品信息后确认收货入库"
            type="warning"
            :closable="false"
            show-icon
            style="margin-bottom: 16px"
          />
          <div class="confirm-receipt-section">
            <div class="item-udi-list">
              <div
                v-for="(item, index) in currentOrder?.items || []"
                :key="index"
                class="item-udi-row"
              >
                <span class="item-name">{{ item.materialName }}</span>
                <span class="item-spec">{{ item.specification }}</span>
                <span class="item-qty">x{{ item.quantity }}</span>
                <span class="item-udi-label">UDI: {{ item.udi || '待分配' }}</span>
              </div>
            </div>
            <el-button
              type="success"
              size="large"
              :loading="acceptLoading"
              @click="acceptFromDetail"
              style="margin-top: 16px; width: 100%"
            >
              确认收货入库
            </el-button>
          </div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi } from '@/api'
import { usePermission } from '@/composables/usePermission'

// =============================================================================
// 权限
// =============================================================================
const { canWrite } = usePermission()
const router = useRouter()

// =============================================================================
// 状态映射
// =============================================================================
interface StatusOption {
  label: string
  value: string
}

const statusOptions: StatusOption[] = [
  { label: '待处理', value: 'PENDING' },
  { label: '已确认', value: 'CONFIRMED' },
  { label: '生产中', value: 'PRODUCING' },
  { label: '待发货', value: 'READY_TO_SHIP' },
  { label: '运输中', value: 'IN_TRANSIT' },
  { label: '已送达', value: 'DELIVERED' },
  { label: '配送中', value: 'DISTRIBUTOR_SHIPPING' },
  { label: '已验收', value: 'ACCEPTED' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已取消', value: 'CANCELLED' },
  { label: '已拒绝', value: 'REJECTED' },
]

const STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: '待处理',
  CONFIRMED: '已确认',
  PRODUCING: '生产中',
  READY_TO_SHIP: '待发货',
  IN_TRANSIT: '运输中',
  DELIVERED: '已送达',
  DISTRIBUTOR_SHIPPING: '配送中',
  ACCEPTED: '已验收',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REJECTED: '已拒绝',
}

const STATUS_TAG_TYPE_MAP: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
  PENDING: 'info',
  CONFIRMED: 'primary',
  PRODUCING: 'warning',
  READY_TO_SHIP: 'warning',
  IN_TRANSIT: 'warning',
  DELIVERED: 'success',
  DISTRIBUTOR_SHIPPING: 'warning',
  ACCEPTED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'info',
  REJECTED: 'danger',
}

/** Status values at or beyond the logistics stage */
const LOGISTICS_VISIBLE_STATUSES = new Set([
  'IN_TRANSIT',
  'DELIVERED',
  'DISTRIBUTOR_SHIPPING',
  'ACCEPTED',
  'COMPLETED',
])

const statusLabel = (status?: string): string => {
  if (!status) return '-'
  return STATUS_LABEL_MAP[status] || status
}

const statusTagType = (status?: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' => {
  if (!status) return 'info'
  return STATUS_TAG_TYPE_MAP[status] || 'info'
}

// =============================================================================
// 列表相关状态
// =============================================================================
const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const statusFilter = ref('')

// =============================================================================
// 详情 Drawer 相关状态
// =============================================================================
const drawerVisible = ref(false)
const detailLoading = ref(false)
const acceptLoading = ref(false)
const currentOrder = ref<any>(null)

// =============================================================================
// 计算属性
// =============================================================================
const showLogisticsSection = computed(() => {
  return LOGISTICS_VISIBLE_STATUSES.has(currentOrder.value?.status)
})

// =============================================================================
// 工具函数
// =============================================================================
const formatDate = (date?: string): string => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// =============================================================================
// 列表加载
// =============================================================================
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
  } catch {
    ElMessage.error('加载订单失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  loadOrders()
}

// =============================================================================
// 详情 Drawer
// =============================================================================
const openDetail = async (row: any) => {
  drawerVisible.value = true
  detailLoading.value = true
  currentOrder.value = null
  try {
    const res = await orderApi.detail(row.id)
    if (res.success) {
      currentOrder.value = res.data
    }
  } catch {
    ElMessage.error('加载订单详情失败')
  } finally {
    detailLoading.value = false
  }
}

// =============================================================================
// 订单操作
// =============================================================================
const acceptOrder = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确认验收该订单并完成入库？验收后不可撤回。',
      '收货入库确认',
      { type: 'warning' }
    )
    const res = await orderApi.accept(row.id)
    if (res.success) {
      ElMessage.success('收货入库成功')
      loadOrders()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const acceptFromDetail = async () => {
  if (!currentOrder.value) return
  try {
    await ElMessageBox.confirm(
      '确认验收该订单并完成入库？验收后不可撤回。',
      '收货入库确认',
      { type: 'warning' }
    )
    acceptLoading.value = true
    const res = await orderApi.accept(currentOrder.value.id)
    if (res.success) {
      ElMessage.success('收货入库成功')
      drawerVisible.value = false
      loadOrders()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  } finally {
    acceptLoading.value = false
  }
}

const completeOrder = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确认完成该订单？完成后订单将关闭。',
      '完成确认',
      { type: 'warning' }
    )
    const res = await orderApi.complete(row.id)
    if (res.success) {
      ElMessage.success('订单已完成')
      loadOrders()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const cancelOrder = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      '确认取消该订单？取消后不可恢复。',
      '取消确认',
      { type: 'warning' }
    )
    const res = await orderApi.cancel(row.id)
    if (res.success) {
      ElMessage.success('订单已取消')
      loadOrders()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

// =============================================================================
// 初始化
// =============================================================================
onMounted(() => loadOrders())
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 {
      margin-bottom: 8px;
    }

    .desc {
      color: #666;
      margin-bottom: 20px;
    }
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.amount {
  font-weight: 600;
  color: #e6a23c;
}

// 订单详情样式
.order-detail {
  padding: 0 8px;

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    margin: 24px 0 12px;

    &:first-child {
      margin-top: 0;
    }
  }
}

.confirm-receipt-section {
  .item-udi-list {
    background: #f5f7fa;
    border-radius: 6px;
    padding: 12px 16px;
  }

  .item-udi-row {
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px dashed #e4e7ed;
    font-size: 14px;

    &:last-child {
      border-bottom: none;
    }
  }

  .item-name {
    font-weight: 600;
    color: #303133;
    min-width: 120px;
  }

  .item-spec {
    color: #606266;
    min-width: 100px;
    margin-right: 16px;
  }

  .item-qty {
    color: #909399;
    min-width: 50px;
    margin-right: 16px;
  }

  .item-udi-label {
    color: #409eff;
    font-family: 'Courier New', Courier, monospace;
    font-size: 13px;
  }
}
</style>
