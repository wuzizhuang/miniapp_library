# 智慧图书馆后端

`backend-library/` 是智慧图书馆系统的 Spring Boot 后端，负责认证鉴权、读者业务、后台管理、数据持久化和接口输出。

## 模块职责

- 提供读者端接口：登录、注册、馆藏、借阅、预约、罚款、通知、反馈、评论、推荐、个人中心
- 提供后台管理接口：图书、副本、借阅、预约、罚款、评论审核、用户、反馈、作者、分类、出版社、RBAC
- 负责业务规则落地：借阅续借、归还、预约排队、罚款计算、通知触发、权限校验

## 基础结构

- `src/main/java/com/example/library/LibraryManagementApplication.java`：Spring Boot 启动入口
- `src/main/java/com/example/library/controller/`：控制器层，对外暴露 REST API
- `src/main/java/com/example/library/service/`：服务接口
- `src/main/java/com/example/library/service/impl/`：业务实现层，核心规则主要在这里
- `src/main/java/com/example/library/repository/`：JPA Repository 持久化访问
- `src/main/java/com/example/library/entity/`：数据库实体
- `src/main/java/com/example/library/dto/`：请求与响应 DTO
- `src/main/java/com/example/library/exception/`：统一异常和错误响应
- `src/main/resources/application.properties`：运行配置、端口、数据库、JWT、CORS、邮件、缓存
- `create.sql` / `library_management_linux_init.sql`：数据库初始化脚本

## 技术栈

- Java 17
- Spring Boot 3.4
- Spring Web
- Spring Data JPA
- Spring Security
- MySQL
- Redis（可选）
- Maven Wrapper

## 运行环境

- JDK 17
- MySQL 8.x
- Maven 不必单独安装，直接使用 `mvnw.cmd`
- Redis 可选，默认可以关闭

默认配置来自 [application.properties](/e:/001-a-kese/1/backend-library/src/main/resources/application.properties)：

- 服务端口：`8089`
- 数据库：`jdbc:mysql://localhost:3307/library_management`
- 默认数据库账号：`root / root`
- 默认激活环境：`dev`

## 快速启动

### 1. 准备数据库

先确保本地 MySQL 已启动，并创建或允许自动创建 `library_management` 数据库。

如果需要初始化表结构和基础数据，可根据实际情况执行：

```powershell
cd backend-library
mysql -u root -p < create.sql
```

### 2. 启动后端

```powershell
cd backend-library
.\mvnw.cmd spring-boot:run
```

启动成功后默认访问：

```text
http://localhost:8089
```

## 环境变量

后端支持通过环境变量覆盖关键配置：

- `SERVER_PORT`
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_PROFILES_ACTIVE`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `APP_SECURITY_REDIS_ENABLED`
- `SPRING_DATA_REDIS_HOST`
- `SPRING_DATA_REDIS_PORT`

## 联调关系

- Web 前端 `front_library/` 默认通过 `next.config.js` 把 `/api/backend/*` 转发到 `http://localhost:8089/api`
- Android 客户端 `front-android/` 默认通过 `.env` 访问 `http://10.0.2.2:8089/api`
- 微信小程序 `miniapp/` 通过 `config/env.js` 配置后端地址

## 常用命令

```powershell
cd backend-library
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
```

仓库里还提供了辅助脚本：

- `start-backend.ps1`
- `start-backend.bat`
- `seed-backend-data.ps1`
- `seed-backend-data.bat`

## 开发说明

- 控制器尽量保持轻量，业务规则优先放在 `service/impl/`
- 新增查询能力时，优先补 repository / service，不要在 controller 临时过滤
- 读者关键流程要重点关注事务一致性：借阅、归还、预约、罚款、通知
- 管理端权限要显式校验，不要只靠前端隐藏入口

## 当前边界

- 邮件相关能力支持配置，但是否真正发送取决于联调环境
- Redis 默认可关闭，缓存与安全增强能力会随之降级
- 本模块是整个系统的数据与业务中心，移动端和 Web 端都依赖它
