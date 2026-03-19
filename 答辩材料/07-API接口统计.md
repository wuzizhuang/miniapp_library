# API 接口统计

## 1. 接口总览

后端提供 **29 个 Controller**，覆盖 **12 大功能模块**，包含约 **80+ 个 REST API 端点**。

## 2. 按模块分类

### 认证与用户（5 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| POST | `/api/auth/register` | 用户注册 | 公开 |
| POST | `/api/auth/login` | 用户登录 | 公开 |
| POST | `/api/auth/logout` | 退出登录 | 登录 |
| POST | `/api/auth/refresh` | 刷新 Token | 登录 |
| GET | `/api/auth/me` | 获取当前用户 | 登录 |
| GET | `/api/auth/context` | 获取角色权限上下文 | 登录 |

### 密码找回（3 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| POST | `/api/auth/forgot-password` | 申请重置 | 公开 |
| GET | `/api/auth/reset-password/validate` | 校验 Token | 公开 |
| POST | `/api/auth/reset-password` | 提交新密码 | 公开 |

### 图书编目（10+ 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/books` | 分页检索图书 | 公开 |
| GET | `/api/books/{id}` | 图书详情 | 公开 |
| POST | `/api/books` | 新增图书 | 管理员 |
| PUT | `/api/books/{id}` | 编辑图书 | 管理员 |
| DELETE | `/api/books/{id}` | 删除图书 | 管理员 |
| GET | `/api/book-copies` | 查询副本 | 登录 |
| POST | `/api/book-copies` | 新增副本 | 管理员 |
| GET | `/api/categories` | 分类列表 | 公开 |
| GET | `/api/publishers` | 出版社列表 | 公开 |
| GET | `/api/authors` | 作者列表 | 公开 |

### 借阅管理（6 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/loans` | 借阅列表 | 登录/管理员 |
| GET | `/api/loans/{id}` | 借阅详情 | 登录 |
| POST | `/api/loans` | 发起借阅 | 读者 |
| PUT | `/api/loans/{id}/return` | 归还 | 读者/管理员 |
| PUT | `/api/loans/{id}/renew` | 续借 | 读者 |
| PUT | `/api/loans/{id}/lost` | 标记遗失 | 管理员 |

### 预约管理（5 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| POST | `/api/reservations` | 发起预约 | 读者 |
| GET | `/api/reservations` | 全部预约 | 管理员 |
| GET | `/api/reservations/me` | 我的预约 | 读者 |
| PUT | `/api/reservations/{id}/cancel` | 取消预约 | 读者 |
| PUT | `/api/reservations/{id}/fulfill` | 履约 | 管理员 |

### 罚款管理（6 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/fines` | 全部罚款(分页/搜索/筛选) | 管理员 |
| GET | `/api/fines/me` | 我的罚款 | 读者 |
| GET | `/api/fines/{fineId}` | 罚款详情 | 读者/管理员 |
| GET | `/api/fines/pending-total` | 待缴总额 | 管理员 |
| POST | `/api/fines/{fineId}/pay` | 缴纳 | 读者/管理员 |
| POST | `/api/fines/{fineId}/waive` | 豁免 | 管理员 |

### 通知中心（6 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/notifications` | 通知列表 | 读者 |
| GET | `/api/notifications/unread-count` | 未读数 | 读者 |
| PUT | `/api/notifications/{id}/read` | 标记已读 | 读者 |
| PUT | `/api/notifications/read-all` | 全部已读 | 读者 |
| DELETE | `/api/notifications/{id}` | 删除单条 | 读者 |
| DELETE | `/api/notifications/read` | 清空已读 | 读者 |

### 评论与审核（6 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| POST | `/api/reviews` | 创建评论 | 读者 |
| GET | `/api/reviews/me` | 我的评论 | 读者 |
| PUT | `/api/reviews/{id}` | 更新评论 | 读者 |
| DELETE | `/api/reviews/{id}` | 删除评论 | 读者 |
| GET | `/api/admin/reviews/pending` | 待审核列表 | 管理员 |
| PUT | `/api/admin/reviews/{id}/audit` | 审核 | 管理员 |

### 搜索发现（3 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/search/hot` | 热门搜索 | 公开 |
| GET | `/api/search/suggestions` | 联想词 | 公开 |
| GET | `/api/search/history` | 搜索历史 | 读者 |

### 收藏管理（3 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| POST | `/api/favorites/{bookId}` | 添加收藏 | 读者 |
| DELETE | `/api/favorites/{bookId}` | 取消收藏 | 读者 |
| GET | `/api/favorites` | 我的收藏列表 | 读者 |

### 推荐动态（6 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/recommendations` | 推荐列表（全部/关注/我的） | 登录 |
| POST | `/api/recommendations` | 发布推荐 | 管理员/教师 |
| DELETE | `/api/recommendations/{id}` | 删除推荐 | 作者 |
| POST | `/api/recommendations/{id}/like` | 点赞/取消 | 登录 |
| POST | `/api/recommendations/{id}/follow` | 关注/取关 | 登录 |
| GET | `/api/recommendations/{id}` | 详情 | 登录 |

### 反馈管理（4 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| POST | `/api/feedbacks` | 提交反馈 | 登录 |
| GET | `/api/feedbacks/me` | 我的反馈 | 登录 |
| GET | `/api/admin/feedbacks` | 全部反馈 | 管理员 |
| POST | `/api/admin/feedbacks/{id}/reply` | 回复反馈 | 管理员 |

### 座位预约（4 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/seats` | 查询座位（筛选楼层/分区/时段） | 登录 |
| GET | `/api/seat-reservations/me` | 我的座位预约 | 读者 |
| POST | `/api/seat-reservations` | 创建座位预约 | 读者 |
| PUT | `/api/seat-reservations/{id}/cancel` | 取消座位预约 | 读者 |

### 服务预约（4 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/service-appointments/me` | 我的服务预约 | 读者 |
| POST | `/api/service-appointments` | 创建服务预约 | 读者 |
| PUT | `/api/service-appointments/{id}/cancel` | 取消 | 读者 |
| PUT | `/api/service-appointments/{id}/status` | 更新状态 | 管理员 |

### 仪表盘统计（3 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/admin/dashboard/stats` | 核心统计指标 | 管理员 |
| GET | `/api/admin/dashboard/analytics` | 趋势分析 | 管理员 |
| GET | `/api/admin/dashboard/overview` | 概览数据 | 管理员 |

### RBAC 权限管理（6 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/admin/roles` | 角色列表 | 管理员 |
| POST | `/api/admin/roles` | 创建角色 | 管理员 |
| PUT | `/api/admin/roles/{id}` | 更新角色 | 管理员 |
| DELETE | `/api/admin/roles/{id}` | 删除角色 | 管理员 |
| PUT | `/api/admin/users/{id}/roles` | 分配用户角色 | 管理员 |
| GET | `/api/admin/roles/audit-logs` | 审计日志 | 管理员 |

### 用户管理与其他（5+ 个端点）

| 方法 | 路径 | 说明 | 角色 |
|---|---|---|---|
| GET | `/api/users/me/profile` | 个人资料 | 登录 |
| PUT | `/api/users/me/profile` | 更新资料 | 登录 |
| GET | `/api/users/me/overview` | 个人概览 | 登录 |
| GET | `/api/admin/users` | 用户列表（分页筛选） | 管理员 |
| PUT | `/api/admin/users/{id}/status` | 封禁/解封 | 管理员 |
| POST | `/api/behavior-logs` | 记录行为日志 | 公开 |
| GET | `/api/public/home` | 首页聚合数据 | 公开 |

## 3. 安全与权限体系

```
公开端点（无需 Token）
  └─ 登录、注册、找回密码、图书列表、热词

读者端点（需 JWT Token + USER 角色）
  └─ 借阅、预约、收藏、评论、通知、个人中心

管理端点（需 JWT Token + ADMIN 角色或特定权限）
  └─ 图书管理、借阅管理、罚款管理、用户管理、RBAC

细粒度权限（@PreAuthorize 方法级控制）
  ├─ loan:manage → 借阅管理操作
  ├─ fine:waive  → 罚款豁免
  └─ 其他自定义权限...
```
