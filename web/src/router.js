import { createRouter, createWebHistory } from "vue-router";
import MenusPage from "./pages/MenusPage.vue";
import PermissionsPage from "./pages/PermissionsPage.vue";
import RolesPage from "./pages/RolesPage.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/menus" },
    { path: "/menus", component: MenusPage, meta: { title: "菜单维护" } },
    { path: "/permissions", component: PermissionsPage, meta: { title: "权限点清单" } },
    { path: "/roles", component: RolesPage, meta: { title: "角色维护" } },
  ],
});
