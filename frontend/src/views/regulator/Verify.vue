<template>
  <div class="page-container">
    <div class="page-card">
      <h2>哈希校验</h2>
      <p class="desc">验证链下文档与链上哈希的一致性，确保数据未被篡改</p>

      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px" class="verify-form">
        <el-form-item label="UDI编码" prop="udi">
          <el-input v-model="form.udi" placeholder="请输入UDI编码" />
        </el-form-item>

        <el-form-item label="文档哈希" prop="docHash">
          <el-input v-model="form.docHash" placeholder="64位SHA-256哈希值" />
        </el-form-item>

        <el-form-item label="上传文件">
          <el-upload
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
          >
            <el-button type="primary">选择文件计算哈希</el-button>
          </el-upload>
          <div class="file-hash" v-if="calculatedHash">
            计算出的哈希: <code>{{ calculatedHash }}</code>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" @click="handleVerify">
            开始校验
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 校验结果 -->
      <div v-if="verifyResult" class="verify-result">
        <el-result
          :icon="verifyResult.isValid ? 'success' : 'error'"
          :title="verifyResult.isValid ? '校验通过' : '校验失败'"
        >
          <template #sub-title>
            <div class="result-details">
              <p v-if="verifyResult.isValid">文档未被篡改，与链上记录一致</p>
              <p v-else>文档可能已被篡改，与链上记录不一致</p>
            </div>
          </template>
          <template #extra>
            <el-descriptions :column="1" border size="small">
              <el-descriptions-item label="UDI编码">{{ form.udi }}</el-descriptions-item>
              <el-descriptions-item label="链上哈希">{{ verifyResult.storedHash }}</el-descriptions-item>
              <el-descriptions-item label="提供哈希">{{ verifyResult.providedHash }}</el-descriptions-item>
              <el-descriptions-item label="校验时间">{{ verifyResult.verifiedAt }}</el-descriptions-item>
            </el-descriptions>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, FormInstance, FormRules, UploadFile } from 'element-plus'
import { traceApi } from '@/api'
import CryptoJS from 'crypto-js'

const route = useRoute()
const formRef = ref<FormInstance>()
const loading = ref(false)
const calculatedHash = ref('')
const verifyResult = ref<any>(null)

const form = reactive({
  udi: '',
  docHash: '',
})

const rules: FormRules = {
  udi: [{ required: true, message: '请输入UDI编码', trigger: 'blur' }],
  docHash: [
    { required: true, message: '请输入文档哈希', trigger: 'blur' },
    { len: 64, message: '哈希值应为64位', trigger: 'blur' },
  ],
}

// 处理文件变化
const handleFileChange = (file: UploadFile) => {
  if (file.raw) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      calculatedHash.value = CryptoJS.SHA256(content).toString()
      form.docHash = calculatedHash.value
      ElMessage.success('哈希计算完成')
    }
    reader.readAsText(file.raw)
  }
}

// 执行校验
const handleVerify = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    verifyResult.value = null

    try {
      const res = await traceApi.verify({
        udi: form.udi,
        docHash: form.docHash,
      }) as any

      if (res.success) {
        verifyResult.value = res.data
      }
    } catch (error) {
      console.error('校验失败:', error)
      ElMessage.error('校验请求失败')
    } finally {
      loading.value = false
    }
  })
}

// 初始化
onMounted(() => {
  const udi = route.query.udi as string
  if (udi) {
    form.udi = udi
  }
})
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 30px; }
  }
  .verify-form { max-width: 600px; }
  .file-hash {
    margin-top: 10px;
    font-size: 12px;
    color: #666;
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
    }
  }
  .verify-result {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  }
}
</style>
