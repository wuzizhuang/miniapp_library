# 智慧图书馆 Android 客户端

`front-android/` 是智慧图书馆系统的 Android 读者端，基于 Expo、React Native 和 TypeScript 开发，复用后端现有接口契约。

## 模块职责

- 提供读者移动端页面：登录、首页、馆藏、图书详情、书架、借阅、预约、罚款、通知、反馈、推荐
- 负责 Android 端登录态持久化、页面导航、接口调用和移动端交互
- 只面向读者侧，不包含后台管理能力

## 基础结构

- `App.tsx`：应用入口
- `src/navigation/`：底部 Tab 与栈导航
- `src/screens/`：业务页面
- `src/services/`：HTTP 请求和 API 封装
- `src/store/`：认证上下文与登录态
- `src/components/`：移动端通用 UI 组件
- `src/types/`：接口和业务类型
- `src/utils/`：存储、格式化、事件工具
- `android/`：原生 Android 工程
- `.env`：后端接口地址

## 技术栈

- Expo SDK 53
- React Native 0.79
- React 19
- TypeScript
- React Navigation
- AsyncStorage

## 运行环境

- Node.js 20 LTS
- JDK 17
- Android Studio 或 Android SDK
- 可用的 Android 模拟器或真机
- 已启动的后端服务

默认 Android 模拟器后端地址：

```text
http://10.0.2.2:8089/api
```

## 快速启动

### 1. 安装依赖

```powershell
cd front-android
npm install
```

### 2. 配置环境变量

```powershell
Copy-Item .env.example .env
```

环境变量：

- `EXPO_PUBLIC_API_BASE_URL`：后端 API 根地址

说明：

- Android Studio 模拟器访问宿主机请使用 `10.0.2.2`
- 真机或第三方模拟器请改成局域网 IP 或公网地址，不要写 `localhost`

### 3. 启动开发服务

```powershell
cd front-android
npm run start
```

### 4. 启动 Android

```powershell
cd front-android
npm run android
```

## 本地编译 APK

### 编译前准备

先确认本机使用的是 JDK 17：

```powershell
$env:JAVA_HOME="C:\Program Files\Java\jdk-17"
$env:Path="$env:JAVA_HOME\bin;$env:Path"
java -version
```

并确保已配置以下任一环境变量：

- `ANDROID_HOME`
- `ANDROID_SDK_ROOT`

如果没有，也可以在 `android/local.properties` 中指定：

```properties
sdk.dir=C:\\Users\\你的用户名\\AppData\\Local\\Android\\Sdk
```

### 生成调试 APK

```powershell
cd front-android
npm run android:debug
```

输出文件：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### 生成发布 APK

```powershell
cd front-android
npm run android:release
```

输出文件：

```text
android/app/build/outputs/apk/release/app-release.apk
```

发布签名前准备：

在 `android/gradle.properties`、系统环境变量，或当前终端会话中提供以下 4 个值：

- `LIBRARY_UPLOAD_STORE_FILE`
- `LIBRARY_UPLOAD_STORE_PASSWORD`
- `LIBRARY_UPLOAD_KEY_ALIAS`
- `LIBRARY_UPLOAD_KEY_PASSWORD`

PowerShell 示例：

```powershell
$env:LIBRARY_UPLOAD_STORE_FILE="C:\keystores\library-release.jks"
$env:LIBRARY_UPLOAD_STORE_PASSWORD="你的-keystore-密码"
$env:LIBRARY_UPLOAD_KEY_ALIAS="library-release"
$env:LIBRARY_UPLOAD_KEY_PASSWORD="你的-key-密码"
npm run android:release
```

说明：

- release 默认不再复用调试签名
- 只做本地联调时，可临时设置 `LIBRARY_ALLOW_DEBUG_SIGNING_FOR_RELEASE=true`
- 正式分发前建议将后端切换为 HTTPS，避免依赖明文 HTTP

## 常用命令

```powershell
cd front-android
npm run start
npm run android
npm run doctor
npm run android:debug
npm run android:release
npm run typecheck
```

## 联调说明

- 默认通过 `.env` 中的 `EXPO_PUBLIC_API_BASE_URL` 对接后端
- 与 Web 端、小程序端复用同一套业务接口
- debug 构建允许明文 HTTP，便于本地模拟器直连
- release 构建建议只连接 HTTPS 接口

## 开发说明

- 这是 React Native 客户端，不复用 Web 的 DOM 组件
- 页面能力要和后端接口保持一致，优先补主流程闭环
- 工具链以 `JDK 17 + Node 20 LTS` 为稳定基线

## 当前边界

- 当前只覆盖读者侧
- 找回密码仍依赖当前后端联调方式
- 真机调试需要手动切换 API 地址
