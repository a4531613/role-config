<template>
  <div class="page">
    <PageHeader
      title="权限点清单"
      description="维护权限点清单：class（资源/类）→ method（动作/接口）。method 必须挂在 class 下。"
    >
      <el-button type="primary" @click="openCreateClass">新增类级权限点</el-button>
      <el-button @click="refresh" :loading="loading">刷新</el-button>
    </PageHeader>

    <div class="toolbar">
      <el-input v-model="keyword" clearable placeholder="搜索 name / code / description" style="width: 280px" />
      <el-button @click="expandAll">展开</el-button>
      <el-button @click="collapseAll">折叠</el-button>
      <span class="muted">共 {{ rows.length }} 项</span>
    </div>

    <div
      class="tree-table-head is-8"
      style="--col-2: 90px; --col-3: 180px; --col-4: 220px; --col-5: 80px; --col-6: 90px; --col-7: 90px; --col-actions: 240px"
    >
      <div>名称</div>
      <div>level</div>
      <div>code</div>
      <div>path</div>
      <div>描述</div>
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
      :props="{ label: 'name', children: 'children' }"
    >
      <template #default="{ node, data }">
        <div
          class="tree-table-row is-8"
          style="--col-2: 90px; --col-3: 180px; --col-4: 220px; --col-5: 80px; --col-6: 90px; --col-7: 90px; --col-actions: 240px"
        >
          <div>
            <span :style="{ paddingLeft: `${(node.level - 1) * 16}px` }">{{ data.name }}</span>
          </div>
          <div>
            <el-tag v-if="data.level === 'class'" size="small">class</el-tag>
            <el-tag v-else type="success" size="small">method</el-tag>
          </div>
          <div class="muted">{{ data.code }}</div>
          <div class="muted">{{ data.path || "-" }}</div>
          <div class="muted">{{ data.description || "-" }}</div>
          <div class="muted">{{ data.sort ?? 0 }}</div>
          <div>
            <el-tag v-if="data.enabled" size="small">是</el-tag>
            <el-tag v-else type="info" size="small">否</el-tag>
          </div>
          <div class="tree-table-actions">
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
      <el-form-item label="父级(class)">
        <el-tree-select
          v-model="form.parentId"
          clearable
          default-expand-all
          check-strictly
          :disabled="form.level !== 'method'"
          :data="classOptions"
          node-key="id"
          :props="{ label: 'name', children: 'children', value: 'id' }"
          placeholder="method 才需要，选择 class 权限点"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="path(方法)">
        <el-input v-model="form.path" :disabled="form.level !== 'method'" placeholder="/api/users/list" />
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
import { computed, reactive, ref, watch } from "vue";
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
      String(data.description || "").toLowerCase().includes(v)
    );
  },
});

const classOptions = computed(() => buildTree(rows.value.filter((r) => r.level === "class")));

async function refresh() {
  loading.value = true;
  try {
    rows.value = await getJson("/api/permissions");
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
const originalLevel = ref(null);
const form = reactive({
  parentId: null,
  level: "class",
  name: "",
  code: "",
  path: "",
  description: "",
  sort: 0,
  enabled: 1,
});

const dialogTitle = computed(() => (editingId.value ? "编辑权限点" : "新增权限点"));

watch(
  () => form.level,
  (lvl) => {
    if (lvl === "class") {
      form.parentId = null;
      form.path = "";
    }
  }
);

function openCreateClass() {
  editingId.value = null;
  originalLevel.value = null;
  Object.assign(form, {
    parentId: null,
    level: "class",
    name: "",
    code: "",
    path: "",
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
    path: "",
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
    path: row.path ?? "",
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
      parentId: form.parentId ?? null,
      level: form.level,
      name: form.name,
      code: form.code,
      path: form.level === "method" ? form.path || null : null,
      description: form.description || null,
      sort: form.sort ?? 0,
      enabled: form.enabled ?? 1,
    };
    if (!payload.name || !payload.code) throw new Error("name/code 不能为空");
    if (payload.level === "method" && !payload.parentId) throw new Error("method 必须选择父级 class");
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
useDataChanged(refresh);
</script>
