<!-- =============================================================================
  基于区块链的医用耗材供应链管理系统 - 经销商订单管理
  =============================================================================
  功能: 待处理订单 + 发货操作 + 仓储清单 三合一标签页
  ============================================================================= -->
<template>
  <div class="order-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>订单管理</h2>
    </div>

    <!-- 权限提示 -->
    <el-alert
      v-if="!canWrite"
      title="权限不足"
      type="warning"
      description="您的角色是查看者，无法执行订单操作。"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    />

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <!-- ================================================================= -->
      <!-- Tab 1: 待处理订单                                                    -->
      <!-- ================================================================= -->
      <el-tab-pane label="待处理订单" name="pending">
        <el-card class="filter-card">
          <el-form :inline="true">
            <el-form-item label="关键词">
              <el-input
                v-model="pendingFilter.keyword"
                placeholder="搜索订单编号/标题"
                clearable
                style="width: 200px"
                @clear="loadPendingOrders"
              />
            </el-form-item>
            <el-form-item label="状态">
              <el-select
                v-model="pendingFilter.status"
                placeholder="全部状态"
                clearable
                style="width: 140px"
                @change="loadPendingOrders"
              >
                <el-option label="待处理" value="PENDING" />
                <el-option label="运输中" value="IN_TRANSIT" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadPendingOrders">查询</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="table-card">
          <el-table :data="pendingOrders" v-loading="pendingLoading" stripe>
            <el-table-column prop="orderNumber" label="订单编号" width="180" />
            <el-table-column prop="title" label="订单标题" min-width="200" />
            <el-table-column prop="hospitalName" label="医院" width="120" />
            <el-table-column prop="status" label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="statusColor(row.status)">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="金额" width="120">
              <template #default="{ row }">
                ¥{{ row.totalAmount?.toFixed(2) || '0.00' }}
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="170">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="300" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openDetailDrawer(row)">
                  查看详情
                </el-button>
                <el-button
                  v-if="canWrite && row.status === 'PENDING'"
                  type="success"
                  link
                  @click="handleConfirmOrder(row)"
                >
                  确认接单
                </el-button>
                <el-button
                  v-if="canWrite && row.status === 'PENDING'"
                  type="danger"
                  link
                  @click="openRejectDialog(row)"
                >
                  拒绝
                </el-button>
                <el-button
                  v-if="canWrite && row.status === 'IN_TRANSIT'"
                  type="success"
                  link
                  @click="handleConfirmDelivery(row)"
                >
                  确认收货
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="pendingPagination.page"
              v-model:page-size="pendingPagination.pageSize"
              :total="pendingPagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadPendingOrders"
              @current-change="loadPendingOrders"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ================================================================= -->
      <!-- Tab 2: 发货操作                                                      -->
      <!-- ================================================================= -->
      <el-tab-pane label="发货操作" name="shipping">
        <el-card class="filter-card">
          <el-form :inline="true">
            <el-form-item label="关键词">
              <el-input
                v-model="shippingFilter.keyword"
                placeholder="搜索订单编号/标题"
                clearable
                style="width: 200px"
                @clear="loadShippingOrders"
              />
            </el-form-item>
            <el-form-item label="状态">
              <el-select
                v-model="shippingFilter.status"
                placeholder="全部状态"
                clearable
                style="width: 140px"
                @change="loadShippingOrders"
              >
                <el-option label="待发货" value="READY_TO_SHIP" />
                <el-option label="运输中" value="IN_TRANSIT" />
                <el-option label="已收货" value="DELIVERED" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadShippingOrders">查询</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="table-card">
          <el-table :data="shippingOrders" v-loading="shippingLoading" stripe>
            <el-table-column prop="orderNumber" label="订单编号" width="180" />
            <el-table-column prop="title" label="订单标题" min-width="200" />
            <el-table-column prop="hospitalName" label="医院" width="120" />
            <el-table-column prop="status" label="状态" width="110">
              <template #default="{ row }">
                <el-tag :type="statusColor(row.status)">
                  {{ statusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="shippingId" label="运输单号" width="160">
              <template #default="{ row }">{{ row.shippingId || '-' }}</template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="170">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="300" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="openDetailDrawer(row)">
                  查看详情
                </el-button>
                <el-button
                  v-if="canWrite && row.status === 'READY_TO_SHIP'"
                  type="warning"
                  link
                  @click="openDispatchDialog(row)"
                >
                  发货
                </el-button>
                <el-button
                  v-if="canWrite && row.status === 'DELIVERED'"
                  type="success"
                  link
                  @click="openDistributorShipDialog(row)"
                >
                  发货给医院
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="shippingPagination.page"
              v-model:page-size="shippingPagination.pageSize"
              :total="shippingPagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadShippingOrders"
              @current-change="loadShippingOrders"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ================================================================= -->
      <!-- Tab 3: 仓储清单                                                      -->
      <!-- ================================================================= -->
      <el-tab-pane label="仓储清单" name="inventory">
        <el-card class="filter-card">
          <el-form :inline="true">
            <el-form-item label="关键词">
              <el-input
                v-model="inventoryFilter.keyword"
                placeholder="搜索订单编号/物资名称"
                clearable
                style="width: 200px"
                @clear="loadInventoryItems"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="loadInventoryItems">查询</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card class="table-card">
          <el-table :data="filteredInventoryItems" v-loading="inventoryLoading" stripe>
            <el-table-column prop="itemName" label="物资名称" min-width="180" />
            <el-table-column prop="specification" label="规格" width="120">
              <template #default="{ row }">{{ row.specification || '-' }}</template>
            </el-table-column>
            <el-table-column prop="udi" label="UDI" width="200">
              <template #default="{ row }">{{ row.udi || '-' }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="deliveryStatus" label="状态" width="100">
              <template #default>
                <el-tag type="success">在库</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="deliveredAt" label="入库时间" width="170">
              <template #default="{ row }">{{ formatDate(row.deliveredAt) }}</template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="inventoryPagination.page"
              v-model:page-size="inventoryPagination.pageSize"
              :total="inventoryPagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="handleInventoryPageChange"
              @current-change="handleInventoryPageChange"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- ================================================================= -->
    <!-- 拒绝对话框                                                            -->
    <!-- ================================================================= -->
    <el-dialog
      v-model="rejectDialogVisible"
      title="拒绝订单"
      width="450px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px">
        <el-form-item label="订单编号">
          <el-input :model-value="currentOrder?.orderNumber" disabled />
        </el-form-item>
        <el-form-item label="拒绝原因">
          <el-input
            v-model="rejectReason"
            type="textarea"
            :rows="4"
            placeholder="请输入拒绝原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleReject">确认拒绝</el-button>
      </template>
    </el-dialog>

    <!-- ================================================================= -->
    <!-- 发货对话框                                                            -->
    <!-- ================================================================= -->
    <el-dialog
      v-model="dispatchDialogVisible"
      title="发货操作"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px">
        <el-form-item label="订单编号">
          <el-input :model-value="currentOrder?.orderNumber" disabled />
        </el-form-item>
        <el-form-item label="运输单号" required>
          <el-input
            v-model="dispatchForm.shippingId"
            placeholder="请输入运输单号"
          />
        </el-form-item>
        <el-form-item label="发货明细">
          <el-table :data="dispatchForm.dispatchItems" border size="small">
            <el-table-column prop="itemName" label="物资名称" min-width="150" />
            <el-table-column prop="specification" label="规格" width="100">
              <template #default="{ row }">{{ row.specification || '-' }}</template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="70" />
            <el-table-column label="UDI编号" width="200">
              <template #default="{ row }">
                <el-input
                  v-model="row.udi"
                  placeholder="输入UDI编号"
                  size="small"
                />
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleDispatch">
          确认发货
        </el-button>
      </template>
    </el-dialog>

    <!-- ================================================================= -->
    <!-- 经销商发货给医院对话框                                                    -->
    <!-- ================================================================= -->
    <el-dialog
      v-model="distShipDialogVisible"
      title="发货给医院"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form label-width="100px">
        <el-form-item label="订单编号">
          <el-input :model-value="currentOrder?.orderNumber" disabled />
        </el-form-item>
        <el-form-item label="运输单号" required>
          <el-input
            v-model="distShipForm.shippingId"
            placeholder="请输入运输单号，如 EMS9876543210"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="distShipDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleDistributorShip">
          确认发货
        </el-button>
      </template>
    </el-dialog>

    <!-- ================================================================= -->
    <!-- 订单详情抽屉                                                          -->
    <!-- ================================================================= -->
    <el-drawer
      v-model="drawerVisible"
      title="订单详情"
      size="600px"
      :destroy-on-close="true"
    >
      <div v-loading="drawerLoading" class="order-detail">
        <!-- 基本信息 -->
        <h4 class="section-title">基本信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单编号">
            {{ detailData.orderNumber }}
          </el-descriptions-item>
          <el-descriptions-item label="订单标题">
            {{ detailData.title }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusColor(detailData.status)">
              {{ statusLabel(detailData.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">
            ¥{{ detailData.totalAmount?.toFixed(2) || '0.00' }}
          </el-descriptions-item>
          <el-descriptions-item label="医院">
            {{ detailData.hospitalName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="期望交付">
            {{ detailData.expectedDeliveryDate || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(detailData.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="拒绝原因" v-if="detailData.rejectReason" :span="2">
            <span class="text-danger">{{ detailData.rejectReason }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 订单明细 -->
        <h4 class="section-title" style="margin-top: 24px">订单明细</h4>
        <el-table :data="detailData.items || []" border size="small">
          <el-table-column prop="itemName" label="物资名称" min-width="150" />
          <el-table-column prop="specification" label="规格" width="100">
            <template #default="{ row }">{{ row.specification || '-' }}</template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="70" />
          <el-table-column prop="udi" label="UDI" width="180">
            <template #default="{ row }">{{ row.udi || '-' }}</template>
          </el-table-column>
          <el-table-column prop="deliveryStatus" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="deliveryStatusColor(row.deliveryStatus)" size="small">
                {{ deliveryStatusLabel(row.deliveryStatus) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>

        <!-- 运输信息 -->
        <template v-if="detailData.shippingId">
          <h4 class="section-title" style="margin-top: 24px">运输信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="运输单号">
              {{ detailData.shippingId }}
            </el-descriptions-item>
          </el-descriptions>
        </template>

        <!-- 状态时间线 -->
        <h4 class="section-title" style="margin-top: 24px">状态流转</h4>
        <el-timeline v-if="detailData.timeline && detailData.timeline.length > 0">
          <el-timeline-item
            v-for="(event, index) in detailData.timeline"
            :key="index"
            :timestamp="formatDate(event.timestamp)"
            :type="timelineColor(event.status)"
            placement="top"
          >
            {{ statusLabel(event.status) }}
            <span v-if="event.remark" class="timeline-remark">
              - {{ event.remark }}
            </span>
          </el-timeline-item>
        </el-timeline>
        <el-empty
          v-else
          description="暂无状态记录"
          :image-size="60"
        />
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, assetApi } from '@/api'
import { usePermission } from '@/composables/usePermission'
import { formatTime } from '@/utils'

// =============================================================================
// 权限
// =============================================================================
const { canWrite } = usePermission()

// =============================================================================
// 通用辅助函数
// =============================================================================
const STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: '待处理',
  CONFIRMED: '已确认',
  PRODUCING: '生产中',
  READY_TO_SHIP: '待发货',
  IN_TRANSIT: '运输中',
  DELIVERED: '已收货',
  DISTRIBUTOR_SHIPPING: '发货中',
  ACCEPTED: '已验收',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REJECTED: '已拒绝',
}

const STATUS_COLOR_MAP: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
  PENDING: 'info',
  CONFIRMED: 'primary',
  PRODUCING: 'warning',
  READY_TO_SHIP: 'warning',
  IN_TRANSIT: 'warning',
  DELIVERED: 'success',
  DISTRIBUTOR_SHIPPING: 'primary',
  ACCEPTED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'info',
  REJECTED: 'danger',
}

const DELIVERY_STATUS_LABEL_MAP: Record<string, string> = {
  PENDING: '待发货',
  SHIPPED: '已发货',
  RECEIVED: '已收货',
  DISTRIBUTOR_SHIPPED: '已转发',
  DELIVERED: '已送达',
}

const DELIVERY_STATUS_COLOR_MAP: Record<string, 'info' | 'warning' | 'success'> = {
  PENDING: 'info',
  SHIPPED: 'warning',
  RECEIVED: 'success',
  DISTRIBUTOR_SHIPPED: 'warning',
  DELIVERED: 'success',
}

const statusLabel = (status: string): string => {
  return STATUS_LABEL_MAP[status] || status
}

const statusColor = (status: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' => {
  return STATUS_COLOR_MAP[status] || 'info'
}

const deliveryStatusLabel = (status: string): string => {
  return DELIVERY_STATUS_LABEL_MAP[status] || status
}

const deliveryStatusColor = (status: string): 'info' | 'warning' | 'success' => {
  return DELIVERY_STATUS_COLOR_MAP[status] || 'info'
}

const formatDate = (date: string): string => {
  if (!date) return '-'
  return formatTime(date)
}

const timelineColor = (status: string): string => {
  if (status === 'COMPLETED' || status === 'DELIVERED' || status === 'ACCEPTED') return 'success'
  if (status === 'CANCELLED' || status === 'REJECTED') return 'danger'
  if (status === 'IN_TRANSIT' || status === 'READY_TO_SHIP') return 'warning'
  return 'primary'
}

// =============================================================================
// 标签页
// =============================================================================
const activeTab = ref('pending')

const handleTabChange = (tab: string | number) => {
  if (tab === 'pending') {
    loadPendingOrders()
  } else if (tab === 'shipping') {
    loadShippingOrders()
  } else if (tab === 'inventory') {
    loadInventoryItems()
  }
}

// =============================================================================
// Tab 1 - 待处理订单
// =============================================================================
const pendingLoading = ref(false)
const pendingOrders = ref<any[]>([])
const pendingFilter = reactive({
  keyword: '',
  status: '',
})
const pendingPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const loadPendingOrders = async () => {
  pendingLoading.value = true
  try {
    const res = await orderApi.list({
      status: pendingFilter.status || undefined,
      keyword: pendingFilter.keyword || undefined,
      page: pendingPagination.page,
      pageSize: pendingPagination.pageSize,
    }) as any

    if (res.success) {
      const allOrders = res.data?.list || []
      // Filter to only show PENDING and IN_TRANSIT orders that need attention
      pendingOrders.value = allOrders.filter(
        (order: any) => order.status === 'PENDING' || order.status === 'IN_TRANSIT'
      )
      pendingPagination.total = res.data?.total || 0
    }
  } catch {
    ElMessage.error('加载订单失败')
  } finally {
    pendingLoading.value = false
  }
}

const handleConfirmOrder = async (row: any) => {
  try {
    await ElMessageBox.confirm('确认接单？', '确认接单')
    const res = await orderApi.confirm(row.id) as any
    if (res.success) {
      ElMessage.success('接单成功')
      loadPendingOrders()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const handleConfirmDelivery = async (row: any) => {
  try {
    await ElMessageBox.confirm('确认收货？资产将入经销商仓库', '确认收货')
    const res = await orderApi.deliver(row.id) as any
    if (res.success) {
      ElMessage.success('已确认收货')
      loadPendingOrders()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

// =============================================================================
// 拒绝订单
// =============================================================================
const rejectDialogVisible = ref(false)
const currentOrder = ref<any>(null)
const rejectReason = ref('')
const submitting = ref(false)

const openRejectDialog = (row: any) => {
  currentOrder.value = row
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

const handleReject = async () => {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请输入拒绝原因')
    return
  }
  submitting.value = true
  try {
    const res = await orderApi.reject(currentOrder.value.id, {
      rejectReason: rejectReason.value,
    }) as any
    if (res.success) {
      ElMessage.success('已拒绝订单')
      rejectDialogVisible.value = false
      loadPendingOrders()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

// =============================================================================
// Tab 2 - 发货操作
// =============================================================================
const shippingLoading = ref(false)
const shippingOrders = ref<any[]>([])
const shippingFilter = reactive({
  keyword: '',
  status: '',
})
const shippingPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const loadShippingOrders = async () => {
  shippingLoading.value = true
  try {
    const res = await orderApi.list({
      status: shippingFilter.status || undefined,
      keyword: shippingFilter.keyword || undefined,
      page: shippingPagination.page,
      pageSize: shippingPagination.pageSize,
    }) as any

    if (res.success) {
      const allOrders = res.data?.list || []
      // Filter to show READY_TO_SHIP, IN_TRANSIT and DELIVERED orders
      shippingOrders.value = allOrders.filter(
        (order: any) => order.status === 'READY_TO_SHIP' || order.status === 'IN_TRANSIT' || order.status === 'DELIVERED'
      )
      shippingPagination.total = res.data?.total || 0
    }
  } catch {
    ElMessage.error('加载发货订单失败')
  } finally {
    shippingLoading.value = false
  }
}

// =============================================================================
// 发货对话框
// =============================================================================
const dispatchDialogVisible = ref(false)
const dispatchForm = reactive({
  shippingId: '',
  dispatchItems: [] as { itemId: string; itemName: string; specification: string; quantity: number; udi: string }[],
})

const openDispatchDialog = async (row: any) => {
  currentOrder.value = row
  dispatchForm.shippingId = row.shippingId || ''
  dispatchForm.dispatchItems = []

  // Load order detail to get items
  try {
    const res = await orderApi.detail(row.id) as any
    if (res.success && res.data?.items) {
      dispatchForm.dispatchItems = res.data.items.map((item: any) => ({
        itemId: item.id || item.itemId,
        itemName: item.itemName || item.name || '-',
        specification: item.specification || '',
        quantity: item.quantity || 0,
        udi: item.udi || '',
      }))
    }
  } catch {
    ElMessage.error('加载订单详情失败')
  }

  dispatchDialogVisible.value = true
}

const handleDispatch = async () => {
  if (!dispatchForm.shippingId.trim()) {
    ElMessage.warning('请输入运输单号')
    return
  }

  // Validate all UDI inputs
  const missingUdi = dispatchForm.dispatchItems.find((item) => !item.udi.trim())
  if (missingUdi) {
    ElMessage.warning(`请为「${missingUdi.itemName}」输入UDI编号`)
    return
  }

  submitting.value = true
  try {
    const payload = {
      shippingId: dispatchForm.shippingId,
      dispatchItems: dispatchForm.dispatchItems.map((item) => ({
        itemId: item.itemId,
        udi: item.udi,
      })),
    }
    const res = await orderApi.dispatch(currentOrder.value.id, payload) as any
    if (res.success) {
      ElMessage.success('发货成功')
      dispatchDialogVisible.value = false
      loadShippingOrders()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发货失败')
  } finally {
    submitting.value = false
  }
}

// =============================================================================
// 经销商发货给医院
// =============================================================================
const distShipDialogVisible = ref(false)
const distShipForm = reactive({
  shippingId: '',
})

const openDistributorShipDialog = (row: any) => {
  currentOrder.value = row
  distShipForm.shippingId = ''
  distShipDialogVisible.value = true
}

const handleDistributorShip = async () => {
  if (!distShipForm.shippingId.trim()) {
    ElMessage.warning('请输入运输单号')
    return
  }

  submitting.value = true
  try {
    const res = await orderApi.distributorDispatch(currentOrder.value.id, {
      distributorShippingId: distShipForm.shippingId,
    }) as any
    if (res.success) {
      ElMessage.success('已发货给医院')
      distShipDialogVisible.value = false
      loadShippingOrders()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发货失败')
  } finally {
    submitting.value = false
  }
}

// =============================================================================
// Tab 3 - 仓储清单
// =============================================================================
const inventoryLoading = ref(false)
const inventoryItems = ref<any[]>([])
const inventoryFilter = reactive({
  keyword: '',
})
const inventoryPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

const filteredInventoryItems = computed(() => {
  let items = inventoryItems.value
  if (inventoryFilter.keyword.trim()) {
    const kw = inventoryFilter.keyword.trim().toLowerCase()
    items = items.filter(
      (item) =>
        (item.orderNumber || '').toLowerCase().includes(kw) ||
        (item.itemName || '').toLowerCase().includes(kw)
    )
  }

  // Client-side pagination
  const start = (inventoryPagination.page - 1) * inventoryPagination.pageSize
  const end = start + inventoryPagination.pageSize
  return items.slice(start, end)
})

const loadInventoryItems = async () => {
  inventoryLoading.value = true
  try {
    // 从链上查询 owner=distributor 且 status=IN_STOCK 的资产
    const res = await assetApi.byOwner('distributor') as any

    if (res.success) {
      const assets = (res.data || []).filter(
        (a: any) => a.status === 'IN_STOCK' && a.name && a.name.trim() !== ''
      )

      const items = assets.map((a: any) => ({
        orderNumber: '-',
        itemName: a.name || '-',
        specification: a.specification || '-',
        udi: a.udi,
        quantity: a.quantity || 1,
        deliveryStatus: 'RECEIVED',
        deliveredAt: a.updatedAt || a.createdAt,
      }))

      items.sort((a: any, b: any) => {
        const timeA = new Date(a.deliveredAt || 0).getTime()
        const timeB = new Date(b.deliveredAt || 0).getTime()
        return timeB - timeA
      })

      inventoryItems.value = items
      inventoryPagination.total = items.length
    }
  } catch {
    ElMessage.error('加载仓储清单失败')
  } finally {
    inventoryLoading.value = false
  }
}

const handleInventoryPageChange = () => {
  // Pagination is client-side, just trigger reactivity
  inventoryPagination.page = inventoryPagination.page
}

// =============================================================================
// 订单详情抽屉
// =============================================================================
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const detailData = reactive({
  id: '',
  orderNumber: '',
  title: '',
  status: '',
  totalAmount: 0,
  hospitalName: '',
  expectedDeliveryDate: '',
  createdAt: '',
  rejectReason: '',
  shippingId: '',
  items: [] as any[],
  timeline: [] as any[],
})

const resetDetailData = () => {
  detailData.id = ''
  detailData.orderNumber = ''
  detailData.title = ''
  detailData.status = ''
  detailData.totalAmount = 0
  detailData.hospitalName = ''
  detailData.expectedDeliveryDate = ''
  detailData.createdAt = ''
  detailData.rejectReason = ''
  detailData.shippingId = ''
  detailData.items = []
  detailData.timeline = []
}

const openDetailDrawer = async (row: any) => {
  resetDetailData()
  detailData.orderNumber = row.orderNumber
  detailData.status = row.status
  drawerVisible.value = true
  drawerLoading.value = true

  try {
    const res = await orderApi.detail(row.id) as any
    if (res.success && res.data) {
      const data = res.data
      detailData.id = data.id || ''
      detailData.orderNumber = data.orderNumber || ''
      detailData.title = data.title || ''
      detailData.status = data.status || ''
      detailData.totalAmount = data.totalAmount || 0
      detailData.hospitalName = data.hospitalName || ''
      detailData.expectedDeliveryDate = data.expectedDeliveryDate || ''
      detailData.createdAt = data.createdAt || ''
      detailData.rejectReason = data.rejectReason || ''
      detailData.shippingId = data.shippingId || ''
      detailData.items = data.items || []

      // Build timeline from status history if available
      if (data.statusHistory && Array.isArray(data.statusHistory)) {
        detailData.timeline = data.statusHistory.map((entry: any) => ({
          status: entry.status || '',
          timestamp: entry.timestamp || entry.createdAt || '',
          remark: entry.remark || entry.reason || '',
        }))
      } else if (data.timeline && Array.isArray(data.timeline)) {
        detailData.timeline = data.timeline
      } else {
        // Build a basic timeline from the order's own timestamps
        const timeline: any[] = []
        if (data.createdAt) {
          timeline.push({ status: 'PENDING', timestamp: data.createdAt, remark: '订单创建' })
        }
        if (data.confirmedAt) {
          timeline.push({ status: 'CONFIRMED', timestamp: data.confirmedAt, remark: '' })
        }
        if (data.producerConfirmedAt) {
          timeline.push({ status: 'PRODUCING', timestamp: data.producerConfirmedAt, remark: '' })
        }
        if (data.readyToShipAt) {
          timeline.push({ status: 'READY_TO_SHIP', timestamp: data.readyToShipAt, remark: '' })
        }
        if (data.dispatchedAt) {
          timeline.push({ status: 'IN_TRANSIT', timestamp: data.dispatchedAt, remark: '' })
        }
        if (data.deliveredAt) {
          timeline.push({ status: 'DELIVERED', timestamp: data.deliveredAt, remark: '' })
        }
        if (data.acceptedAt) {
          timeline.push({ status: 'ACCEPTED', timestamp: data.acceptedAt, remark: '' })
        }
        if (data.completedAt) {
          timeline.push({ status: 'COMPLETED', timestamp: data.completedAt, remark: '' })
        }
        if (data.cancelledAt) {
          timeline.push({ status: 'CANCELLED', timestamp: data.cancelledAt, remark: data.rejectReason || '' })
        }
        if (data.rejectedAt) {
          timeline.push({ status: 'REJECTED', timestamp: data.rejectedAt, remark: data.rejectReason || '' })
        }
        detailData.timeline = timeline
      }
    }
  } catch {
    ElMessage.error('加载订单详情失败')
  } finally {
    drawerLoading.value = false
  }
}

const openDetailDrawerByOrder = async (orderId: string) => {
  resetDetailData()
  drawerVisible.value = true
  drawerLoading.value = true

  try {
    const res = await orderApi.detail(orderId) as any
    if (res.success && res.data) {
      const data = res.data
      detailData.id = data.id || ''
      detailData.orderNumber = data.orderNumber || ''
      detailData.title = data.title || ''
      detailData.status = data.status || ''
      detailData.totalAmount = data.totalAmount || 0
      detailData.hospitalName = data.hospitalName || ''
      detailData.expectedDeliveryDate = data.expectedDeliveryDate || ''
      detailData.createdAt = data.createdAt || ''
      detailData.rejectReason = data.rejectReason || ''
      detailData.shippingId = data.shippingId || ''
      detailData.items = data.items || []

      if (data.statusHistory && Array.isArray(data.statusHistory)) {
        detailData.timeline = data.statusHistory.map((entry: any) => ({
          status: entry.status || '',
          timestamp: entry.timestamp || entry.createdAt || '',
          remark: entry.remark || entry.reason || '',
        }))
      } else if (data.timeline && Array.isArray(data.timeline)) {
        detailData.timeline = data.timeline
      } else {
        detailData.timeline = []
      }
    }
  } catch {
    ElMessage.error('加载订单详情失败')
  } finally {
    drawerLoading.value = false
  }
}

// =============================================================================
// 生命周期
// =============================================================================
onMounted(() => {
  loadPendingOrders()
})
</script>

<style scoped lang="scss">
.order-manage {
  padding: 20px;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
  }

  .filter-card {
    margin-bottom: 20px;
  }

  .table-card {
    .pagination {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
  }

  .text-danger {
    color: #f56c6c;
  }

  .order-detail {
    padding: 0 10px;

    .section-title {
      margin: 0 0 12px 0;
      font-size: 15px;
      font-weight: 600;
      color: #303133;
    }

    .timeline-remark {
      color: #909399;
      font-size: 13px;
      margin-left: 4px;
    }
  }
}
</style>
