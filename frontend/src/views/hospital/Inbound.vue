<template>
  <div class="page-container">
    <div class="page-card">
      <h2>验收入库</h2>
      <p class="desc">扫描或输入UDI，验证资产信息并确认入库</p>

      <!-- 权限提示 -->
      <el-alert
        v-if="!canWrite"
        title="权限不足"
        type="warning"
        description="您的角色是查看者，无法执行入库操作。如需操作权限，请联系管理员。"
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
              查询验证
            </el-button>
          </template>
        </el-input>
      </div>

      <!-- 资产信息 -->
      <div v-if="assetInfo" class="asset-info">
        <el-descriptions title="资产信息" :column="2" border>
          <el-descriptions-item label="UDI编码">{{ assetInfo.udi }}</el-descriptions-item>
          <el-descriptions-item label="耗材名称">{{ assetInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="规格型号">{{ assetInfo.specification }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ assetInfo.batchNumber }}</el-descriptions-item>
          <el-descriptions-item label="生产日期">{{ assetInfo.productionDate }}</el-descriptions-item>
          <el-descriptions-item label="有效期至">{{ assetInfo.expiryDate }}</el-descriptions-item>
          <el-descriptions-item label="生产商">{{ assetInfo.producer }}</el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(assetInfo.status)">
              {{ getStatusText(assetInfo.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 验证结果 -->
        <div class="verify-result" v-if="verifyResult">
          <el-alert
            :title="verifyResult.valid ? '验证通过' : '验证失败'"
            :type="verifyResult.valid ? 'success' : 'error'"
            :description="verifyResult.message"
            show-icon
          />
        </div>

        <!-- 入库确认 -->
        <div class="action-area" v-if="canInbound">
          <el-form :model="inboundForm" label-width="100px">
            <el-form-item label="入库科室">
              <el-input v-model="inboundForm.receiverName" placeholder="输入入库科室" />
            </el-form-item>
          </el-form>
          <el-button type="primary" size="large" :loading="inboundLoading" :disabled="!canWrite" @click="confirmInbound">
            确认入库
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { assetApi, hospitalApi } from '@/api'
import { usePermission } from '@/composables/usePermission'

const { canWrite } = usePermission()

const udiInput = ref('')
const queryLoading = ref(false)
const inboundLoading = ref(false)
const assetInfo = ref<any>(null)
const verifyResult = ref<any>(null)

const inboundForm = reactive({
  receiverName: '',
})

// 是否可以入库
const canInbound = computed(() => {
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
    EXCEPTION: 'danger',
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
    EXCEPTION: '异常',
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

      // 验证逻辑
      const now = new Date()
      const expiryDate = new Date(res.data.expiryDate)

      if (res.data.status === 'CONSUMED') {
        verifyResult.value = {
          valid: false,
          message: '该资产已被消耗，无法重复入库',
        }
      } else if (res.data.status === 'RECALL') {
        verifyResult.value = {
          valid: false,
          message: '该资产已被召回，禁止入库',
        }
      } else if (expiryDate < now) {
        verifyResult.value = {
          valid: false,
          message: '该资产已过有效期',
        }
      } else if (res.data.status !== 'IN_TRANSIT') {
        verifyResult.value = {
          valid: false,
          message: `该资产当前状态为${getStatusText(res.data.status)}，不在途`,
        }
      } else {
        verifyResult.value = {
          valid: true,
          message: '资产验证通过，可以入库',
        }
      }
    } else {
      verifyResult.value = {
        valid: false,
        message: '未找到该UDI对应的资产',
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

// 确认入库
const confirmInbound = async () => {
  if (!assetInfo.value) return

  inboundLoading.value = true
  try {
    const res = await hospitalApi.inbound({
      udi: assetInfo.value.udi,
      receiverName: inboundForm.receiverName || '中心库房',
    }) as any

    if (res.success) {
      ElMessage.success('入库成功')
      // 重置
      assetInfo.value = null
      verifyResult.value = null
      udiInput.value = ''
      inboundForm.receiverName = ''
    }
  } catch (error) {
    console.error('入库失败:', error)
  } finally {
    inboundLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 {
      margin-bottom: 10px;
    }

    .desc {
      color: #666;
      margin-bottom: 30px;
    }
  }

  .scan-area {
    max-width: 600px;
    margin-bottom: 30px;
  }

  .asset-info {
    margin-top: 20px;
  }

  .verify-result {
    margin-top: 20px;
  }

  .action-area {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;

    .el-form {
      max-width: 400px;
      margin-bottom: 20px;
    }
  }
}
</style>
