<template>
  <el-container style="height: 100%">
    <el-aside width="220px" style="border-right: 1px solid #eee">
      <div style="padding: 14px 12px; font-weight: 600">role-config</div>
      <el-menu :default-active="$route.path" router>
        <el-menu-item index="/menus">菜单维护</el-menu-item>
        <el-menu-item index="/permissions">权限点清单</el-menu-item>
        <el-menu-item index="/roles">角色维护</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header style="display: flex; align-items: center; justify-content: space-between">
        <div class="muted">Vue + SQLite</div>
        <TransferButtons />
      </el-header>
      <el-main style="padding: 0">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import TransferButtons from "./components/TransferButtons.vue";
</script>

