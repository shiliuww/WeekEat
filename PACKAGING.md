# Packaging Guide

这份项目已经预留了两条打包线：

- Windows 桌面端：Electron
- Android 移动端：Capacitor

## 1. Windows exe

### 开发运行

```bash
npm install
npm run desktop:dev
```

### 打包

```bash
npm run desktop:build
```

说明：

- 当前脚本使用 `electron-builder`
- 默认目标是 `nsis` 和 `portable`
- 在 macOS 上打 Windows 安装包时，可能还需要额外的系统依赖；如果本机环境不完整，建议在 Windows CI 或 Windows 机器上执行

## 2. Android app

### 前置条件

- 安装 Android Studio
- 安装 Android SDK
- 配置好 `ANDROID_HOME`

### 初始化 / 同步

```bash
npm install
npm run android:sync
```

### 打开 Android Studio

```bash
npm run android:open
```

然后在 Android Studio 中：

1. 等 Gradle 同步完成
2. 连接真机或启动模拟器
3. 选择 `Build APK` 或 `Build App Bundle`

## 3. 建议发布流程

1. 完成 Web 功能和测试
2. 跑 `npm run test`
3. 跑 `npm run build`
4. 发布 GitHub 仓库
5. 再分别执行桌面端 / Android 端打包

## 4. 发布前建议补充

- 应用图标
- LICENSE
- `.env.example`
- GitHub Actions 自动构建流程
- Release Notes 模板
