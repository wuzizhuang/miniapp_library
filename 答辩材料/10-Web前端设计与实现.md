# Web 前端设计与实现（论文第 6 章素材）

## 1 Web 前端架构设计

### 1.1 技术选型

本系统 Web 前端采用以下技术栈：

| 技术 | 版本 | 用途 |
|---|---|---|
| Next.js | 15.x | 基于 React 的全栈框架，采用 Pages Router 路由模式 |
| React | 18.x | UI 构建库，支持 Hooks 和并发特性 |
| TypeScript | 5.x | 类型安全的 JavaScript 超集，提升开发可维护性 |
| HeroUI | — | 企业级 React 组件库，提供统一的视觉设计系统 |
| Tailwind CSS | — | 原子化 CSS 框架，快速构建响应式布局 |
| SWR | — | 声明式数据获取库，提供自动缓存、重新验证和请求去重 |
| Axios | — | HTTP 请求库，封装统一的请求/响应拦截器 |
| Iconify | — | 图标方案，支持多种图标集按需加载 |

### 1.2 路由结构

Web 前端采用 Next.js Pages Router 模式，共包含 **43 个页面文件**，分为以下路由区域：

```
pages/
├── index.tsx                    # 首页（聚合展示）
├── auth/                        # 认证模块
│   ├── login.tsx                # 登录
│   ├── register.tsx             # 注册
│   ├── forgetPassword.tsx       # 找回密码
│   └── reset-password.tsx       # 重置密码
├── books/                       # 馆藏检索
│   ├── index.tsx                # 馆藏目录（搜索/筛选/热词/联想）
│   └── [id].tsx                 # 图书详情
├── my/                          # 读者个人中心
│   ├── index.tsx                # 个人中心总览
│   ├── shelf/                   # 我的书架（收藏+借阅）
│   ├── loan-tracking/[id].tsx   # 借阅跟踪详情
│   ├── reservations/            # 我的预约
│   ├── fines/                   # 我的罚款
│   ├── notifications/           # 通知中心
│   ├── reviews/                 # 我的评论
│   ├── recommendations/         # 推荐动态
│   ├── seats/                   # 座位预约
│   ├── appointments/            # 服务预约
│   ├── search-history/          # 搜索历史
│   └── profile/                 # 个人资料
├── help-feedback/               # 帮助与反馈
├── dashboard/                   # 管理后台
│   ├── index.tsx                # 仪表盘
│   ├── books/                   # 图书管理（列表+详情+新增）
│   ├── copies/                  # 副本管理
│   ├── loans/                   # 借阅管理
│   ├── reservations/            # 预约管理
│   ├── fines/                   # 罚款管理
│   ├── reviews/                 # 评论审核
│   ├── users/                   # 用户管理（列表+详情）
│   ├── feedback/                # 反馈管理
│   ├── authors/                 # 作者管理
│   ├── categories/              # 分类管理
│   ├── publishers/              # 出版社管理
│   ├── appointments/            # 服务预约管理
│   └── settings/                # RBAC 设置
└── about/                       # 关于页面
```

### 1.3 API 服务层设计

前端封装了 **20 个 API 服务模块**，位于 `services/api/` 目录：

| 服务文件 | 对应后端模块 |
|---|---|
| `authService.ts` | 认证注册、登录、Token 管理 |
| `bookService.ts` | 图书检索与详情 |
| `bookCopyService.ts` | 副本查询与管理 |
| `loanService.ts` | 借阅相关操作 |
| `reservationService.ts` | 预约相关操作 |
| `fineService.ts` | 罚款查询与缴纳 |
| `notificationService.ts` | 通知中心 |
| `reviewService.ts` | 评论增删改 |
| `favoriteService.ts` | 收藏管理 |
| `searchService.ts` | 搜索发现（热词/联想/历史） |
| `feedbackService.ts` | 反馈提交与查看 |
| `userService.ts` | 用户资料与概览 |
| `adminService.ts` | 管理后台公共接口 |
| `recommendationService.ts` | 推荐动态 |
| `seatReservationService.ts` | 座位预约 |
| `serviceAppointmentService.ts` | 服务预约 |
| `catalogMetadataService.ts` | 分类/作者/出版社元数据 |
| `publicService.ts` | 首页公开数据 |
| `behaviorLogService.ts` | 用户行为日志 |
| `bookLocationMapService.ts` | 馆藏位置地图 |

所有服务模块统一使用 Axios 实例，通过请求拦截器自动附加 JWT Token，通过响应拦截器统一处理 401（自动跳转登录）和错误提示。

## 2 读者端关键页面实现

### 2.1 首页

首页（`pages/index.tsx`）通过 `publicService.getHomePage` 接口获取聚合数据，展示以下区域：

- **Hero 区**：搜索入口、馆藏统计（总馆藏、在借册数、本周新增等）
- **借阅状态卡片**：登录用户可直接看到当前在借、待还提醒、待取预约、我的书架
- **分类快捷入口**：展示热门分类及对应图书数量，点击进入分类筛选
- **推荐书目**：展示热门图书卡片（含封面、作者、标题）
- **新书上架**：展示最近入库的图书列表
- **服务入口**：馆藏目录、我的书架、后台管理（仅管理员可见）

页面采用 SWR 进行数据获取，支持自动缓存和后台重新验证。管理员登录后自动跳转至管理后台。

> **（此处建议插入首页截图）**

### 2.2 馆藏目录

馆藏目录页（`pages/books/index.tsx`）是读者查找图书的核心入口，实现了以下功能：

- **关键词搜索**：实时调用联想词接口，输入即返回匹配建议
- **热门搜索**：展示搜索频率最高的关键词标签
- **搜索历史**：登录用户的最近搜索关键词
- **分类筛选**：按图书分类过滤结果
- **库存筛选**：可筛选"有库存"的图书
- **分页展示**：图书卡片网格布局，支持分页加载

> **（此处建议插入馆藏目录截图）**

### 2.3 图书详情

图书详情页（`pages/books/[id].tsx`）采用动态路由，集成了以下功能区：

- **图书元信息**：封面、标题、作者、ISBN、出版社、出版年份、页数、语言、分类
- **操作按钮区**：借阅（有可用副本时）、预约（无可用副本时）、收藏/取消收藏
- **线上资源入口**：支持 OPEN_ACCESS、CAMPUS_ONLY、LICENSED_ACCESS 三种访问模式
- **馆藏副本列表**：展示各副本的位置代码、RFID 标签、当前状态
- **评论区**：显示已审核的评论及评分，登录用户可提交新评论

> **（此处建议插入图书详情截图）**

### 2.4 个人中心

个人中心（`pages/my/index.tsx`）通过 `userService.getMyOverview` 获取用户概览数据，以卡片形式展示：

- 当前在借数量与即将到期提醒
- 预约状态（排队中/待取书）
- 未缴罚款总额
- 未读通知数
- 收藏图书数

各卡片点击后跳转到对应的详情页面。

> **（此处建议插入个人中心截图）**

### 2.5 通知中心

通知中心（`pages/my/notifications/index.tsx`）实现了完整的通知生命周期管理：

- 按时间倒序展示通知列表
- 支持单条标记已读、全部标记已读
- 支持删除单条通知、清空所有已读通知
- **深链跳转**：点击通知根据 `targetType` 和 `routeHint` 自动跳转到对应的借阅详情、预约详情、罚款详情等页面
- 顶部导航栏实时显示未读通知数角标

> **（此处建议插入通知中心截图）**

## 3 管理端关键页面实现

### 3.1 仪表盘

管理端仪表盘（`pages/dashboard/index.tsx`）通过三个后端接口获取数据：

- `dashboard/stats`：核心统计指标（馆藏总量、借阅总数、逾期数、预约数）
- `dashboard/analytics`：借还趋势图表数据
- `dashboard/overview`：概览数据（预约分布、罚款分布、近期借阅）

> **（此处建议插入仪表盘截图）**

### 3.2 图书管理

图书管理（`pages/dashboard/books/`）包含三个页面：

- **列表页**：分页搜索、状态筛选
- **新增页**：支持实体（PHYSICAL_ONLY）、线上（DIGITAL_ONLY）、混合（HYBRID）三种资源模式
- **详情页**：展示图书完整信息及其关联的副本列表

> **（此处建议插入图书管理截图）**

### 3.3 借阅管理与罚款管理

- **借阅管理**（`pages/dashboard/loans/`）：支持状态 Tab 筛选（全部/活跃/逾期/已归还/遗失），管理员可执行确认还书和标记遗失操作
- **罚款管理**（`pages/dashboard/fines/`）：支持按状态筛选（待缴/已缴/已豁免），展示待缴总额，管理员可执行柜台收款和豁免操作

> **（此处建议插入借阅管理和罚款管理截图）**

### 3.4 RBAC 权限设置

RBAC 设置页（`pages/dashboard/settings/`）提供完整的角色权限管理：

- 角色列表及创建/编辑/删除
- 为角色分配细粒度权限
- 为用户分配角色
- 审计日志查看

## 4 前端关键技术实现

### 4.1 认证状态管理

系统通过 React Context（`authContext`）管理全局认证状态：

- 登录成功后存储 JWT Token
- 页面加载时自动检查 Token 有效性
- Token 过期时自动刷新或跳转登录页
- 管理员身份识别（`canAccessAdminPanel`）控制后台访问权限

### 4.2 数据获取与缓存

采用 SWR 库实现声明式数据获取：

- **自动缓存**：相同请求自动命中缓存，减少重复请求
- **后台重新验证**：页面重新聚焦时自动刷新数据
- **请求去重**：多个组件请求相同数据时只发送一次请求
- **乐观更新**：操作后立即更新本地状态，无需等待服务端响应

### 4.3 UI 状态全覆盖

所有数据驱动页面均实现了四种 UI 状态：

| 状态 | 实现方式 |
|---|---|
| 加载中 | Spinner 组件 + 骨架屏 |
| 数据展示 | 列表/卡片/表格 |
| 空数据 | 引导性空状态插画和文案 |
| 错误 + 重试 | 错误信息 + 重试按钮 |

### 4.4 权限路由守卫

- 未登录用户访问 `/my/*` 等受保护页面时，自动跳转到登录页
- 普通用户访问 `/dashboard/*` 管理页面时，跳转首页并显示权限错误提示
- 管理员登录后默认跳转管理后台，可通过"返回前台"按钮回到读者端
