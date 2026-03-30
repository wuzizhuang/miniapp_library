# 智慧图书馆 Android 客户端 — UI 分析报告

> 分析范围：`front-android/src` 下全部 19 个 Screen、3 个 Feature 组件、2 个共享组件文件以及 `theme.ts` 设计令牌系统。

---

## 一、设计系统与视觉令牌

### 1.1 色彩体系（`theme.ts`）

| 令牌 | 值 | 用途 |
|---|---|---|
| `primary` | `#6C63FF` | 主操作按钮、活跃 Tab、高亮边框 |
| `primaryDark` | `#4F46E5` | 图标着色、指标数字、链接文本 |
| `primarySoft` | `rgba(108,99,255,0.08)` | Hero 卡片底色、图标圆形背景 |
| `accent` | `#F59E0B` | 评分星标、警告图标 |
| `danger` | `#EF4444` | 逾期/罚款标签、删除按钮 |
| `success` | `#10B981` | 可借/已归还/已完成标签 |
| `background` | `#F8FAFC` | 页面底色 |
| `surface` / `surfaceElevated` | `#FFFFFF` / `#FAFBFD` | 卡片主体/嵌套子卡片 |

**核心策略**：深色文字 + 浅色背景 + 半透明柔色（`primarySoft` / `accentSoft` / `dangerSoft`）构建层次。全局无硬编码颜色值，所有组件均引用 `colors.*` 令牌。

### 1.2 间距与圆角

- **间距四级**：`xs=6` / `sm=10` / `md=16` / `lg=24` / `xl=32`
- **圆角三级**：`sm=10` / `md=14` / `lg=20`；胶囊型使用 `borderRadius: 999`
- **阴影**：通过 `surfaceElevated` 配合 `borderWidth: 1` + `borderColor: colors.border` 模拟投影，避免平台差异

### 1.3 字体规范

- 标题：`fontSize: 22~24, fontWeight: "800"` → 超粗黑体
- 副标题：`fontSize: 16~17, fontWeight: "800"` → 加粗
- 正文：`fontSize: 14~15, lineHeight: 20~24` → 标准行高
- 辅助文字：`fontSize: 12~13, color: textMuted` → 灰色弱化

---

## 二、组件库架构

### 2.1 Page-Level 布局组件（`Screen.tsx`，234 行）

| 组件 | 功能 |
|---|---|
| `Screen` | 全局页面容器，封装 `SafeAreaView` + `ScrollView` + Hero 光晕背景 + 下拉刷新 + 键盘行为 |
| `Card` | 圆角卡片，支持 `tone` 属性（`default` / `tinted` / `muted`）控制底色 |
| `SectionTitle` | 段落标题，统一 `fontSize: 18 + fontWeight: "800"` |
| `StateText` | 状态文案，支持 `tone`（`danger` / `warning` / `success`）语义着色 |

**Hero 光晕设计**：`Screen` 组件顶部通过绝对定位的渐变色块（`primarySoft` → 透明）营造品牌氛围，所有页面自动继承该视觉效果。

### 2.2 原子级 UI 组件（`Ui.tsx`，522 行）

| 组件 | Props 要点 | 设计特征 |
|---|---|---|
| `ActionButton` | `tone`×5 + `size`×2 + `disabled` + `icon` | 全宽渐变感按钮，`Pressable` 的 pressed 态 `opacity: 0.86` |
| `InfoPill` | `label` + `tone`×7 + `icon` | 胶囊标签，icon + text 水平排列，`borderRadius: 999` |
| `TextField` | `label` + `hint` + `icon` + RN TextInput props | 带图标前缀的输入框，支持 `secureTextEntry` 和 `multiline` |
| `CoverImage` | `title` + `uri` + `style` | 图书封面，加载失败时显示书名首字作为 fallback |
| `EmptyCard` | `title` + `description` | 居中图标 + 文本的空状态提示 |
| `ErrorCard` | `message` + `onRetry` | 错误提示 + 重试按钮 |
| `LoginPromptCard` | `onLogin` | 未登录引导卡片，一键跳转登录页 |

### 2.3 Feature 级组件（`features/books/`）

| 组件 | 行数 | 功能 |
|---|---|---|
| `BookCatalogCard` | 176 | 水平布局的图书目录卡：封面 + 标题/作者 + 三列指标网格（可借/总藏/排队） + 状态标签行 |
| `BooksFiltersCard` | 343 | 多维检索面板：综合搜索框 + 题名/作者/出版社高级筛选 + 分类 `FilterChip` 横向滚动 + 仅看可借切换 + 排序选择 |

---

## 三、页面结构模式

### 3.1 页面模板分类

通过分析 19 个 Screen，可归纳为 **4 种核心页面模板**：

#### 模板 A — 数据聚合仪表盘

**代表页**：`HomeScreen`（577L）、`MyScreen`（452L）

结构：`Screen` → Hero 概要卡片（`tinted`）→ 多组 `SectionTitle` + 数据网格/列表

- 并行调用多个 API（`Promise.all`），聚合 overview、loans、favorites、fines 等数据
- 使用 `StatCard` / `MiniMetric` 展示数字指标
- 数据区域使用等分网格布局（`flex: 1 + gap`）

#### 模板 B — 详情 + 操作

**代表页**：`BookDetailScreen`（757L）、`LoanTrackingScreen`（411L）、`ProfileScreen`（330L）

结构：`Screen` → Hero 卡片（封面+信息+标签行）→ 信息面板（`InfoRow` 键值表格）→ 操作区

- Hero 区域：封面图 + 标题 + `InfoPill` 状态标签矩阵 + `MiniMetric` 指标行
- 信息面板：`infoBoard` 容器内嵌多个 `InfoRow`，每行 icon + label + value，用 `borderBottom` 分隔
- 操作区：条件渲染 `ActionButton`，根据业务状态（`canBorrow` / `canRenew`）动态显示

#### 模板 C — 列表管理

**代表页**：`ShelfScreen`（496L）、`NotificationsScreen`（535L）、`ReservationsScreen`（389L）、`FinesScreen`（400L）

结构：`Screen` → 概要卡片 + 指标行 → 筛选/Tab 区 → 列表卡片 → 分页

- 概要区：固定的 `summaryCard` 布局（60×60 圆角图标 + 标题文案 + 三列 `StatCard`）
- 分组方式：`FilterChip`（胶囊 Tab）或 `pending / history` 双分区
- 列表项：`Pressable` 包裹的水平卡片，cover 左 + body 右 + chevron 箭头
- 分页控件：上一页/下一页 `ActionButton` + 页码文本

#### 模板 D — 表单输入

**代表页**：`LoginScreen`（199L）、`RegisterScreen`、`ForgotPasswordScreen`、`ProfileScreen`（编辑区）

结构：`Screen` → 介绍卡片（`tinted`）→ 表单卡片（多个 `TextField` + `ActionButton` 提交）

- 引导区：icon + 功能亮点列表（`FeatureRow`）
- 表单区：垂直排列的 `TextField`，底部 `ActionButton` + 辅助链接

### 3.2 通用布局规律

| 特征 | 规律 | 覆盖率 |
|---|---|---|
| Hero 概要头 | `Card tone="tinted"` + 60px 图标圆 + 标题 + 描述 + `StatCard` 行 | 12/19 页面 |
| 三列指标网格 | `flexDirection: "row" + gap + flex: 1` → 等分三列 | 9/19 页面 |
| 加载/错误/空态守卫 | `loading ? <Card> : null` → `errorMessage ? <ErrorCard> : null` → `empty ? <EmptyCard> : null` → 数据渲染 | 19/19 页面 |
| 未登录拦截 | `if (!user) return <LoginPromptCard>` 提前返回 | 11/19 页面 |

---

## 四、交互模式

### 4.1 状态机驱动的按钮

所有写操作按钮采用 `acting` 状态锁：

```typescript
const [acting, setActing] = useState<"borrow" | "favorite" | null>(null);
// 按钮文案：acting === "borrow" ? "借阅中..." : "立即借阅"
// 按钮禁用：disabled={acting !== null}  → 同一时刻只允许一个操作
```

该模式在 `BookDetailScreen`（4 种 acting 类型）、`LoanTrackingScreen`（2 种）、`FinesScreen`（按 ID 锁定）等页面一致使用。

### 4.2 事件驱动刷新（Pub/Sub）

所有数据页面共用 `subscribeAppEvent` 订阅机制：

```typescript
useEffect(() => {
  return subscribeAppEvent((event) => {
    if (event === "books" || event === "favorites" || event === "loans") {
      void loadData(true);
    }
  });
}, [deps]);
```

写操作完成后通过 `emitAppEvent` 广播事件，关联页面自动静默刷新。事件类型覆盖 `books` / `favorites` / `loans` / `reservations` / `fines` / `notifications` / `overview` / `reviews` / `profile` / `auth` 共 10 种。

### 4.3 登录守卫

两种粒度：
- **页面级**：`if (!user) return <LoginPromptCard>`，整页替换为登录引导
- **操作级**：`requireLogin()` 函数，调用后跳转 `LoginScreen`，登录成功自动 `goBack()`

### 4.4 通知深链路由

`NotificationsScreen` 的 `resolveNotificationTarget` 根据通知类型解析跳转目标：

| 通知类型 | 跳转目标 | 携带参数 |
|---|---|---|
| `DUE_REMINDER` | `LoanTracking` | `{ loanId }` |
| `ARRIVAL_NOTICE` | `Reservations` | `{ highlightId }` |
| `NEW_BOOK_RECOMMEND` | `Recommendations` | `{ highlightId }` |
| 系统消息 | `Shelf` | 无 |

跳转目标页面通过 `route.params?.highlightId` 实现卡片高亮（`highlightCard` 样式：`borderColor: primary + backgroundColor: primarySoft`）。

### 4.5 下拉刷新

列表管理类页面统一支持 `Screen` 的 `refreshing` + `onRefresh` 属性：

```tsx
<Screen refreshing={refreshing} onRefresh={() => void loadData(true)}>
```

刷新时保留当前列表内容，仅顶部显示刷新指示器，无闪屏效果。

---

## 五、数据加载策略

### 5.1 并行请求

详情页使用 `Promise.all` 批量拉取：
- `BookDetailScreen`：图书详情 + 副本列表 + 评论分页 + 收藏状态 + 借阅列表 + 预约列表（6 路并行）
- `HomeScreen`：概览统计 + 借阅 + 收藏 + 罚款 + 通知 + 推荐（6 路并行）
- `ProfileScreen`：个人信息 + 概览统计（2 路并行）

### 5.2 三态渲染守卫

每个页面严格按照 `loading → error → empty → data` 四段条件渲染：

```tsx
{loading ? <Card tone="muted"><Text>加载中...</Text></Card> : null}
{!loading && errorMessage ? <ErrorCard message={errorMessage} onRetry={retry} /> : null}
{!loading && !errorMessage && items.length === 0 ? <EmptyCard /> : null}
{!loading && !errorMessage && items.length > 0 ? /* 数据渲染 */ : null}
```

### 5.3 本地搜索与分页

`ShelfScreen` 和 `BooksScreen` 使用客户端过滤 + 前端分页：
- `useMemo` 计算过滤后列表
- `PAGE_SIZE = 12`，手动翻页按钮
- 切换 Tab/搜索词时自动重置到第 0 页

---

## 六、视觉一致性评估

### 6.1 高度统一的模式

| 指标 | 表现 |
|---|---|
| 颜色引用 | 100% 通过 `colors.*` 令牌 |
| 间距引用 | 100% 通过 `spacing.*` 令牌 |
| 圆角引用 | 约 90% 通过 `radius.*`，部分内联 `borderRadius: 999`（胶囊）或 `borderRadius: 22`（概要图标） |
| 组件复用 | `InfoPill` / `ActionButton` / `Card` / `Screen` 复用率 100% |
| 字重 | 标题统一 `"800"`，正文统一 `"600"~"700"` |

### 6.2 保持一致的概要卡片模式

11 个页面使用了完全一致的概要卡片结构：

```
summaryCard (tone="tinted")
├── summaryHeader (row)
│   ├── summaryIconWrap (60×60, borderRadius: 22, primarySoft 背景)
│   └── summaryBody
│       ├── InfoPill (分类标签)
│       ├── summaryTitle (22px, 800)
│       └── summaryText (muted, lineHeight: 22)
└── statRow (三列等分 StatCard)
```

该模式在 `ShelfScreen`、`NotificationsScreen`、`FinesScreen`、`ReservationsScreen` 等页面精确复刻，确保用户在不同功能模块间获得一致的视觉认知。

---

## 七、关键发现与建议

### 7.1 架构优势

1. **零第三方 UI 依赖**：全部组件手工构建，无 NativeBase / Paper / Elements 等库依赖，包体积可控
2. **令牌化程度高**：颜色/间距/圆角全部抽象为令牌，主题切换只需修改 `theme.ts`
3. **事件解耦**：写操作与数据刷新通过 Pub/Sub 解耦，跨页面数据一致性保证良好
4. **状态覆盖完整**：loading / error / empty / data / unauthorized 五态全覆盖

### 7.2 可优化方向

1. **概要卡片可抽象**：11 个页面的 `summaryCard` 布局高度重复（60×60 icon + title + text + 三列 stat），可提取为 `SummaryCard` 通用组件
2. **`StatCard` / `MiniMetric` 散落各页**：每个页面内部都定义了局部 `StatCard` 函数组件，建议提取到 `Ui.tsx` 统一管理
3. **分页组件可复用**：`ShelfScreen` 的分页控件可独立为 `Pagination` 组件
4. **FilterChip 可归并**：`BooksFiltersCard` 和 `ShelfScreen` 都实现了 `FilterChip`，可合并为一个

---

*分析时间：2026-03-28 | 分析工具：源码静态阅读*
