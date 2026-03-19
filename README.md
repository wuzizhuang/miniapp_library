# 智慧图书馆系统

这是一个完整的图书馆管理系统仓库，包含 Spring Boot 后端、Next.js Web 前端、Android 客户端和微信小程序读者端。

主要能力：

- 读者端：馆藏目录、图书详情、借阅、预约、收藏、评论、罚款、通知、反馈、个人中心
- 管理端：图书、副本、借阅、预约、罚款、用户、反馈、评论审核、作者、分类、出版社、RBAC

## 目录

| 路径 | 说明 |
| --- | --- |
| `backend-library/` | Spring Boot 后端 |
| `front_library/` | Next.js 前端 |
| `front-android/` | Expo + React Native Android 客户端 |
| `miniapp/` | 当前在用的微信小程序读者端 |
| `docs/` | 补充业务规则文档 |
| `all.md` | 全仓库实现总览 |
| `front.md` | 前端实现与维护说明 |
| `AGENTS.md` | 仓库协作规则 |

## 快速启动

### 后端

```powershell
cd backend-library
.\mvnw.cmd spring-boot:run
```

### 前端

```powershell
cd front_library
npm install
npm run dev
```

### Android

```powershell
cd front-android
npm install
npx tsc --noEmit
npm run start
```

### 小程序

推荐直接在微信开发者工具中打开 `miniapp/` 目录；如果打开仓库根目录，根目录 `project.config.json` 也会指向 `miniapp/`。

默认联调：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8089`

## 当前实现状态

已完成的关键能力：

- 通知中心支持单条删除与清空已读
- 后台图书表单支持线上资源字段
- `/books` 已接入搜索联想、热门搜索和最近搜索
- 读者借阅跟踪页不再暴露会失败的“挂失”动作，遗失登记由后台处理
- `miniapp/` 读者主链路已切换到真实后端接口，不再默认依赖本地 mock 数据
- 根目录微信开发者工具配置已显式指向 `miniapp/`

仍需继续完善的部分：

- 后台罚款页分页与搜索
- 找回密码真实邮件投递
- 目录页扫码找书

## 建议先看哪些文档

1. `AGENTS.md`
2. `all.md`
3. `front.md`
4. `front_library/README.md`
5. `backend-library/接口文档.md`
6. `front-android/README.md`
7. `miniapp/README.md`
