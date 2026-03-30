# 智慧图书馆系统交付包

本交付包用于软件验收、部署演示和源码留档，包含以下内容：

- `backend-library/`：Spring Boot 后端完整源码
- `front_library/`：Next.js Web 前端完整源码
- `front-android/`：Android 读者客户端源码
- `miniapp/`：微信小程序读者端源码
- `database/`：数据库初始化与迁移脚本
- `docs/软件环境部署与操作说明.md`：软件环境部署、启动、操作说明
- `.env.example`、`docker-compose.yml`、`start.ps1`、`project.config.json` 等辅助部署脚本

## 快速使用

### 方式一：Docker 一键部署

1. 复制 `.env.example` 为 `.env`，按需修改数据库密码和 JWT 密钥。
2. 在交付包根目录执行：

```powershell
docker compose up -d --build
```

3. 启动后访问：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8089`

### 方式二：本地手动部署

请优先阅读 [docs/软件环境部署与操作说明.md](docs/软件环境部署与操作说明.md)，其中包含：

- 环境依赖要求
- 数据库导入方式
- 后端启动方法
- Web 前端启动方法
- Android 客户端启动方法
- 微信小程序启动方法
- 默认账号与端口说明
- 常见运维操作

## 重要提示

- `database/create.sql` 为基础建库建表脚本，适合从零启动系统。
- `database/library_management_linux_init.sql` 为完整初始化脚本，包含表结构、权限和示例数据，适合演示环境。
- 两个初始化脚本二选一执行即可，不要在同一个空库里重复导入两份初始化脚本。
- Docker 默认挂载的是 `create.sql`。如果需要更多演示数据，建议在系统启动后执行 `backend-library/seed-backend-data.ps1`，或改用完整初始化脚本。
- Android 客户端已排除 `node_modules`、APK、日志和本地 `.env`，解压后按文档重新安装依赖即可。
- 小程序源码已包含 `miniapp/project.config.json`，同时交付包根目录也带有 `project.config.json`，可直接在微信开发者工具打开。
