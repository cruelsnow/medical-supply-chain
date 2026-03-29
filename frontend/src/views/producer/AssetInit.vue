<template>
  <div class="page-container">
    <div class="page-card">
      <h2>资产登记</h2>
      <p class="desc">录入医用耗材信息，生成UDI并上链存证</p>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="asset-form">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="耗材名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入耗材名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格型号" prop="specification">
              <el-input v-model="form.specification" placeholder="请输入规格型号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="批次号" prop="batchNumber">
              <el-input v-model="form.batchNumber" placeholder="请输入批次号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="UDI编码" prop="udi">
              <el-input v-model="form.udi" placeholder="自动生成或手动输入">
                <template #append>
                  <el-button @click="generateUDI">自动生成</el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="生产日期" prop="productionDate">
              <el-date-picker
                v-model="form.productionDate"
                type="date"
                placeholder="选择生产日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="有效期至" prop="expiryDate">
              <el-date-picker
                v-model="form.expiryDate"
                type="date"
                placeholder="选择有效期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="质检报告" prop="docHash">
              <el-upload
                class="upload-area"
                :auto-upload="false"
                :on-change="handleFileChange"
                :show-file-list="false"
              >
                <el-button type="primary">上传质检报告</el-button>
                <template #tip>
                  <div class="el-upload__tip" v-if="form.docHash">
                    已生成哈希: {{ form.docHash.substring(0, 16) }}...
                  </div>
                  <div class="el-upload__tip" v-else>
                    支持 PDF、图片等格式，系统自动计算哈希值
                  </div>
                </template>
              </el-upload>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备注">
              <el-input v-model="form.remarks" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            :disabled="!canWrite"
            @click="handleSubmit"
          >
            确认登记上链
          </el-button>
          <el-button size="large" @click="resetForm">重置</el-button>
        </el-form-item>

        <!-- 权限提示 -->
        <el-alert
          v-if="!canWrite"
          title="权限不足"
          type="warning"
          description="您的角色是查看者，无法执行资产登记操作。如需操作权限，请联系管理员。"
          :closable="false"
          show-icon
          style="margin-bottom: 20px"
        />
      </el-form>
    </div>

    <!-- 上链成功提示 -->
    <el-dialog v-model="successDialogVisible" title="上链成功" width="500px" center>
      <el-result icon="success" title="资产已成功上链" :sub-title="`UDI: ${submittedUDI}`">
        <template #extra>
          <el-button type="primary" @click="viewAsset">查看资产</el-button>
          <el-button @click="continueRegister">继续登记</el-button>
        </template>
      </el-result>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance, FormRules, UploadFile } from 'element-plus'
import { assetApi, traceApi } from '@/api'
import { usePermission } from '@/composables/usePermission'
import CryptoJS from 'crypto-js'

const router = useRouter()

// 使用权限 composable
const { canWrite } = usePermission()

const formRef = ref<FormInstance>()
const loading = ref(false)
const successDialogVisible = ref(false)
const submittedUDI = ref('')

const form = reactive({
  udi: '',
  name: '',
  specification: '',
  batchNumber: '',
  productionDate: '',
  expiryDate: '',
  docHash: '',
  producer: 'ProducerMSP',
  remarks: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入耗材名称', trigger: 'blur' }],
  specification: [{ required: true, message: '请输入规格型号', trigger: 'blur' }],
  batchNumber: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
  udi: [{ required: true, message: '请输入UDI编码', trigger: 'blur' }],
  productionDate: [{ required: true, message: '请选择生产日期', trigger: 'change' }],
  expiryDate: [{ required: true, message: '请选择有效期', trigger: 'change' }],
}

// 生成UDI
const generateUDI = () => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  form.udi = `UDI${timestamp}${random}`
}

// 处理文件上传
const handleFileChange = async (file: UploadFile) => {
  if (file.raw) {
    // 读取文件并计算哈希
    const reader = new FileReader()
    reader.onload = async (e) => {
      const content = e.target?.result as string
      // 使用SHA-256计算哈希
      const hash = CryptoJS.SHA256(content).toString()
      form.docHash = hash
      ElMessage.success('质检报告哈希已生成')
    }
    reader.readAsText(file.raw)
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  // 检查权限
  if (!canWrite) {
    ElMessage.warning('您的角色是查看者，无法执行资产登记操作')
    return
  }

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    try {
      // 如果没有上传文件，生成默认哈希
      const submitData = { ...form }
      if (!submitData.docHash) {
        submitData.docHash = CryptoJS.SHA256(`${form.udi}-${Date.now()}`).toString()
      }

      const res = await assetApi.init(submitData) as any

      if (res.success) {
        submittedUDI.value = form.udi
        successDialogVisible.value = true
        ElMessage.success('资产登记成功，已上链存证')
      } else {
        // 显示后端返回的错误信息
        ElMessage.error(res.error || '资产登记失败')
      }
    } catch (error: any) {
      console.error('登记失败:', error)
      // 显示错误信息
      const errorMsg = error.response?.data?.error || error.message || '资产登记失败'
      ElMessage.error(errorMsg)
    } finally {
      loading.value = false
    }
  })
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  form.docHash = ''
}

// 查看资产
const viewAsset = () => {
  successDialogVisible.value = false
  router.push(`/regulator/trace?udi=${submittedUDI.value}`)
}

// 继续登记
const continueRegister = () => {
  successDialogVisible.value = false
  resetForm()
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

  .asset-form {
    max-width: 800px;
  }

  .upload-area {
    .el-button {
      width: 100%;
    }
  }
}
</style>
