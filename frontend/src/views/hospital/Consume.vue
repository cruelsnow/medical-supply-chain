<template>
  <div class="page-container">
    <div class="page-card">
      <h2>临床消耗核销</h2>
      <p class="desc">扫描或输入UDI，记录临床消耗并完成核销</p>

      <!-- 权限提示 -->
      <el-alert
        v-if="!canWrite"
        title="权限不足"
        type="warning"
        description="您的角色是查看者，无法执行核销操作。如需操作权限，请联系管理员。"
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

      <!-- 资产信息和核销表单 -->
      <div v-if="assetInfo" class="consume-form">
        <el-descriptions title="资产信息" :column="2" border class="mb-20">
          <el-descriptions-item label="UDI编码">{{ assetInfo.udi }}</el-descriptions-item>
          <el-descriptions-item label="耗材名称">{{ assetInfo.name }}</el-descriptions-item>
          <el-descriptions-item label="规格型号">{{ assetInfo.specification }}</el-descriptions-item>
          <el-descriptions-item label="批次号">{{ assetInfo.batchNumber }}</el-descriptions-item>
          <el-descriptions-item label="有效期至">
            <span :class="{ 'text-danger': isExpiring(assetInfo.expiryDate) }">
              {{ assetInfo.expiryDate }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(assetInfo.status)">
              {{ getStatusText(assetInfo.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
          v-if="canConsume"
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="使用科室" prop="department">
                <el-select v-model="form.department" placeholder="选择科室" style="width: 100%">
                  <el-option label="手术室" value="手术室" />
                  <el-option label="内科" value="内科" />
                  <el-option label="外科" value="外科" />
                  <el-option label="骨科" value="骨科" />
                  <el-option label="心内科" value="心内科" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="操作者" prop="operator">
                <el-input v-model="form.operator" placeholder="操作者姓名" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="手术ID">
                <el-input v-model="form.surgeryId" placeholder="关联手术ID（脱敏）" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="备注">
                <el-input v-model="form.remarks" placeholder="备注信息" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-button type="primary" size="large" :loading="submitLoading" :disabled="!canWrite" @click="handleSubmit">
              确认消耗核销
            </el-button>
          </el-form-item>
        </el-form>

        <el-alert
          v-else
          type="warning"
          title="无法核销"
          :description="`该资产当前状态为${getStatusText(assetInfo.status)}，只有在库状态的资产才能核销`"
          show-icon
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { assetApi, hospitalApi } from '@/api'
import { usePermission } from '@/composables/usePermission'

const { canWrite } = usePermission()

const udiInput = ref('')
const queryLoading = ref(false)
const submitLoading = ref(false)
const assetInfo = ref<any>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  department: '',
  operator: '',
  surgeryId: '',
  remarks: '',
})

const rules: FormRules = {
  department: [{ required: true, message: '请选择科室', trigger: 'change' }],
  operator: [{ required: true, message: '请输入操作者', trigger: 'blur' }],
}

// 是否可以核销
const canConsume = computed(() => {
  return assetInfo.value && assetInfo.value.status === 'IN_STOCK'
})

// 判断是否即将过期
const isExpiring = (expiryDate: string) => {
  const expiry = new Date(expiryDate)
  const now = new Date()
  const days = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return days <= 30
}

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

  try {
    const res = await assetApi.query(udiInput.value) as any

    if (res.success && res.data) {
      assetInfo.value = res.data

      // 如果已消耗，提示
      if (res.data.status === 'CONSUMED') {
        ElMessage.warning('该资产已被消耗')
      }
    } else {
      ElMessage.error('未找到该资产')
      assetInfo.value = null
    }
  } catch (error) {
    console.error('查询失败:', error)
    assetInfo.value = null
  } finally {
    queryLoading.value = false
  }
}

// 提交核销
const handleSubmit = async () => {
  if (!formRef.value || !assetInfo.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    submitLoading.value = true

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const res = await hospitalApi.consume({
        udi: assetInfo.value.udi,
        hospital: user.name || '医院',
        department: form.department,
        surgeryId: form.surgeryId,
        operator: form.operator,
        remarks: form.remarks,
      }) as any

      if (res.success) {
        ElMessage.success('核销成功')
        // 重置
        assetInfo.value = null
        udiInput.value = ''
        formRef.value?.resetFields()
      }
    } catch (error) {
      console.error('核销失败:', error)
    } finally {
      submitLoading.value = false
    }
  })
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

  .consume-form {
    max-width: 800px;
  }
}
</style>
