<template>
  <div class="page">
    <el-row :gutter="12">
      <el-col :span="9">
        <div class="toolbar">
          <el-button type="primary" @click="openCreateRole">新增角色</el-button>
          <el-button @click="refreshAll" :loading="loading">刷新</el-button>
          <el-switch
            v-model="bulkMode"
            inline-prompt
            active-text="批量"
            inactive-text="单个"
          />
          <span v-if="bulkMode" class="muted">已选 {{ selectedRoleIds.length }} 个角色</span>
        </div>

        <el-table
          v-loading="loading"
          :data="roles"
          row-key="id"
          highlight-current-row
          @current-change="selectRole"
          @selection-change="onSelectionChange"
        >
          <el-table-column v-if="bulkMode" type="selection" width="48" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="code" label="code" width="140" />
          <el-table-column label="启用" width="70">
            <template #default="{ row }">
              <el-tag v-if="row.enabled" size="small">是</el-tag>
              <el-tag v-else type="info" size="small">否</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="{ row }">
              <el-button size="small" @click.stop="openEditRole(row)">编辑</el-button>
              <el-popconfirm title="确认删除？(会删除绑定关系)" @confirm="removeRole(row)">
                <template #reference>
                  <el-button size="small" type="danger" @click.stop>删</el-button>
                </template>
              </el-popconfirm>
            </template>
          </el-table-column>
        </el-table>
      </el-col>

      <el-col :span="15">
        <el-alert
          v-if="!bulkMode && !currentRole"
          title="请选择左侧角色后配置菜单/权限点绑定"
          type="info"
          show-icon
        />

        <el-alert
          v-else-if="bulkMode && selectedRoleIds.length === 0"
          title="批量模式：先在左侧勾选多个角色"
          type="info"
          show-icon
        />

        <template v-else>
          <div class="toolbar">
            <div style="font-weight: 600">
              <template v-if="!bulkMode">
                当前角色：{{ currentRole.name }}
                <span class="muted">({{ currentRole.code }})</span>
              </template>
              <template v-else>批量操作（{{ selectedRoleIds.length }} 个角色）</template>
            </div>
            <div style="flex: 1"></div>
            <el-button
              v-if="!bulkMode"
              :loading="saving"
              type="primary"
              @click="saveBindings"
            >
              保存绑定
            </el-button>
          </div>

          <el-tabs v-model="activeTab">
            <el-tab-pane label="角色-菜单" name="menus">
              <div class="toolbar" style="margin-top: 0">
                <el-input
                  v-model="menuKeyword"
                  clearable
                  placeholder="搜索菜单 name / code"
                  style="width: 260px"
                />
                <el-button @click="expandAllMenus">展开</el-button>
                <el-button @click="collapseAllMenus">折叠</el-button>
                <span class="muted">已勾选 {{ checkedMenuCount }} 项</span>
                <template v-if="bulkMode">
                  <el-button
                    :disabled="selectedRoleIds.length === 0 || checkedMenuCount === 0"
                    :loading="bulkSaving"
                    type="primary"
                    @click="bulkBindMenus"
                  >
                    批量绑定
                  </el-button>
                  <el-button
                    :disabled="selectedRoleIds.length === 0 || checkedMenuCount === 0"
                    :loading="bulkSaving"
                    type="danger"
                    @click="bulkUnbindMenus"
                  >
                    批量解绑
                  </el-button>
                </template>
              </div>
              <el-tree
                v-loading="loading"
                ref="menuTreeRef"
                :data="menuTree"
                node-key="id"
                show-checkbox
                default-expand-all
                :filter-node-method="filterMenuNode"
                :props="{ label: 'name', children: 'children' }"
              >
                <template #default="{ data }">
                  <span>{{ data.name }}</span>
                  <span class="muted" style="margin-left: 8px">({{ data.code }})</span>
                </template>
              </el-tree>
            </el-tab-pane>

            <el-tab-pane label="角色-权限点" name="permissions">
              <div class="toolbar" style="margin-top: 0">
                <el-input
                  v-model="permKeyword"
                  clearable
                  placeholder="搜索权限点 name / code"
                  style="width: 260px"
                />
                <el-button @click="expandAllPerms">展开</el-button>
                <el-button @click="collapseAllPerms">折叠</el-button>
                <span class="muted">已勾选 {{ checkedPermCount }} 项</span>
                <template v-if="bulkMode">
                  <el-button
                    :disabled="selectedRoleIds.length === 0 || checkedPermCount === 0"
                    :loading="bulkSaving"
                    type="primary"
                    @click="bulkBindPerms"
                  >
                    批量绑定
                  </el-button>
                  <el-button
                    :disabled="selectedRoleIds.length === 0 || checkedPermCount === 0"
                    :loading="bulkSaving"
                    type="danger"
                    @click="bulkUnbindPerms"
                  >
                    批量解绑
                  </el-button>
                </template>
              </div>
              <el-tree
                v-loading="loading"
                ref="permTreeRef"
                :data="permTree"
                node-key="id"
                show-checkbox
                default-expand-all
                :filter-node-method="filterPermNode"
                :props="{ label: 'name', children: 'children' }"
              >
                <template #default="{ data }">
                  <span>{{ data.name }}</span>
                  <span class="muted" style="margin-left: 8px">({{ data.level }} / {{ data.code }})</span>
                </template>
              </el-tree>
            </el-tab-pane>
          </el-tabs>
        </template>
      </el-col>
    </el-row>

    <EditDialog
      v-model="dialogOpen"
      :title="dialogTitle"
      :model="roleForm"
      :saving="savingRole"
      @save="saveRole"
    >
      <el-form-item label="名称">
        <el-input v-model="roleForm.name" />
      </el-form-item>
      <el-form-item label="编码(code)">
        <el-input v-model="roleForm.code" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="roleForm.description" type="textarea" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="roleForm.enabled" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </EditDialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import EditDialog from "../components/EditDialog.vue";
import { buildTree } from "../utils/tree.js";
import { delJson, getJson, postJson, putJson } from "../api.js";

const loading = ref(false);
const saving = ref(false);
const bulkSaving = ref(false);

const roles = ref([]);
const menus = ref([]);
const permissions = ref([]);

const menuTree = computed(() => buildTree(menus.value));
const permTree = computed(() => buildTree(permissions.value));

const currentRole = ref(null);
const activeTab = ref("menus");

const menuTreeRef = ref(null);
const permTreeRef = ref(null);

const bulkMode = ref(false);
const selectedRoleIds = ref([]);

const menuKeyword = ref("");
const permKeyword = ref("");

function filterMenuNode(value, data) {
  if (!value) return true;
  const v = String(value).toLowerCase();
  return (
    String(data.name || "").toLowerCase().includes(v) ||
    String(data.code || "").toLowerCase().includes(v)
  );
}

function filterPermNode(value, data) {
  if (!value) return true;
  const v = String(value).toLowerCase();
  return (
    String(data.name || "").toLowerCase().includes(v) ||
    String(data.code || "").toLowerCase().includes(v)
  );
}

watch(menuKeyword, (v) => {
  menuTreeRef.value?.filter?.(v);
});

watch(permKeyword, (v) => {
  permTreeRef.value?.filter?.(v);
});

function expandAllMenus() {
  menuTreeRef.value?.setExpandedKeys?.(menus.value.map((x) => x.id));
}

function collapseAllMenus() {
  menuTreeRef.value?.setExpandedKeys?.([]);
}

function expandAllPerms() {
  permTreeRef.value?.setExpandedKeys?.(permissions.value.map((x) => x.id));
}

function collapseAllPerms() {
  permTreeRef.value?.setExpandedKeys?.([]);
}

const checkedMenuCount = computed(() => (menuTreeRef.value?.getCheckedKeys(false) || []).length);
const checkedPermCount = computed(() => (permTreeRef.value?.getCheckedKeys(false) || []).length);

function onSelectionChange(selection) {
  selectedRoleIds.value = (selection || []).map((r) => r.id);
}

watch(bulkMode, (on) => {
  if (on) {
    currentRole.value = null;
    menuTreeRef.value?.setCheckedKeys?.([], false);
    permTreeRef.value?.setCheckedKeys?.([], false);
  } else {
    selectedRoleIds.value = [];
  }
});

async function refreshAll() {
  loading.value = true;
  try {
    const [r, m, p] = await Promise.all([
      getJson("/api/roles"),
      getJson("/api/menus"),
      getJson("/api/permissions"),
    ]);
    roles.value = r;
    menus.value = m;
    permissions.value = p;
    if (currentRole.value) {
      const still = roles.value.find((x) => x.id === currentRole.value.id);
      currentRole.value = still || null;
    }
    if (currentRole.value) await loadRoleBindings(currentRole.value.id);
    expandAllMenus();
    expandAllPerms();
  } catch (e) {
    ElMessage.error(e?.message || "加载失败");
  } finally {
    loading.value = false;
  }
}

async function loadRoleBindings(roleId) {
  const [menuIds, permissionIds] = await Promise.all([
    getJson(`/api/roles/${roleId}/menus`),
    getJson(`/api/roles/${roleId}/permissions`),
  ]);
  menuTreeRef.value?.setCheckedKeys(menuIds, false);
  permTreeRef.value?.setCheckedKeys(permissionIds, false);
}

async function selectRole(row) {
  if (bulkMode.value) return;
  currentRole.value = row || null;
  if (!currentRole.value) return;
  loading.value = true;
  try {
    await loadRoleBindings(currentRole.value.id);
  } catch (e) {
    ElMessage.error(e?.message || "加载绑定失败");
  } finally {
    loading.value = false;
  }
}

async function saveBindings() {
  if (!currentRole.value) return;
  saving.value = true;
  try {
    const roleId = currentRole.value.id;
    const menuIds = menuTreeRef.value?.getCheckedKeys(false) || [];
    const permissionIds = permTreeRef.value?.getCheckedKeys(false) || [];
    await Promise.all([
      putJson(`/api/roles/${roleId}/menus`, { menuIds }),
      putJson(`/api/roles/${roleId}/permissions`, { permissionIds }),
    ]);
    ElMessage.success("绑定已保存");
  } catch (e) {
    ElMessage.error(e?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function bulkApplyMenus(action) {
  if (selectedRoleIds.value.length === 0) return;
  const menuIds = menuTreeRef.value?.getCheckedKeys(false) || [];
  if (menuIds.length === 0) return;
  bulkSaving.value = true;
  try {
    const res = await postJson("/api/roles/bulk/menus", { roleIds: selectedRoleIds.value, menuIds, action });
    ElMessage.success(action === "bind" ? `已批量绑定（新增 ${res.inserted}）` : `已批量解绑（删除 ${res.deleted}）`);
  } catch (e) {
    ElMessage.error(e?.message || "批量操作失败");
  } finally {
    bulkSaving.value = false;
  }
}

async function bulkApplyPerms(action) {
  if (selectedRoleIds.value.length === 0) return;
  const permissionIds = permTreeRef.value?.getCheckedKeys(false) || [];
  if (permissionIds.length === 0) return;
  bulkSaving.value = true;
  try {
    const res = await postJson("/api/roles/bulk/permissions", {
      roleIds: selectedRoleIds.value,
      permissionIds,
      action,
    });
    ElMessage.success(action === "bind" ? `已批量绑定（新增 ${res.inserted}）` : `已批量解绑（删除 ${res.deleted}）`);
  } catch (e) {
    ElMessage.error(e?.message || "批量操作失败");
  } finally {
    bulkSaving.value = false;
  }
}

const bulkBindMenus = () => bulkApplyMenus("bind");
const bulkUnbindMenus = () => bulkApplyMenus("unbind");
const bulkBindPerms = () => bulkApplyPerms("bind");
const bulkUnbindPerms = () => bulkApplyPerms("unbind");

const dialogOpen = ref(false);
const roleEditingId = ref(null);
const savingRole = ref(false);
const roleForm = reactive({
  name: "",
  code: "",
  description: "",
  enabled: 1,
});
const dialogTitle = computed(() => (roleEditingId.value ? "编辑角色" : "新增角色"));

function openCreateRole() {
  roleEditingId.value = null;
  Object.assign(roleForm, { name: "", code: "", description: "", enabled: 1 });
  dialogOpen.value = true;
}

function openEditRole(role) {
  roleEditingId.value = role.id;
  Object.assign(roleForm, {
    name: role.name,
    code: role.code,
    description: role.description ?? "",
    enabled: role.enabled ?? 1,
  });
  dialogOpen.value = true;
}

async function saveRole() {
  savingRole.value = true;
  try {
    if (!roleForm.name || !roleForm.code) throw new Error("name/code 不能为空");
    const payload = {
      name: roleForm.name,
      code: roleForm.code,
      description: roleForm.description || null,
      enabled: roleForm.enabled ?? 1,
    };
    if (roleEditingId.value) await putJson(`/api/roles/${roleEditingId.value}`, payload);
    else await postJson("/api/roles", payload);
    dialogOpen.value = false;
    await refreshAll();
    ElMessage.success("保存成功");
  } catch (e) {
    ElMessage.error(e?.message || "保存失败");
  } finally {
    savingRole.value = false;
  }
}

async function removeRole(role) {
  try {
    await delJson(`/api/roles/${role.id}`);
    if (currentRole.value?.id === role.id) currentRole.value = null;
    await refreshAll();
    ElMessage.success("已删除");
  } catch (e) {
    ElMessage.error(e?.message || "删除失败");
  }
}

refreshAll();
</script>
