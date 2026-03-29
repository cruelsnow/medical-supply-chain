<!-- =============================================================================
  基于区块链的医用耗材供应链管理系统 - 用户管理页面
  ============================================================================= -->
<template>
  <div class="user-manage">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon>
        创建用户
      </el-button>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="filterForm">
        <el-form-item label="组织">
          <el-select v-model="filterForm.orgName" placeholder="全部组织" clearable style="width: 150px">
            <el-option
              v-for="org in organizations"
              :key="org.value"
              :label="org.label"
              :value="org.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="filterForm.role" placeholder="全部角色" clearable style="width: 120px">
            <el-option
              v-for="role in roles"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadUsers">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card">
      <el-table :data="userList" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="orgName" label="组织" width="120">
          <template #default="{ row }">
            <el-tag :type="getOrgTagType(row.orgName)">
              {{ getOrgLabel(row.orgName) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="280">
          <template #default="{ row }">
            <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
            <el-button size="small" @click="showResetPasswordDialog(row)">重置密码</el-button>
            <el-button
              size="small"
              :type="row.status === 'active' ? 'warning' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(row)"
              :disabled="row.role === 'admin'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadUsers"
          @current-change="loadUsers"
        />
      </div>
    </el-card>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '创建用户'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="userForm"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username" v-if="!isEdit">
          <el-input v-model="userForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="用户名" v-else>
          <el-input v-model="userForm.username" disabled />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="userForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="组织" prop="orgName" v-if="!isEdit">
          <el-select v-model="userForm.orgName" placeholder="请选择组织" style="width: 100%">
            <el-option
              v-for="org in organizations"
              :key="org.value"
              :label="org.label"
              :value="org.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="组织" v-else>
          <el-input :value="getOrgLabel(userForm.orgName)" disabled />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色" style="width: 100%">
            <el-option
              v-for="role in roles"
              :key="role.value"
              :label="role.label"
              :value="role.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetPasswordVisible"
      title="重置密码"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="resetFormRef"
        :model="resetPasswordForm"
        :rules="resetPasswordRules"
        label-width="80px"
      >
        <el-form-item label="用户名">
          <el-input v-model="resetPasswordForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetPasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="resetPasswordForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPasswordVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleResetPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { authApi } from '@/api'

// =============================================================================
// 类型定义
// =============================================================================
interface User {
  id: string
  username: string
  name: string
  orgName: string
  role: string
  status: string
  createdAt: string
}

// =============================================================================
// 数据定义
// =============================================================================
const organizations = [
  { value: 'producer', label: '生产商' },
  { value: 'distributor', label: '经销商' },
  { value: 'hospital', label: '医院' },
  { value: 'regulator', label: '监管机构' },
]

const roles = [
  { value: 'admin', label: '管理员' },
  { value: 'operator', label: '操作员' },
  { value: 'viewer', label: '查看者' },
]

// =============================================================================
// 响应式数据
// =============================================================================
const loading = ref(false)
const submitting = ref(false)
const userList = ref<User[]>([])
const dialogVisible = ref(false)
const resetPasswordVisible = ref(false)
const isEdit = ref(false)
const formRef = ref<FormInstance>()
const resetFormRef = ref<FormInstance>()

const filterForm = reactive({
  orgName: '',
  role: '',
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const userForm = reactive({
  id: '',
  username: '',
  password: '',
  name: '',
  orgName: '',
  role: 'operator',
})

const resetPasswordForm = reactive({
  id: '',
  username: '',
  newPassword: '',
  confirmPassword: '',
})

// =============================================================================
// 表单验证规则
// =============================================================================
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度3-50字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
  ],
  orgName: [
    { required: true, message: '请选择组织', trigger: 'change' },
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' },
  ],
}

const resetPasswordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== resetPasswordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// =============================================================================
// 辅助函数
// =============================================================================
const getOrgLabel = (orgName: string) => {
  const org = organizations.find(o => o.value === orgName)
  return org?.label || orgName
}

const getOrgTagType = (orgName: string) => {
  const typeMap: Record<string, string> = {
    producer: 'primary',
    distributor: 'warning',
    hospital: 'success',
    regulator: 'danger',
  }
  return typeMap[orgName] || 'info'
}

const getRoleLabel = (role: string) => {
  const roleItem = roles.find(r => r.value === role)
  return roleItem?.label || role
}

const getRoleTagType = (role: string) => {
  const typeMap: Record<string, string> = {
    admin: 'danger',
    operator: 'primary',
    viewer: 'info',
  }
  return typeMap[role] || 'info'
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

// =============================================================================
// 加载用户列表
// =============================================================================
const loadUsers = async () => {
  loading.value = true
  try {
    const res = await authApi.getUsers({
      orgName: filterForm.orgName || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    }) as any

    userList.value = res.data?.list || []
    pagination.total = res.data?.total || 0
  } catch (error) {
    console.error('加载用户失败:', error)
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.orgName = ''
  filterForm.role = ''
  filterForm.status = ''
  pagination.page = 1
  loadUsers()
}

// =============================================================================
// 创建/编辑用户
// =============================================================================
const showCreateDialog = () => {
  isEdit.value = false
  userForm.id = ''
  userForm.username = ''
  userForm.password = ''
  userForm.name = ''
  userForm.orgName = ''
  userForm.role = 'operator'
  dialogVisible.value = true
}

const showEditDialog = (user: User) => {
  isEdit.value = true
  userForm.id = user.id
  userForm.username = user.username
  userForm.password = ''
  userForm.name = user.name
  userForm.orgName = user.orgName
  userForm.role = user.role
  dialogVisible.value = true
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await authApi.updateUser(userForm.id, {
        name: userForm.name,
        role: userForm.role,
      })
      ElMessage.success('用户更新成功')
    } else {
      await authApi.register({
        username: userForm.username,
        password: userForm.password,
        name: userForm.name,
        orgName: userForm.orgName,
        role: userForm.role,
      })
      ElMessage.success('用户创建成功')
    }
    dialogVisible.value = false
    loadUsers()
  } catch (error) {
    console.error('操作失败:', error)
  } finally {
    submitting.value = false
  }
}

// =============================================================================
// 重置密码
// =============================================================================
const showResetPasswordDialog = (user: User) => {
  resetPasswordForm.id = user.id
  resetPasswordForm.username = user.username
  resetPasswordForm.newPassword = ''
  resetPasswordForm.confirmPassword = ''
  resetPasswordVisible.value = true
}

const handleResetPassword = async () => {
  const valid = await resetFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await authApi.resetPassword(resetPasswordForm.id, resetPasswordForm.newPassword)
    ElMessage.success('密码重置成功')
    resetPasswordVisible.value = false
  } catch (error) {
    console.error('重置密码失败:', error)
  } finally {
    submitting.value = false
  }
}

// =============================================================================
// 启用/禁用用户
// =============================================================================
const toggleStatus = async (user: User) => {
  const newStatus = user.status === 'active' ? 'disabled' : 'active'
  const action = newStatus === 'disabled' ? '禁用' : '启用'

  try {
    await ElMessageBox.confirm(`确定要${action}用户 "${user.name}" 吗？`, '确认', {
      type: 'warning',
    })

    await authApi.updateStatus(user.id, newStatus)
    ElMessage.success(`用户已${action}`)
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('操作失败:', error)
    }
  }
}

// =============================================================================
// 删除用户
// =============================================================================
const handleDelete = async (user: User) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${user.name}" 吗？此操作不可恢复。`, '确认删除', {
      type: 'error',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })

    await authApi.deleteUser(user.id)
    ElMessage.success('用户已删除')
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

// =============================================================================
// 生命周期
// =============================================================================
onMounted(() => {
  loadUsers()
})
</script>

<style scoped lang="scss">
.user-manage {
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
}
</style>
