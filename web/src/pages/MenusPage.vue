<template>
  <div class="page">
    <PageHeader title="菜单维护" description="维护菜单树（层级与排序），支持搜索定位与拖拽调整。">
      <el-button type="primary" @click="openCreate(null)">新增菜单</el-button>
      <el-button @click="refresh" :loading="loading">刷新</el-button>
    </PageHeader>

    <div class="toolbar">
      <el-input v-model="keyword" clearable placeholder="搜索 name / code / path" class="w-260" />
      <el-button @click="expandAll">展开</el-button>
      <el-button @click="collapseAll">折叠</el-button>
      <span class="muted">共 {{ rows.length }} 项</span>
    </div>

    <div
      class="tree-table-head"
      style="--col-2: 160px; --col-3: 220px; --col-4: 80px; --col-5: 90px; --col-actions: 240px"
    >
      <div>名称</div>
      <div>code</div>
      <div>path</div>
      <div>sort</div>
      <div>启用</div>
      <div style="text-align: right">操作</div>
    </div>

    <el-tree
      v-loading="loading"
      ref="treeRef"
      :data="treeData"
      node-key="id"
      :default-expand-all="false"
      :filter-node-method="filterNode"
      :indent="0"
      draggable
      :allow-drop="allowDrop"
      @node-drop="onNodeDrop"
      :props="{ label: 'name', children: 'children' }"
    >
      <template #default="{ node, data }">
        <div
          class="tree-table-row"
          style="--col-2: 160px; --col-3: 220px; --col-4: 80px; --col-5: 90px; --col-actions: 240px"
        >
          <div>
            <span :style="{ paddingLeft: `${(node.level - 1) * 16}px` }">{{ data.name }}</span>
          </div>
          <div class="muted">{{ data.code }}</div>
          <div class="muted">{{ data.path || "-" }}</div>
          <div class="muted">{{ data.sort ?? 0 }}</div>
          <div>
            <el-tag v-if="data.enabled" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </div>
          <div class="tree-table-actions">
            <el-button size="small" @click.stop="openCreate(data.id)">加子菜单</el-button>
            <el-button size="small" @click.stop="openEdit(data)">编辑</el-button>
            <el-popconfirm title="确认删除？(会级联删除子菜单)" @confirm="remove(data)">
              <template #reference>
                <el-button size="small" type="danger" @click.stop>删除</el-button>
              </template>
            </el-popconfirm>
          </div>
        </div>
      </template>
    </el-tree>

    <EditDialog v-model="dialogOpen" :title="dialogTitle" :model="form" :saving="saving" @save="save">
      <el-form-item label="父级ID">
        <el-tree-select
          v-model="form.parentId"
          clearable
          default-expand-all
          check-strictly
          :data="parentOptions"
          node-key="id"
          :props="{ label: 'name', children: 'children', value: 'id', disabled: 'disabled' }"
          placeholder="为空表示根菜单"
          style="width: 100%"
        />
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
import PageHeader from "../components/PageHeader.vue";
import { buildTree } from "../utils/tree.js";
import { useTreeSearch } from "../composables/useTreeSearch.js";
import { useDataChanged } from "../composables/useDataChanged.js";
import { delJson, getJson, postJson, putJson } from "../api.js";

const loading = ref(false);
const saving = ref(false);
const rows = ref([]);

const treeData = ref([]);
const treeRef = ref(null);
const { keyword, filterNode, expandAll, collapseAll } = useTreeSearch({
  treeRef,
  getAllKeys: () => rows.value.map((x) => x.id),
  filterNode: (value, data) => {
    if (!value) return true;
    const v = String(value).toLowerCase();
    return (
      String(data.name || "").toLowerCase().includes(v) ||
      String(data.code || "").toLowerCase().includes(v) ||
      String(data.path || "").toLowerCase().includes(v)
    );
  },
});

async function refresh() {
  loading.value = true;
  try {
    rows.value = await getJson("/api/menus");
    treeData.value = buildTree(rows.value);
    expandAll();
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

function collectDescendantIds(node) {
  const out = new Set();
  const walk = (n) => {
    if (!n?.children?.length) return;
    for (const c of n.children) {
      out.add(c.id);
      walk(c);
    }
  };
  walk(node);
  return out;
}

function findNodeById(nodes, id) {
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.pop();
    if (n.id === id) return n;
    if (n.children?.length) stack.push(...n.children);
  }
  return null;
}

const parentOptions = computed(() => {
  const nodes = treeData.value || [];
  if (!editingId.value) return nodes;
  const self = findNodeById(nodes, editingId.value);
  const disabled = new Set([editingId.value, ...(self ? [...collectDescendantIds(self)] : [])]);
  const clone = (arr) =>
    arr.map((n) => ({
      ...n,
      disabled: disabled.has(n.id),
      children: n.children?.length ? clone(n.children) : [],
    }));
  return clone(nodes);
});

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
      parentId: form.parentId ?? null,
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

function isDescendant(ancestor, targetId) {
  const stack = [...(ancestor.children || [])];
  while (stack.length) {
    const n = stack.pop();
    if (n.id === targetId) return true;
    if (n.children?.length) stack.push(...n.children);
  }
  return false;
}

function allowDrop(draggingNode, dropNode, type) {
  const drag = draggingNode?.data;
  const drop = dropNode?.data;
  if (!drag || !drop) return true;
  if (drag.id === drop.id) return false;
  if (type === "inner" && isDescendant(drag, drop.id)) return false;
  return true;
}

function getChildrenArrayByParentId(parentId) {
  if (parentId == null) return treeData.value;
  const p = findNodeById(treeData.value, parentId);
  return p?.children || [];
}

async function onNodeDrop(draggingNode, dropNode, dropType) {
  const drag = draggingNode?.data;
  const drop = dropNode?.data;
  if (!drag || !drop) return;

  const oldParentId = drag.parentId ?? null;
  const newParentId = dropType === "inner" ? drop.id : drop.parentId ?? null;

  try {
    if (newParentId !== oldParentId) {
      await putJson(`/api/menus/${drag.id}`, { parentId: newParentId });
      drag.parentId = newParentId;
    }

    const newSiblings = getChildrenArrayByParentId(newParentId);
    const newOrderedIds = newSiblings.map((n) => n.id);
    await putJson("/api/menus/reorder", { parentId: newParentId, orderedIds: newOrderedIds });

    if (oldParentId !== newParentId) {
      const oldSiblings = getChildrenArrayByParentId(oldParentId);
      const oldOrderedIds = oldSiblings.map((n) => n.id);
      await putJson("/api/menus/reorder", { parentId: oldParentId, orderedIds: oldOrderedIds });
    }

    await refresh();
    ElMessage.success("已更新层级/排序");
  } catch (e) {
    ElMessage.error(e?.message || "拖拽更新失败");
    await refresh();
  }
}

refresh();
useDataChanged(refresh);
</script>
