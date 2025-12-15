<template>
  <div class="app-shell">
    <aside class="app-aside">
      <div class="app-brand">
        <div class="app-brand__name">role-config</div>
        <div class="app-brand__meta">菜单 / 权限点 / 角色</div>
      </div>
      <el-menu class="app-menu" :default-active="$route.path" router>
        <el-menu-item index="/menus">菜单维护</el-menu-item>
        <el-menu-item index="/permissions">权限点清单</el-menu-item>
        <el-menu-item index="/roles">角色维护</el-menu-item>
      </el-menu>
    </aside>
    <main class="app-main">
      <header class="app-header">
        <div class="app-header__title">{{ $route.meta?.title || "role-config" }}</div>
        <div class="app-header__actions">
          <TransferButtons />
        </div>
      </header>
      <div class="app-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import TransferButtons from "./components/TransferButtons.vue";
</script>
