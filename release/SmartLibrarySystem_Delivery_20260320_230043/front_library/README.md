# 智慧图书馆 Web 前端

`front_library/` 是智慧图书馆系统的 Web 前端，基于 Next.js Pages Router，覆盖读者端和后台管理端。

## 模块职责

- 提供读者端页面：首页、馆藏目录、图书详情、借阅、预约、罚款、通知、评论、反馈、个人中心
- 提供管理端页面：仪表盘、图书、副本、借阅、预约、罚款、评论审核、用户、反馈、作者、分类、出版社、RBAC
- 负责前端状态展示、接口调用、错误提示、权限拦截和页面导航

## 基础结构

- `pages/`：Pages Router 页面入口，读者端和后台管理端路由都在这里
- `components/`：布局组件、公共组件、业务组件
- `services/api/`：按业务拆分的 API 封装
- `config/`：站点配置、认证上下文
- `hooks/`：SWR 数据 hooks 与通用 hooks
- `types/`：接口 DTO 和前端业务类型
- `lib/`：Axios、错误处理、底层工具
- `utils/`：映射、RBAC、表单规则、工具函数
- `styles/`：全局样式与 Tailwind 相关配置
- `public/`：静态资源

## 技术栈

- Next.js 15
- React 18
- TypeScript
- HeroUI
- Tailwind CSS
- SWR
- Axios

## 运行环境

- Node.js 18+，推荐 Node.js 20 LTS
- npm
- 已启动的后端服务 `backend-library`

## 快速启动

### 1. 安装依赖

```powershell
cd front_library
npm install
```

### 2. 启动开发服务

```powershell
cd front_library
npm run dev
```

默认访问地址：

```text
http://localhost:3000
```

## 与后端联调

前端通过 [next.config.js](/e:/001-a-kese/1/front_library/next.config.js) 将：

```text
/api/backend/*
```

转发到：

```text
http://localhost:8089/api/*
```

推荐联调顺序：

```powershell
cd backend-library
.\mvnw.cmd spring-boot:run
```

```powershell
cd front_library
npm run dev
```

如果后端不在本机 `8089`，可通过环境变量 `BACKEND_URL` 覆盖代理目标。

## 常用命令

```powershell
cd front_library
npm run dev
npm run build
npm run start
npm run lint
npx tsc --noEmit
```

说明：

- `npm run lint` 当前会执行 `eslint --fix`
- 如果只想检查、不自动修复，建议手动运行 `npx eslint .`

## 页面范围

读者端主要页面：

- `/`
- `/books`
- `/books/[id]`
- `/my`
- `/my/shelf`
- `/my/reservations`
- `/my/fines`
- `/my/notifications`
- `/my/reviews`
- `/my/search-history`

管理端主要页面：

- `/dashboard`
- `/dashboard/books`
- `/dashboard/loans`
- `/dashboard/reservations`
- `/dashboard/fines`
- `/dashboard/reviews`
- `/dashboard/users`

## 开发说明

- 保持 Pages Router 结构，不要在功能任务里迁移到 App Router
- 新接口优先补到 `services/api/`，不要在页面里直接散写请求
- 读者链路要显式处理加载、空状态、错误状态和权限状态
- 后台页面要和后端权限模型保持一致，避免显示必然失败的操作

## 当前边界

- 找回密码目前仍依赖现有联调方式，不是完整邮件闭环
- 个别后台页面的分页和筛选体验仍可继续优化
- 仓库里保留少量测试或隐藏路由，不一定属于正式产品入口
