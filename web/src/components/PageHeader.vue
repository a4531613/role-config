<template>
  <div class="page-header">
    <div class="page-header__main">
      <div class="page-header__title">{{ title }}</div>
      <div v-if="description" class="page-header__desc">{{ description }}</div>
    </div>
    <div class="page-header__actions">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  description: { type: String, default: "" },
});
</script>

