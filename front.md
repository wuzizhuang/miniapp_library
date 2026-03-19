# 前端实现与维护说明

本文档聚焦 `front_library/`，并补充说明 `front-android/` 与 `miniapp/` 的移动端范围，用于说明当前前端的真实结构、主要页面、最新功能状态和维护边界。

更新时间：`2026-03-08`

## 1. 前端定位

`front_library/` 是整个智慧图书馆系统的 Web 前端，包含两套实际业务界面：

- 读者端：公开页、认证页、个人中心
- 管理端：后台管理、运营看板、RBAC

前端不是纯静态展示层，绝大多数页面都已经接真实后端接口。

补充说明：

- `front-android/` 是新的 Android 客户端骨架
- 它不替代 `front_library/`，而是复用同一套后端接口契约
- 当前 `front-android/` 已接入登录、首页、图书目录、图书详情、我的，以及预约、借阅追踪、通知、罚款、反馈、推荐、座位预约等读者链路
- `miniapp/` 是当前在用的微信小程序读者端
- 它已经切换到真实后端接口，不再默认依赖本地 mock 数据
- 仓库根目录的微信开发者工具配置已经显式指向 `miniapp/`

## 2. 技术栈

- Next.js 15 Pages Router
- React 18 + TypeScript
- HeroUI + Tailwind CSS
- SWR 负责数据请求与缓存
- Axios 负责 API 调用
- Sonner 负责全局提示

## 3. 目录结构

| 路径 | 说明 |
| --- | --- |
| `front_library/pages/` | 页面路由 |
| `front_library/components/layouts/` | 默认布局、导航栏、后台布局 |
| `front_library/components/modules/` | 目录、图书详情、后台业务模块 |
| `front_library/services/api/` | 所有真实 API 封装 |
| `front_library/types/` | DTO 与前端视图类型 |
| `front_library/hooks/` | 通用 hooks，如 `useDebounce` |
| `front_library/utils/` | 表单规则、RBAC、映射工具等 |

## 4. 页面分组

### 4.1 公开页与认证页

- `/`
- `/books`
- `/books/[id]`
- `/authors`
- `/about`
- `/auth/login`
- `/auth/register`
- `/auth/forgetPassword`
- `/auth/reset-password`

### 4.2 读者中心

- `/my`
- `/my/shelf`
- `/my/profile`
- `/my/reservations`
- `/my/appointments`
- `/my/reviews`
- `/my/search-history`
- `/my/notifications`
- `/my/fines`
- `/my/loan-tracking/[id]`
- `/help-feedback`

### 4.3 后台管理

- `/dashboard`
- `/dashboard/books`
- `/dashboard/books/new`
- `/dashboard/books/[id]`
- `/dashboard/copies`
- `/dashboard/loans`
- `/dashboard/reservations`
- `/dashboard/appointments`
- `/dashboard/fines`
- `/dashboard/reviews`
- `/dashboard/users`
- `/dashboard/feedback`
- `/dashboard/authors`
- `/dashboard/categories`
- `/dashboard/publishers`
- `/dashboard/settings`

### 4.4 非产品入口

以下页面仍在仓库里，但当前不是实际产品入口：

- `/test`
- `/authors/CheckBooks`

## 5. 当前已完成的关键前端能力

### 5.1 读者主链路

- 登录、注册、找回密码、重置密码
- 首页聚合与馆藏目录
- 图书详情、借阅、预约、收藏、评论
- 我的中心、书架、预约、罚款、通知、反馈、个人资料
- 搜索历史页
- 通知中心的删除单条、清空已读、深链跳转

### 5.2 搜索体验

`/books` 现在已经接上：

- 实时联想词
- 热门搜索
- 登录用户最近搜索
- 点击热词/历史词后直接触发现有目录搜索
- URL 查询参数同步，支持分享和刷新保留搜索条件

### 5.3 图书在线资源管理

后台图书创建/编辑表单已支持：

- `resourceMode`
- `onlineAccessUrl`
- `onlineAccessType`

图书详情页会直接展示这些数据，因此管理端和详情页现在已经打通。

### 5.4 遗失动作规则

读者借阅跟踪页不再暴露“挂失”按钮。

当前前端明确遵循的规则是：

- 读者只能自助 `续借 / 归还`
- 图书遗失登记由后台借阅管理处理

## 6. 当前前端结构特点

### 6.1 布局

- 默认布局：`components/layouts/default.tsx`
- 顶部导航：`components/layouts/navbar.tsx`
- 后台布局：`components/layouts/AdminLayout.tsx`
- 后台侧栏：`components/modules/admin/AdminSidebar.tsx`

### 6.2 核心业务组件

- 目录：`components/modules/catalog/LibraryCatalog.tsx`
- 搜索发现面板：`components/modules/catalog/CatalogSearchDiscovery.tsx`
- 图书评论：`components/modules/books/ReviewSection.tsx`
- 后台图书表单：`components/modules/admin/books/BookForm.tsx`
- 后台图书弹窗：`components/modules/admin/books/BookFormModal.tsx`

### 6.3 数据层模式

前端的主要模式是：

- `services/api/*` 封装真实接口
- 页面或模块组件直接用 SWR 管理请求和刷新
- 复杂业务规则尽量复用 `utils/` 中的归一化和校验函数

## 7. 当前仍需注意的边界

- 找回密码流程能跑通，但仍是联调形态，未接真实邮件发送
- 目录页“扫码找书”仍未落地
- 前端仍有一些较大的页面组件，后续维护时应优先拆分
- `npm run lint` 当前是 `eslint --fix`，会自动改文件，执行前要有心理预期

## 8. 本地开发

### 8.1 启动

```powershell
cd front_library
npm install
npm run dev
```

### 8.2 常用检查

```powershell
cd front_library
npx tsc --noEmit
npx eslint .
```

说明：

- `package.json` 里已有 `npm run build`
- `package.json` 里的 `npm run lint` 会执行 `eslint --fix`

## 9. 阅读建议

如果你第一次接手这个前端，建议按下面顺序看：

1. `front_library/README.md`
2. `front_library/pages/_app.tsx`
3. `front_library/config/authContext.tsx`
4. `front_library/components/layouts/`
5. `front_library/services/api/`
6. `front_library/components/modules/catalog/`
7. `front_library/pages/my/`
8. `front_library/pages/dashboard/`

## 10. 对应文档

- 全仓库总览：`all.md`
- 前端应用 README：`front_library/README.md`
- Android 客户端 README：`front-android/README.md`
- 小程序说明：`miniapp/README.md`
- 后端接口文档：`backend-library/接口文档.md`
- 协作规则：`AGENTS.md`
