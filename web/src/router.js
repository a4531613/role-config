import { createRouter, createWebHistory } from "vue-router";
import MenusPage from "./pages/MenusPage.vue";
import PermissionsPage from "./pages/PermissionsPage.vue";
import RolesPage from "./pages/RolesPage.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/menus" },
    { path: "/menus", component: MenusPage },
    { path: "/permissions", component: PermissionsPage },
    { path: "/roles", component: RolesPage },
  ],
});

