<template>
  <div class="page-container">
    <div class="page-card">
      <h2>订单管理</h2>
      <p class="desc">确认订单并安排生产发货</p>

      <el-alert v-if="!canWrite" title="权限不足" type="warning"
        description="您的角色是查看者，无法执行订单操作。"
        :closable="false" show-icon style="margin-bottom: 20px" />

      <el-row :gutter="16" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-input v-model="keyword" placeholder="搜索订单编号/标题" clearable @clear="loadOrders" @keyup.enter="loadOrders" />
        </el-col>
        <el-col :span="4">
          <el-select v-model="statusFilter" placeholder="订单状态" clearable @change="loadOrders" style="width: 100%">
            <el-option label="待确认" value="CONFIRMED" />
            <el-option label="生产中" value="PRODUCING" />
            <el-option label="待发货" value="READY_TO_SHIP" />
            <el-option label="运输中" value="IN_TRANSIT" />
          </el-select>
        </el-col>
        <el-col :span="2">
          <el-button type="primary" @click="loadOrders">搜索</el-button>
        </el-col>
      </el-row>

      <el-table :data="orders" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="orderNumber" label="订单编号" width="180" />
        <el-table-column prop="title" label="订单标题" min-width="200" />
        <el-table-column prop="hospitalName" label="医院" width="120" />
        <el-table-column prop="distributorName" label="经销商" width="120" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusColor(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="expectedDeliveryDate" label="期望交付" width="120" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="viewDetail(row)">查看详情</el-button>
            <el-button v-if="canWrite && row.status === 'CONFIRMED'" type="success" link @click="producerConfirm(row)">确认生产</el-button>
            <el-button v-if="canWrite && row.status === 'PRODUCING'" type="warning" link @click="readyToShip(row)">标记待发货</el-button>
            <el-button v-if="canWrite && row.status === 'READY_TO_SHIP'" type="danger" link @click="openDispatchDialog(row)">发货</el-button>
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
        </el-descriptions>

        <h4 style="margin-bottom: 12px">订单明细</h4>
        <el-table :data="currentOrder.items || []" border style="margin-bottom: 24px">
          <el-table-column prop="materialName" label="名称" min-width="120" />
          <el-table-column prop="specification" label="规格" width="100" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="unitPrice" label="单价" width="100">
            <template #default="{ row }">¥{{ row.unitPrice?.toFixed(2) || '0.00' }}</template>
          </el-table-column>
          <el-table-column prop="udi" label="UDI" min-width="140">
            <template #default="{ row }">{{ row.udi || '-' }}</template>
          </el-table-column>
        </el-table>

        <template v-if="currentOrder.shippingId">
          <h4 style="margin-bottom: 12px">物流信息</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="运输单号">{{ currentOrder.shippingId }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </template>
    </el-drawer>

    <!-- 发货对话框 -->
    <el-dialog v-model="dispatchVisible" title="发货操作" width="750px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="运输单号" required>
          <el-input v-model="dispatchForm.shippingId" placeholder="请输入运输单号，如 SF1234567890" />
        </el-form-item>
        <el-alert type="info" :closable="false" style="margin-bottom: 16px">
          请为每个订单项选择已登记的资产（UDI编码）。如无可用资产，请先前往「资产登记」页面录入。
        </el-alert>
        <el-form-item label="发货明细">
          <el-table :data="dispatchForm.dispatchItems" border size="small">
            <el-table-column prop="itemName" label="名称" min-width="120" />
            <el-table-column prop="specification" label="规格" width="100" />
            <el-table-column prop="quantity" label="数量" width="70" />
            <el-table-column label="关联资产(UDI)" min-width="220">
              <template #default="{ row, $index }">
                <el-select
                  v-model="row.udi"
                  placeholder="请选择已登记的资产"
                  filterable
                  style="width: 100%"
                >
                  <el-option
                    v-for="asset in getAvailableAssets(row, $index)"
                    :key="asset.udi"
                    :label="`${asset.udi} (${asset.name})`"
                    :value="asset.udi"
                  />
                </el-select>
                <div v-if="registeredAssets.length === 0" style="color: #f56c6c; font-size: 12px; margin-top: 4px">
                  暂无已登记资产，请先前往资产登记
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchVisible = false">取消</el-button>
        <el-button type="primary" :loading="dispatchLoading" @click="handleDispatch">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, assetApi } from '@/api'
import { usePermission } from '@/composables/usePermission'

const { canWrite } = usePermission()
const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const keyword = ref('')
const statusFilter = ref('')
const detailVisible = ref(false)
const currentOrder = ref<any>(null)

// 发货相关
const dispatchVisible = ref(false)
const dispatchLoading = ref(false)
const registeredAssets = ref<any[]>([])
const dispatchForm = reactive({
  shippingId: '',
  dispatchItems: [] as { itemId: string; itemName: string; specification: string; quantity: number; udi: string }[],
})
const dispatchOrderId = ref('')

const statusColor = (status: string): 'info' | 'success' | 'warning' | 'danger' | 'primary' => {
  const map: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
    CONFIRMED: 'primary', PRODUCING: 'warning', READY_TO_SHIP: 'warning', IN_TRANSIT: 'primary'
  }
  return map[status] || 'info'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    CONFIRMED: '待确认', PRODUCING: '生产中', READY_TO_SHIP: '待发货', IN_TRANSIT: '运输中'
  }
  return map[status] || status
}

const loadOrders = async () => {
  loading.value = true
  try {
    const res = await orderApi.list({
      status: statusFilter.value || undefined,
      keyword: keyword.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    }) as any
    if (res.success) {
      orders.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch { ElMessage.error('加载失败') }
  finally { loading.value = false }
}

const viewDetail = async (row: any) => {
  try {
    const res = await orderApi.detail(row.id) as any
    if (res.success) {
      currentOrder.value = res.data
      detailVisible.value = true
    }
  } catch {
    ElMessage.error('获取订单详情失败')
  }
}

const producerConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm('确认接单并安排生产？', '确认')
    const res = await orderApi.producerConfirm(row.id) as any
    if (res.success) { ElMessage.success('已确认安排生产'); loadOrders() }
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(error.message || '操作失败')
  }
}

const readyToShip = async (row: any) => {
  try {
    await ElMessageBox.confirm('确认标记为待发货？', '确认')
    const res = await orderApi.readyToShip(row.id) as any
    if (res.success) { ElMessage.success('已标记待发货'); loadOrders() }
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error(error.message || '操作失败')
  }
}

// 打开发货对话框
const openDispatchDialog = async (row: any) => {
  dispatchOrderId.value = row.id
  dispatchForm.shippingId = ''
  dispatchForm.dispatchItems = []
  registeredAssets.value = []

  try {
    // 并行加载订单详情和已登记资产
    const [orderRes, assetRes] = await Promise.all([
      orderApi.detail(row.id) as any,
      assetApi.byStatus('CREATED') as any,
    ])

    if (orderRes.success) {
      dispatchForm.dispatchItems = (orderRes.data.items || []).map((item: any) => ({
        itemId: item.id,
        itemName: item.materialName || item.name,
        specification: item.specification,
        quantity: item.quantity,
        udi: '',
      }))
    }

    if (assetRes.success && assetRes.data) {
      registeredAssets.value = assetRes.data
        .filter((a: any) => a.name && a.name.trim() !== '')
    }
  } catch {
    ElMessage.error('获取数据失败')
    return
  }
  dispatchVisible.value = true
}

// 获取当前订单项可选的资产（排除已被其他行选中的）
const getAvailableAssets = (row: any, currentIndex: number) => {
  // 收集其他行已选中的 UDI
  const selectedUdis = dispatchForm.dispatchItems
    .filter((_, i) => i !== currentIndex && _.udi)
    .map(_ => _.udi)

  return registeredAssets.value.filter(a => !selectedUdis.includes(a.udi))
}

// 确认发货
const handleDispatch = async () => {
  if (!dispatchForm.shippingId.trim()) {
    ElMessage.warning('请输入运输单号')
    return
  }

  // 检查每个订单项是否都选了资产
  const unselected = dispatchForm.dispatchItems.find(item => !item.udi)
  if (unselected) {
    ElMessage.warning(`请为「${unselected.itemName}」选择关联资产`)
    return
  }

  try {
    dispatchLoading.value = true
    const payload = {
      shippingId: dispatchForm.shippingId,
      dispatchItems: dispatchForm.dispatchItems.map(item => ({
        itemId: item.itemId,
        udi: item.udi,
      })),
    }
    const res = await orderApi.dispatch(dispatchOrderId.value, payload) as any
    if (res.success) {
      ElMessage.success('发货成功')
      dispatchVisible.value = false
      loadOrders()
    } else {
      ElMessage.error(res.error || '发货失败')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '发货失败')
  } finally {
    dispatchLoading.value = false
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
