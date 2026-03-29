<template>
  <div class="page-container">
    <div class="page-card">
      <h2>收货确认</h2>
      <p class="desc">扫描或输入UDI，确认收货并完成权属转移</p>

      <!-- 权限提示 -->
      <el-alert
        v-if="!canWrite"
        title="权限不足"
        type="warning"
        description="您的角色是查看者，无法执行收货操作。如需操作权限，请联系管理员。"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />

      <!-- UDI输入 -->
      <div class="scan-area">
        <el-input
          v-model="udiInput"
          placeholder="请输入或扫描UDI编码"
          size="large"
          @keyup.enter="queryAsset"
        >
          <template #prepend>UDI</template>
          <template #append>
            <el-button type="primary" @click="queryAsset" :loading="queryLoading">
              查询
            </el-button>
          </template>
        </el-input>
      </div>

      <!-- 资产信息 -->
      <div v-if="assetInfo" class="asset-info">
        <el-descriptions title="资产信息" :column="2" border>
          <el-descriptions-item label="UDI编码">{{ assetInfo.udi }}</el-descriptions-item>
          <el-descriptions-item label="耗材名称">{{ assetInfo.name }}</el-descriptions-item>
          <el-form-item label="规格型号">{{ assetInfo.specification }}</el-form-item>
          <el-descriptions-item label="批次号">{{ assetInfo.batchNumber }}</el-descriptions-item>
          <el-descriptions-item label="有效期至">{{ assetInfo.expiryDate }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(assetInfo.status)">
              {{ getStatusText(assetInfo.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发货方">{{ assetInfo.owner }}</el-descriptions-item>
        </el-descriptions>

        <!-- 验证结果 -->
        <div class="verify-result" v-if="verifyResult">
          <el-alert
            :title="verifyResult.valid ? '可以收货' : '无法收货'"
            :type="verifyResult.valid ? 'success' : 'error'"
            :description="verifyResult.message"
            show-icon
          />
        </div>

        <!-- 收货确认 -->
        <div class="action-area" v-if="canReceive">
          <el-form :model="receiveForm" label-width="100px">
            <el-form-item label="收货方名称">
              <el-input v-model="receiveForm.receiverName" placeholder="输入收货方名称" />
            </el-form-item>
          </el-form>
          <el-button type="primary" size="large" :loading="receiveLoading" :disabled="!canWrite" @click="confirmReceive">
            确认收货
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi, logisticsApi } from '@/api'
import { usePermission } from '@/composables/usePermission'

const { canWrite } = usePermission()

const udiInput = ref('')
const queryLoading = ref(false)
const receiveLoading = ref(false)
const assetInfo = ref<any>(null)
const verifyResult = ref<any>(null)

const receiveForm = reactive({
  receiverName: '',
})

// 是否可以收货
const canReceive = computed(() => {
  return assetInfo.value && assetInfo.value.status === 'IN_TRANSIT'
})

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, any> = {
    CREATED: '',
    IN_TRANSIT: 'warning',
    IN_STOCK: 'success',
    CONSUMED: 'info',
    RECALL: 'danger',
  }
  return types[status] || ''
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    CREATED: '待出厂',
    IN_TRANSIT: '在途',
    IN_STOCK: '在库',
    CONSUMED: '已消耗',
    RECALL: '召回',
  }
  return texts[status] || status
}

// 查询资产
const queryAsset = async () => {
  if (!udiInput.value) {
    ElMessage.warning('请输入UDI编码')
    return
  }

  queryLoading.value = true
  verifyResult.value = null

  try {
    const res = await assetApi.query(udiInput.value) as any

    if (res.success && res.data) {
      assetInfo.value = res.data

      if (res.data.status === 'IN_TRANSIT') {
        verifyResult.value = {
          valid: true,
          message: '资产在途，可以确认收货',
        }
      } else if (res.data.status === 'CONSUMED') {
        verifyResult.value = {
          valid: false,
          message: '该资产已被消耗',
        }
      } else {
        verifyResult.value = {
          valid: false,
          message: `资产状态为${getStatusText(res.data.status)}，不在途`,
        }
      }
    } else {
      verifyResult.value = {
        valid: false,
        message: '未找到该资产',
      }
      assetInfo.value = null
    }
  } catch (error) {
    verifyResult.value = {
      valid: false,
      message: '查询失败',
    }
  } finally {
    queryLoading.value = false
  }
}

// 确认收货
const confirmReceive = async () => {
  if (!assetInfo.value) return

  receiveLoading.value = true
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const res = await logisticsApi.receive({
      udi: assetInfo.value.udi,
      receiverName: receiveForm.receiverName || user.name || '经销商',
    }) as any

    if (res.success) {
      ElMessage.success('收货确认成功')
      assetInfo.value = null
      verifyResult.value = null
      udiInput.value = ''
      receiveForm.receiverName = ''
    }
  } catch (error) {
    console.error('收货失败:', error)
  } finally {
    receiveLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 30px; }
  }
  .scan-area { max-width: 600px; margin-bottom: 30px; }
  .asset-info { margin-top: 20px; }
  .verify-result { margin-top: 20px; }
  .action-area { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
}
</style>
