# QMuse 发布说明

GitHub 与 QMuse 使用同一套 WeekEat 功能源码，但采用独立发布策略：

- GitHub 版本来自 `package.json`，并检查 GitHub Release 更新。
- QMuse 版本来自 `qmuse.config.json`，不检查 GitHub Release，也不显示“版本更新”入口。

发布 QMuse 前执行：

```bash
npm run qmuse:prepare
npx --yes @qmuse/qmuse-cli import .qmuse-stage
```

准备脚本会重新生成被 Git 忽略的 `.qmuse-stage/`，仅包含 Web 端运行所需文件，并在该副本中关闭更新检查。不要手动修改 `.qmuse-stage/`，所有功能修改都应在主项目完成。

当需要标记 QMuse 新版本时，只更新 `qmuse.config.json` 的 `version`；GitHub 的 `package.json` 不受影响。
