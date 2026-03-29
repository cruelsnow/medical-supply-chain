<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>医用耗材供应链管理系统</h1>
        <p>基于区块链的可信溯源平台</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" class="login-form">
        <el-form-item prop="orgName">
          <el-select v-model="form.orgName" placeholder="请选择组织" style="width: 100%">
            <el-option label="生产商" value="producer" />
            <el-option label="经销商/物流" value="distributor" />
            <el-option label="医院" value="hospital" />
            <el-option label="监管机构" value="regulator" />
          </el-select>
        </el-form-item>

        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            style="width: 100%"
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-tips">
        <p>演示账号:</p>
        <ul>
          <li>生产商: producer_admin / 123456</li>
          <li>经销商: distributor_admin / 123456</li>
          <li>医院: hospital_admin / 123456</li>
          <li>监管: regulator_admin / 123456</li>
        </ul>
      </div>
    </div>

    <div class="login-footer">
      <p>© 2026 医用耗材供应链管理系统 | 基于Hyperledger Fabric</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, FormInstance, FormRules } from 'element-plus'
import { authApi } from '@/api'

const router = useRouter()
const route = useRoute()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  orgName: 'producer',
  username: '',
  password: '',
})

const rules: FormRules = {
  orgName: [{ required: true, message: '请选择组织', trigger: 'change' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true

    try {
      const res = await authApi.login(form) as any

      // 保存token
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      ElMessage.success('登录成功')

      // 跳转到之前的页面或首页
      const redirect = (route.query.redirect as string) || '/dashboard'
      router.push(redirect)
    } catch (error) {
      console.error('登录失败:', error)
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  h1 {
    font-size: 24px;
    color: #333;
    margin-bottom: 10px;
  }

  p {
    color: #666;
    font-size: 14px;
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 20px;
  }
}

.login-tips {
  margin-top: 20px;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
  color: #666;

  p {
    margin-bottom: 8px;
    font-weight: bold;
  }

  ul {
    padding-left: 20px;
    margin: 0;

    li {
      margin-bottom: 4px;
    }
  }
}

.login-footer {
  position: fixed;
  bottom: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
}
</style>
