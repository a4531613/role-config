<template>
  <el-dialog v-model="open" :title="title" width="520px" destroy-on-close>
    <el-form :model="model" label-width="96px">
      <slot />
    </el-form>
    <template #footer>
      <el-button @click="open = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="$emit('save')">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  model: { type: Object, required: true },
  saving: { type: Boolean, default: false },
});
const open = defineModel({ type: Boolean });
defineEmits(["save"]);
</script>

