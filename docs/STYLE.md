# 样式体系（UI 工程化）

## 目标
- 统一设计语言：颜色/字体/间距/圆角/阴影以 Token 形式收敛
- 降低维护成本：消除内联样式与重复 CSS，形成可复用的布局与“树形表格”样式
- 保持克制：遵循企业后台的中性、稳定与可扩展

## 结构

- Token：`web/src/styles/tokens.css`
- Base：`web/src/styles/base.css`
- Layout：`web/src/styles/layout.css`
- Components：`web/src/styles/components.css`
- Utilities：`web/src/styles/utilities.css`
- 聚合入口：`web/src/styles.css`

## 规范

### 1) Token 优先
- 颜色/间距/尺寸尽量使用 CSS 变量（如 `var(--sp-3)`、`var(--color-border)`）

### 2) 页面布局一致
- 页面统一使用 `.page`
- 标题区统一使用 `PageHeader`（`web/src/components/PageHeader.vue`）
- 操作区统一使用 `.toolbar`

### 3) 树形“表格化”展示
- 使用 `.tree-table-head` / `.tree-table-row` 让树形数据具备可扫描的列对齐
- 缩进仅作用在“名称列”，其它列不缩进（降低扫读成本）
- 列宽通过 CSS 变量调整：`--col-2/--col-3/.../--col-actions`

