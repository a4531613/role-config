<template>
  <div class="page">
    <div class="toolbar">
      <el-button type="primary" @click="openCreate(null)">新增菜单</el-button>
      <el-button @click="refresh" :loading="loading">刷新</el-button>
      <span class="muted">提示：菜单支持父子层级（parentId）</span>
    </div>

    <el-tree
      v-loading="loading"
      :data="tree"
      node-key="id"
      default-expand-all
      :props="{ label: 'name', children: 'children' }"
    >
      <template #default="{ node, data }">
        <div style="display: flex; align-items: center; gap: 8px; width: 100%">
          <div style="flex: 1">
            <span>{{ data.name }}</span>
            <span class="muted" style="margin-left: 8px">({{ data.code }})</span>
          </div>
          <el-tag v-if="!data.enabled" type="info" size="small">禁用</el-tag>
          <el-button size="small" @click.stop="openCreate(data.id)">加子菜单</el-button>
          <el-button size="small" @click.stop="openEdit(data)">编辑</el-button>
          <el-popconfirm title="确认删除？(会级联删除子菜单)" @confirm="remove(data)">
            <template #reference>
              <el-button size="small" type="danger" @click.stop>删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </template>
    </el-tree>

    <EditDialog v-model="dialogOpen" :title="dialogTitle" :model="form" :saving="saving" @save="save">
      <el-form-item label="父级ID">
        <el-input v-model="form.parentId" placeholder="为空表示根菜单" />
      </el-form-item>
      <el-form-item label="名称">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="编码(code)">
        <el-input v-model="form.code" />
      </el-form-item>
      <el-form-item label="路径(path)">
        <el-input v-model="form.path" />
      </el-form-item>
      <el-form-item label="图标(icon)">
        <el-input v-model="form.icon" />
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
    rows.value = await getJson("/api/menus");
  } catch (e) {
    ElMessage.error(e?.message || "加载失败");
  } finally {
    loading.value = false;
  }
}

const dialogOpen = ref(false);
const editingId = ref(null);
const form = reactive({
  parentId: null,
  name: "",
  code: "",
  path: "",
  icon: "",
  sort: 0,
  enabled: 1,
});

const dialogTitle = computed(() => (editingId.value ? "编辑菜单" : "新增菜单"));

function openCreate(parentId) {
  editingId.value = null;
  Object.assign(form, {
    parentId: parentId ?? null,
    name: "",
    code: "",
    path: "",
    icon: "",
    sort: 0,
    enabled: 1,
  });
  dialogOpen.value = true;
}

function openEdit(row) {
  editingId.value = row.id;
  Object.assign(form, {
    parentId: row.parentId ?? null,
    name: row.name,
    code: row.code,
    path: row.path ?? "",
    icon: row.icon ?? "",
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
      name: form.name,
      code: form.code,
      path: form.path || null,
      icon: form.icon || null,
      sort: form.sort ?? 0,
      enabled: form.enabled ?? 1,
    };
    if (!payload.name || !payload.code) throw new Error("name/code 不能为空");
    if (editingId.value) await putJson(`/api/menus/${editingId.value}`, payload);
    else await postJson("/api/menus", payload);
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
    await delJson(`/api/menus/${row.id}`);
    await refresh();
    ElMessage.success("已删除");
  } catch (e) {
    ElMessage.error(e?.message || "删除失败");
  }
}

refresh();
</script>

