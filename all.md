# 智慧图书馆系统实现总览

本文档以当前仓库代码为准，更新时间基于本次核对结果：`2026-03-08`。

适用范围：

- Web 前端：`front_library/`
- Android 客户端：`front-android/`
- 微信小程序：`miniapp/`
- 后端：`backend-library/`
- 根目录协作约定：`AGENTS.md`

如果历史记录、旧联调备注或演示文案与本文冲突，以当前代码行为为准。

## 1. 项目是什么

这是一个完整的图书馆管理系统，不是只展示页面的 Demo。系统分成两条主线：

- 读者侧：登录注册、馆藏检索、图书详情、借阅、预约、收藏、评论、罚款、通知、反馈、个人中心
- 管理侧：统计看板、图书、副本、借阅、预约、罚款、评论审核、用户、反馈、作者、分类、出版社、RBAC

## 2. 仓库结构

| 目录 | 作用 |
| --- | --- |
| `front_library/` | Next.js Pages Router 前端，读者端和后台端都在这里 |
| `front-android/` | Expo + React Native Android 客户端，读者侧移动端 |
| `miniapp/` | 当前在用的微信小程序读者端，已切真实后端接口 |
| `backend-library/` | Spring Boot 后端，控制器、业务、仓储、权限与定时任务都在这里 |
| `docs/` | 补充业务规则文档 |
| `all.md` | 当前仓库的实现总览 |
| `front.md` | 前端实现与维护说明 |
| `AGENTS.md` | 仓库协作规则 |

## 3. 当前实现结论

### 3.1 读者侧

已接通的主链路：

- 认证：登录、注册、找回密码、重置密码、恢复登录态
- 首页与目录：首页聚合、馆藏目录、图书详情
- 搜索体验：目录页支持真实搜索结果、联想词、热门搜索、登录用户最近搜索
- 图书动作：借阅、预约、收藏、评论、线上资源访问
- 个人中心：总览、书架、预约、罚款、通知、反馈、个人资料、搜索历史
- 通知中心：单条已读、全部已读、单条删除、清空已读、深链跳转、未读数联动

当前明确的产品规则：

- 读者借阅跟踪页只保留自助动作 `续借 / 归还`
- 图书遗失登记由馆员或具备 `loan:manage` 权限的后台人员处理
- 通知深链优先依赖后端写入的 `targetType / targetId / routeHint / businessKey`

### 3.2 管理侧

已接通的后台能力：

- 仪表盘：核心统计、借还趋势、预约与罚款分布、近期借阅
- 图书管理：分页、搜索、详情、新增、编辑、删除
- 在线资源管理：图书创建/编辑表单已支持 `resourceMode`、`onlineAccessUrl`、`onlineAccessType`
- 馆藏副本：新增、编辑、删除、状态维护
- 借阅管理：列表、状态筛选、确认还书、标记遗失
- 预约管理：分页、状态筛选、关键词搜索、履约、取消
- 罚款管理：列表、状态筛选、待缴总额、豁免
- 评论审核：待审核、已通过、已驳回列表与审核操作
- 用户管理：分页、筛选、详情、封禁/解封
- 反馈管理：查看、回复、处理状态更新
- 元数据管理：作者、分类、出版社 CRUD
- RBAC：角色、权限、用户角色分配、批量操作、审计日志、CSV 导出

### 3.3 移动端与小程序

- `front-android/` 已接入登录、首页、馆藏、图书详情、我的，以及预约/通知/罚款/推荐/座位预约等读者能力
- `miniapp/` 当前已切到真实后端接口，首页、馆藏、图书详情、书架、预约、罚款、通知、反馈、推荐、服务预约都走真实 API
- 仓库根目录的微信开发者工具配置已经显式指向 `miniapp/`

## 4. 前后端当前对齐情况

### 4.1 已经对齐的关键能力

- 通知删除与清理：前端页面和后端 `DELETE /api/notifications/{id}`、`DELETE /api/notifications/read` 已对齐
- 图书在线资源字段：后台图书表单、前端详情页、后端 DTO/实体/服务层已对齐
- 搜索发现：`/books` 已接入 `GET /api/search/hot`、`GET /api/search/suggestions`、`GET /api/search/history`
- 遗失动作权限：读者页不再暴露遗失登记，后台继续保留真实处理入口

### 4.2 服务层已明确的业务约束

- `DIGITAL_ONLY` 与 `HYBRID` 图书必须提供有效的 `http/https` 在线访问链接
- `DIGITAL_ONLY` 图书不能创建实体副本
- `PHYSICAL_ONLY` 图书不会保存线上资源元数据
- 预约履约会校验未缴罚款与借阅上限
- 逾期归还与遗失登记会自动生成罚款并写入通知

## 5. 主要页面状态快照

### 5.1 读者端

| 路由 | 状态 | 备注 |
| --- | --- | --- |
| `/` | 已接通 | 首页聚合真实接口，展示推荐、新书、分类与快捷入口 |
| `/auth/*` | 已接通 | 登录、注册、找回密码、重置密码都已接真实接口 |
| `/books` | 已接通 | 真实检索、分类筛选、库存筛选、联想词、热门搜索、最近搜索 |
| `/books/[id]` | 已接通 | 借阅、预约、收藏、评论、线上资源、馆藏位置都在一个页里 |
| `/my` | 已接通 | 走用户总览接口 |
| `/my/shelf` | 已接通 | 收藏、当前借阅、历史借阅聚合页 |
| `/my/reservations` | 已接通 | 查看与取消预约 |
| `/my/fines` | 已接通 | 查看和支付个人罚款 |
| `/my/notifications` | 已接通 | 已读、全部已读、删除单条、清空已读、深链跳转 |
| `/my/loan-tracking/[id]` | 已接通 | 查看借阅详情、续借、归还；不再提供读者挂失 |
| `/my/search-history` | 已接通 | 查看个人搜索历史并一键再次搜索 |
| `/help-feedback` | 已接通 | 提交反馈、查看回复、支持通知高亮跳转 |

### 5.2 后台

| 路由 | 状态 | 备注 |
| --- | --- | --- |
| `/dashboard` | 已接通 | 真实统计与分析接口 |
| `/dashboard/books` | 已接通 | 图书管理主入口 |
| `/dashboard/books/new` | 已接通 | 支持实体/线上/混合资源新书入库 |
| `/dashboard/books/[id]` | 已接通 | 图书详情与副本列表 |
| `/dashboard/copies` | 已接通 | 副本 CRUD |
| `/dashboard/loans` | 已接通 | 还书、标记遗失 |
| `/dashboard/reservations` | 已接通 | 列表、搜索、履约、取消 |
| `/dashboard/fines` | 已接通 | 状态筛选和豁免可用，但仍偏轻量 |
| `/dashboard/reviews` | 已接通 | 审核评论 |
| `/dashboard/users` | 已接通 | 用户分页与状态管理 |
| `/dashboard/feedback` | 已接通 | 回复反馈并触发通知 |
| `/dashboard/authors` | 已接通 | 作者 CRUD |
| `/dashboard/categories` | 已接通 | 分类 CRUD |
| `/dashboard/publishers` | 已接通 | 出版社 CRUD |
| `/dashboard/settings` | 已接通 | 角色、权限、用户角色、RBAC 审计 |

## 6. 快速启动

### 6.1 后端

```powershell
cd backend-library
.\mvnw.cmd spring-boot:run
```

### 6.2 前端

```powershell
cd front_library
npm install
npm run dev
```

### 6.3 Android

```powershell
cd front-android
npm install
npm run start
```

### 6.4 小程序

推荐在微信开发者工具中打开 `miniapp/`；如果直接打开仓库根目录，根目录 `project.config.json` 也会指向 `miniapp/`。

默认联调关系：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8089`
- 前端通过 `next.config.js` 代理 `/api/backend/*` 到后端

## 7. 当前已知边界

- 找回密码仍是“后端生成重置链接并用于联调”的模式，没有接真实邮件平台
- 目录页“扫码找书”仍未接摄像头/ISBN 扫描
- 搜索历史和热词已经有前端入口，但搜索体验仍以目录页增强为主，没有单独的大型搜索中心
- 仓库里仍保留一些隐藏路由，例如 `/test`、`/authors/CheckBooks`，它们不是实际产品入口
- 根目录微信开发者工具配置已显式指向 `miniapp/`

## 8. 建议从哪开始看代码

新加入项目时，建议按这个顺序阅读：

1. `AGENTS.md`
2. `front.md`
3. `front_library/pages/`
4. `front_library/services/api/`
5. `backend-library/src/main/java/com/example/library/controller/`
6. `backend-library/src/main/java/com/example/library/service/impl/`

## 9. 相关文档

- 前端实现说明：`front.md`
- 前端应用说明：`front_library/README.md`
- 后端接口文档：`backend-library/接口文档.md`
- 后端数据库结构：`backend-library/数据库结构.md`
- 业务规则状态机：`docs/library-rules-state-machine.md`
