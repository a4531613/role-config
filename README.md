# role-config (Vue + SQLite)

菜单/权限点/角色配置系统：

- 菜单维护：树形结构 CRUD（支持拖拽调整层级/排序）
- 权限点清单：两层（类级 `class`、方法级 `method`）CRUD
- 角色维护：角色 CRUD
- 绑定关系维护：角色-菜单、角色-权限点
- 导入/导出：JSON（含父子关系与绑定关系）

## 开发启动

1. 安装依赖：`npm install`
2. 启动前后端：`npm run dev`

默认：

- 后端：`http://localhost:3001`
- 前端：`http://localhost:5173`

## 数据库

SQLite 文件默认在 `server/data/app.db`（首次启动自动建表）。

可选环境变量：

- 后端：`PORT`（默认 `3001`）、`DB_PATH`（默认 `server/data/app.db`）
- 前端：`VITE_API_BASE`（默认空字符串，开发态通过 Vite proxy 走 `/api`）

## 导入/导出

- 导出：`GET /api/export`（下载 JSON 文件）
- 导入：`POST /api/import`（`multipart/form-data`，字段名 `file`）

导入 JSON 结构（导出文件同结构）：

- `menus[]`：`{ code, parentCode?, name, path?, icon?, sort?, enabled? }`
- `permissions[]`：`{ code, parentCode?, level: 'class'|'method', name, description?, sort?, enabled? }`
- `roles[]`：`{ code, name, description?, enabled? }`
- `roleMenus[]`：`{ roleCode, menuCode }`
- `rolePermissions[]`：`{ roleCode, permissionCode }`
