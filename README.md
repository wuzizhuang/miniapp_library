# 智慧图书馆微信小程序

`miniapp/` 是智慧图书馆系统的微信小程序读者端，当前已接入真实后端接口，不再依赖旧的本地 mock 数据。

## 模块职责

- 提供微信端读者功能：登录、注册、首页、馆藏、图书详情、书架、预约、罚款、通知、反馈、推荐、服务预约
- 负责小程序端登录态恢复、页面跳转、接口调用和微信端交互
- 只面向读者侧，不包含后台管理能力

## 基础结构

- `app.js`：小程序启动入口和全局登录态恢复
- `app.json`：页面注册、TabBar、窗口配置
- `app.wxss`：全局样式
- `pages/`：各业务页面
- `services/`：按业务拆分的 API 服务层
- `utils/`：请求封装、存储和通用工具
- `config/env.js`：后端地址、自动登录开关等环境配置
- `project.config.json`：微信开发者工具配置

## 页面结构

主要页面包括：

- `pages/index/index`
- `pages/books/index`
- `pages/books/detail/index`
- `pages/login/index`
- `pages/register/index`
- `pages/forgot-password/index`
- `pages/my/index`
- `pages/my/shelf/index`
- `pages/my/loan-tracking/index`
- `pages/my/reservations/index`
- `pages/my/fines/index`
- `pages/my/notifications/index`
- `pages/my/profile/index`
- `pages/my/appointments/index`
- `pages/my/recommendations/index`
- `pages/my/reviews/index`
- `pages/my/search-history/index`
- `pages/help-feedback/index`

## 运行环境

- 微信开发者工具
- 已启动的后端服务
- 可访问的后端 API 地址

## 启动方式

推荐直接在微信开发者工具中打开：

```text
e:\001-a-kese\1\miniapp
```

如果你打开的是仓库根目录，也可以继续使用，因为根目录的 `project.config.json` 已指向小程序目录。

## 联调配置

小程序后端地址来自 [config/env.js](/e:/001-a-kese/1/miniapp/config/env.js)，当前默认值为：

```text
http://154.19.43.33:8089/api
```

关键配置项：

- `DEFAULT_API_BASE_URL`：默认后端 API 地址
- `DEFAULT_AUTO_LOGIN_ENABLED`：是否启用默认自动登录
- `DEFAULT_AUTO_LOGIN_USERNAME`：自动登录用户名
- `DEFAULT_AUTO_LOGIN_PASSWORD`：自动登录密码

说明：

- 模拟器联调可直接使用当前可访问地址
- 真机调试必须使用手机可访问的局域网或公网地址
- 不要在真机环境继续使用 `127.0.0.1` 或 `localhost`

## 启动建议

推荐联调顺序：

```powershell
cd backend-library
.\mvnw.cmd spring-boot:run
```

然后在微信开发者工具中编译并预览 `miniapp/`。

## 开发说明

- 当前主链路以真实后端接口为准
- 默认关闭自动登录，避免影响真实联调
- 历史兼容入口仍可保留，但不应再回退到 mock 数据
- 页面改动要注意微信小程序导航和生命周期差异

## 当前边界

- 找回密码当前仍是联调请求，不是完整邮件闭环
- 真机环境必须手动确认 API 地址
- 当前只覆盖读者端
