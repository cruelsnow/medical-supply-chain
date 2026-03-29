<template>
  <div class="page-container">
    <div class="page-card">
      <h2>环境监控</h2>
      <p class="desc">记录运输过程中的温湿度等环境数据</p>

      <!-- 权限提示 -->
      <el-alert
        v-if="!canWrite"
        title="权限不足"
        type="warning"
        description="您的角色是查看者，无法执行环境数据记录操作。如需操作权限，请联系管理员。"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      />

      <!-- UDI输入 -->
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px" class="env-form">
        <el-form-item label="UDI编码" prop="udi">
          <el-input v-model="form.udi" placeholder="请输入或扫描UDI编码" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="温度(℃)" prop="temperature">
              <el-input-number v-model="form.temperature" :min="-50" :max="100" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="湿度(%)" prop="humidity">
              <el-input-number v-model="form.humidity" :min="0" :max="100" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="位置" prop="location">
          <el-input v-model="form.location" placeholder="当前位置信息" />
        </el-form-item>

        <el-form-item label="异常标记">
          <el-switch v-model="form.isAbnormal" />
          <span class="tip" v-if="form.isAbnormal" style="color: #f56c6c; margin-left: 10px;">
            将标记为异常状态
          </span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" :disabled="!canWrite" @click="handleSubmit">
            提交记录
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 最近记录 -->
      <div class="recent-records" v-if="recentRecords.length > 0">
        <h3>最近提交记录</h3>
        <el-table :data="recentRecords" stripe size="small">
          <el-table-column prop="udi" label="UDI" width="200" />
          <el-table-column prop="temperature" label="温度" width="100" />
          <el-table-column prop="humidity" label="湿度" width="100" />
          <el-table-column prop="location" label="位置" />
          <el-table-column prop="isAbnormal" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isAbnormal ? 'danger' : 'success'">
                {{ row.isAbnormal ? '异常' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="time" label="时间" width="160" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { logisticsApi, assetApi } from '@/api'
import { usePermission } from '@/composables/usePermission'

const { canWrite } = usePermission()

const formRef = ref<FormInstance>()
const loading = ref(false)
const recentRecords = ref<any[]>([])

const form = reactive({
  udi: '',
  temperature: 25,
  humidity: 50,
  location: '',
  isAbnormal: false,
})

const rules: FormRules = {
  udi: [{ required: true, message: '请输入UDI编码', trigger: 'blur' }],
  temperature: [{ required: true, message: '请输入温度', trigger: 'blur' }],
  humidity: [{ required: true, message: '请输入湿度', trigger: 'blur' }],
  location: [{ required: true, message: '请输入位置', trigger: 'blur' }],
}

// 提交记录
const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    try {
      const res = await logisticsApi.envData({
        udi: form.udi,
        temperature: form.temperature,
        humidity: form.humidity,
        location: form.location,
        isAbnormal: form.isAbnormal,
      }) as any

      if (res.success) {
        ElMessage.success('环境数据记录成功')

        // 添加到最近记录
        recentRecords.value.unshift({
          udi: form.udi,
          temperature: form.temperature,
          humidity: form.humidity,
          location: form.location,
          isAbnormal: form.isAbnormal,
          time: new Date().toLocaleString(),
        })

        // 保持最近10条
        if (recentRecords.value.length > 10) {
          recentRecords.value.pop()
        }

        // 重置UDI
        form.udi = ''
      }
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.page-container {
  .page-card {
    h2 { margin-bottom: 10px; }
    .desc { color: #666; margin-bottom: 30px; }
  }
  .env-form { max-width: 600px; }
  .recent-records {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    h3 { margin-bottom: 15px; }
  }
}
</style>
