# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

基于 AntV L7VP（LocationInsight）改造的地理可视化平台，面向内网/政务部署。两个关键组成：

- **`website/`** — React + UMI 4 前端（`@antv/li-website`），即产品本体：项目管理、地图编辑器(Builder)、纯地图嵌入页(Share)、预览页。
- **`java-server/`** — Spring Boot 2.7 (Java 8) 后端，端口 3001，达梦 DM8 存储（schema `DIG_GEO`），替代早期 Node.js 方案（`archive/legacy-node-server` 已废弃清理）。

当前活跃分支 `feat/function-quanxianrenzheng`。最近的工作重点是：中台数据集成、SSO 单点登录、数据资源两级选择（库列表 + 表列表）、DE-L7 跨项目联动。

## 常用命令

### 后端（java-server/）

```bash
cd java-server
mvn spring-boot:run        # 启动，监听 3001
mvn test                   # 运行全部测试（JUnit）
mvn test -Dtest=DatasetServiceTest    # 运行单个测试类
mvn clean package          # 打包 jar
```

### 前端（website/）

```bash
# 从仓库根目录（推荐，走 lerna workspace）
yarn run start:website     # UMI dev，默认 8000，/api 代理到 3001
yarn run start:editor      # 编辑器资产研发（@antv/li-editor）

# 或直接进目录
cd website && npm run dev
cd website && npm run build
```

### Monorepo 根脚本

```bash
yarn run start:sdk | start:core-assets | start:analysis-assets   # 各资产包 dev
npm run lint              # eslint + stylelint
npm run lint-fix
npm run build:website     # 构建站点
```

根依赖用 `yarn add -W`，子包依赖用 `yarn workspace <pkg> add <pkg>`。

## 架构

### 前后端通信

前端所有 API 走相对路径 `/api`（见 `website/src/services/`，原生 `fetch`，无 axios 封装）。UMI dev 代理 `/api`、`/thumbnails` → `http://localhost:3001`（`website/config/config.ts`）。构建产物部署时由 nginx 转发。

### 后端分层（java-server，包 `com.antv.l7vp`）

`controller` → `service` → `repository`（JdbcTemplate 直接拼 SQL，非 MyBatis/JPA），`model` 为实体，`dto` 为请求/响应。核心接口：

- `/api/auth/*` — SSO OAuth2 认证（Authorization Code + password grant 兜底），`UserSession` 存 HttpSession，各接口从 `AuthController.getSession(request)` 取登录态，未登录返回 401。
- `/api/zhongtai/*` — 中台数据代理（`ZhongtaiApiController`）：库列表、数据资源列表、资源预览/全量查询。携带当前用户的 `Authorization: Bearer <token>`、`orgId`、`spaceId`、`scopeType` 请求中台，用 `connect/info` 拿连接信息后通过 JDBC 直连查 MySQL/Doris 表数据。
- `/api/projects|datasets|layers|tile-configs|icons|db-connections|thumbnails` — 本地业务资源。

### 数据库（达梦 DM8，schema `DIG_GEO`）

9 张表（`java-server/src/main/resources/schema.sql`）：PROJECTS、DATASETS、DATASET_COLUMNS、DATASET_ROWS、LAYERS、WIDGETS、TILE_CONFIG、ICON_CATEGORIES、ICONS。项目/数据集/图层是自建的核心业务表；数据集数据行存 `DATASET_ROWS.ROW_DATA`（JSON 数组，按下标对应列）。

### 前端页面（website/src/pages）

- `/project` — 项目管理主页（含数据资源两级选择：库列表 → 表列表）
- `/builder/:id` — 地图编辑器
- `/app/:id`、`/template/:id` — 预览页
- `/share/:id` — 纯地图嵌入页，**DE-L7 联动入口**：监听 `window.postMessage`（`highlight` / `highlightLines` / `filter` / `clearHighlight` / `reset`），用 `de_highlight_*` 前缀的 dataset/layer 动态加点/线高亮（见 `Share/index.tsx`）。
- `/asset-market` — 资产市场

运行时配置：`website/public/config.js` 写入 `window.L7VP_CONFIG`（底图、`zhongtaiBaseUrl` 等），部署时改该文件即可，无需重新构建。

### DE-L7 跨项目联动

DataEase 大屏以 iframe 嵌入 `/share/:id` 页面，通过 postMessage 通信。完整方案见 `doc/L7_DE_LINKAGE_PLAN.md`、`doc/DE_L7_INTEGRATION.md`。所有联动相关代码注释带 `L7_INTEGRATION:` 标记。

## 关键约定与注意

- **达梦 JDBC 驱动是 system-scope 本地依赖**：`java-server/pom.xml` 里 `DmJdbcDriver18.jar` 的 `<systemPath>` 是本机路径，提交时不要带上机器相关改动；部署环境需换成对应路径。
- **schema 不自动建表**：`spring.sql.init.mode=never`，需在达梦中手动执行 `schema.sql`。
- **达梦 schema 切换**：`application.properties` 用 `spring.datasource.hikari.connection-init-sql=SET SCHEMA DIG_GEO`，否则未加前缀的表名会报「无效的表或视图名」。
- **后端配置优先用环境变量覆盖**（部署不改代码）：`ZHONGTAI_BASE_URL`、`APP_FRONTEND_URL`、`ZHONGTAI_CLIENT_ID/SECRET`、`ZHONGTAI_SPACE_ID`（中台空间 ID 现在由前端从 URL 动态读取传给后端，配置值是兜底）。详见 `java-server/src/main/resources/application.properties` 顶部注释。
- **中台数据预览/查询是 JDBC 直连**，`resourceName` 是物理表名（非显示名），不可把 `resourceName`（可能为中文显示名）当 SQL 表名用。
- 前端 `OFFLINE_MODE=true`（`website/config/config.ts`）：禁用外部 CDN 与统计脚本，`history` 为 hash 模式。
- 部署流程见 `DEPLOY.md`（Docker 双容器：前端 nginx + 后端 Java，内外网隔离）。

## 文档

- `doc/DE_L7_INTEGRATION.md`、`doc/L7_DE_LINKAGE_PLAN.md` — DE-L7 联动实现与方案
- `java-server/README.md` — 后端部署与 API 说明
- `DEPLOY.md` — Docker 部署指南
- `DEVELOPMENT.md` — 各资产包开发说明
