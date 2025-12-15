<template>
  <div class="page">
    <div class="toolbar">
      <el-button type="primary" @click="openCreateClass">新增类级权限点</el-button>
      <el-button @click="refresh" :loading="loading">刷新</el-button>
      <span class="muted">方法级权限点需选择 parentId 指向类级权限点</span>
    </div>

    <el-tree
      v-loading="loading"
      :data="tree"
      node-key="id"
      default-expand-all
      :props="{ label: 'name', children: 'children' }"
    >
      <template #default="{ data }">
        <div style="display: flex; align-items: center; gap: 8px; width: 100%">
          <div style="flex: 1">
            <span>{{ data.name }}</span>
            <span class="muted" style="margin-left: 8px">({{ data.level }} / {{ data.code }})</span>
          </div>
          <el-tag v-if="!data.enabled" type="info" size="small">禁用</el-tag>
          <el-button
            v-if="data.level === 'class'"
            size="small"
            @click.stop="openCreateMethod(data.id)"
          >
            加方法
          </el-button>
          <el-button size="small" @click.stop="openEdit(data)">编辑</el-button>
          <el-popconfirm title="确认删除？(会级联删除子方法)" @confirm="remove(data)">
            <template #reference>
              <el-button size="small" type="danger" @click.stop>删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </template>
    </el-tree>

    <EditDialog
      v-model="dialogOpen"
      :title="dialogTitle"
      :model="form"
      :saving="saving"
      @save="save"
    >
      <el-form-item label="层级(level)">
        <el-select v-model="form.level" :disabled="editingId && originalLevel">
          <el-option label="class" value="class" />
          <el-option label="method" value="method" />
        </el-select>
      </el-form-item>
      <el-form-item label="父级ID">
        <el-input v-model="form.parentId" placeholder="method 才需要，指向 class 的 id" />
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="编码(code)">
        <el-input v-model="form.code" />
      </el-form-item>
      <el-form-item label="描述">
        <el-input v-model="form.description" type="textarea" />
      </el-form-item>
      <el-form-item label="排序(sort)">
        <el-input-number v-model="form.sort" :min="0" />
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
      </el-form-item>
    </EditDialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import EditDialog from "../components/EditDialog.vue";
import { buildTree } from "../utils/tree.js";
import { delJson, getJson, postJson, putJson } from "../api.js";

const loading = ref(false);
const saving = ref(false);
const rows = ref([]);

const tree = computed(() => buildTree(rows.value));

async function refresh() {
  loading.value = true;
  try {
    rows.value = await getJson("/api/permissions");
  } catch (e) {
    ElMessage.error(e?.message || "加载失败");
  } finally {
    loading.value = false;
  }
}

const dialogOpen = ref(false);
const editingId = ref(null);
const originalLevel = ref(null);
const form = reactive({
  parentId: null,
  level: "class",
  name: "",
  code: "",
  description: "",
  sort: 0,
  enabled: 1,
});

const dialogTitle = computed(() => (editingId.value ? "编辑权限点" : "新增权限点"));

function openCreateClass() {
  editingId.value = null;
  originalLevel.value = null;
  Object.assign(form, {
    parentId: null,
    level: "class",
    name: "",
    code: "",
    description: "",
    sort: 0,
    enabled: 1,
  });
  dialogOpen.value = true;
}

function openCreateMethod(classId) {
  editingId.value = null;
  originalLevel.value = null;
  Object.assign(form, {
    parentId: classId,
    level: "method",
    name: "",
    code: "",
    description: "",
    sort: 0,
    enabled: 1,
  });
  dialogOpen.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  originalLevel.value = row.level;
  Object.assign(form, {
    parentId: row.parentId ?? null,
    level: row.level,
    name: row.name,
    code: row.code,
    description: row.description ?? "",
    sort: row.sort ?? 0,
    enabled: row.enabled ?? 1,
  });
  dialogOpen.value = true;
}

async function save() {
  saving.value = true;
  try {
    const payload = {
      parentId: form.parentId === "" ? null : form.parentId,
      level: form.level,
      name: form.name,
      code: form.code,
      description: form.description || null,
      sort: form.sort ?? 0,
      enabled: form.enabled ?? 1,
    };
    if (!payload.name || !payload.code) throw new Error("name/code 不能为空");
    if (payload.level === "method" && !payload.parentId) throw new Error("method 必须填 parentId");
    if (payload.level === "class") payload.parentId = null;
    if (editingId.value) await putJson(`/api/permissions/${editingId.value}`, payload);
    else await postJson("/api/permissions", payload);
    dialogOpen.value = false;
    await refresh();
    ElMessage.success("保存成功");
  } catch (e) {
    ElMessage.error(e?.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function remove(row) {
  try {
    await delJson(`/api/permissions/${row.id}`);
    await refresh();
    ElMessage.success("已删除");
  } catch (e) {
    ElMessage.error(e?.message || "删除失败");
  }
}

refresh();
</script>

