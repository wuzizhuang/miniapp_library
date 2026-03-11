# 智慧图书馆微信小程序

`miniapp/` 是智慧图书馆系统当前在用的微信小程序读者端，已经切换到真实后端接口，不再依赖旧的本地 mock 数据。

## 项目定位

这个小程序面向读者使用，目标是提供一套轻量但完整的移动端图书馆使用入口，覆盖登录、馆藏浏览、借阅相关查询和个人中心等核心流程。

## 当前已实现功能

- 登录
- 注册
- 找回密码请求
- 首页聚合
- 馆藏目录
- 图书详情
- 我的书架
- 我的预约
- 我的罚款
- 我的通知
- 帮助与反馈
- 推荐动态
- 服务预约

## 运行方式

推荐直接在微信开发者工具中打开 `miniapp/` 目录。

如果你已经打开仓库根目录，也可以继续使用；根目录的 `project.config.json` 已经指向 `miniapp/`。

## 运行前准备

请先确保以下环境已经准备好：

- 微信开发者工具
- 已启动的后端服务
- 当前可访问的后端 API 地址

## 联调配置

后端地址从 `config/env.js` 读取，当前默认值为：

```js
http://127.0.0.1:8089/api
```

如果你使用真机调试，请把它改成局域网可访问的后端地址，不要继续使用 `127.0.0.1`。

默认配置项：

- `DEFAULT_API_BASE_URL`：后端 API 地址
- `DEFAULT_AUTO_LOGIN_ENABLED`：是否开启默认自动登录
- `DEFAULT_AUTO_LOGIN_USERNAME`：默认联调用户名
- `DEFAULT_AUTO_LOGIN_PASSWORD`：默认联调密码

## 目录结构

- `app.js`：小程序启动与登录态恢复入口
- `pages/`：业务页面
- `services/`：按业务拆分的 API 服务
- `utils/`：请求、存储、工具函数
- `config/`：环境配置
- `project.config.json`：微信开发者工具项目配置

## 页面范围

当前主要页面包括：

- `pages/login/`
- `pages/register/`
- `pages/forgot-password/`
- `pages/index/`
- `pages/books/`
- `pages/my/`
- `pages/help-feedback/`

## 开发说明

- 当前所有主链路都以真实后端为准
- 默认关闭自动登录，避免误导联调
- 历史兼容入口 `services/mock-library.js` 仍保留，但已经转发到真实服务层

## 当前限制

- 找回密码目前仍是联调请求，不是完整邮件投递闭环
- 真机环境必须手动切换 API 地址
- 当前是读者端，不包含后台管理能力
