<template>
  <div class="toolbar" style="margin: 0">
    <el-button size="small" @click="onExport">导出 JSON</el-button>
    <el-upload
      :show-file-list="false"
      :auto-upload="false"
      accept=".json,application/json"
      :on-change="onFileChange"
    >
      <el-button size="small">导入 JSON</el-button>
    </el-upload>
  </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { http } from "../api.js";
import { emitDataChanged } from "../events.js";

async function onExport() {
  const base = http.defaults.baseURL || "";
  window.location.href = `${base}/api/export`;
}

async function onFileChange(file) {
  try {
    const form = new FormData();
    form.append("file", file.raw);
    const res = await http.post("/api/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    if (!res.data?.ok) throw new Error(res.data?.message || "Import failed");
    ElMessage.success("导入成功");
    emitDataChanged();
  } catch (e) {
    ElMessage.error(e?.message || "导入失败");
  }
}
</script>
