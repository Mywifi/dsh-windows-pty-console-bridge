# DeepSeek Harness Windows PTY 兼容修复

[English](README.md) · [下载安装包](https://github.com/Mywifi/dsh-windows-pty-console-bridge/releases) · MIT 开源许可

这是独立的 Host/Cordis 插件，处理 Windows 桌面端启动 PowerShell 工具时反复出现的 **`PTY shell exited during startup`**。已定位的场景是：Electron 可执行文件在 ConPTY 中直接启动 Windows ACL 沙箱 runner，尚未进入 PowerShell 就退出。

插件通过一个小型 CMD 桥为同一个 runner 建立控制台，保留原有沙箱策略、工作目录、参数、取消信号及终端设置。可以继续使用“工作区内修改”权限；不需要改变模型 API 配置。这是社区兼容方案，不是 DeepSeek 官方补丁。

## 安装和迁移

1. 从 [Releases](https://github.com/Mywifi/dsh-windows-pty-console-bridge/releases) 下载 `.tgz`，或下载并解压 `-windows.zip`。建议保留在固定目录，方便修复和重装。
2. 桌面端打开“插件 → 添加插件 → 安装第三方插件”，填入 `.tgz` 的完整路径，启用“Windows PTY 兼容修复”。
3. 插件管理器如提示重启，完成当前任务后重启。让 Agent 在“工作区内修改”模式仅调用一次 PowerShell，执行 `Write-Output 'DSH_PTY_VERIFY_OK'`，核对真实工具结果成功。

更换安装包位置或升级版本时，也通过同一个官方插件管理入口安装新 `.tgz`。不要手动编辑 profile 清单；旧包请保留到新版本验收完成。若还有早期手写修复入口，先备份移除，避免重复包装。

也可以先完整退出桌面端，在解压目录运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
# 自定义 Harness 安装目录
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -HarnessDirectory "D:\Apps\DeepSeek Harness"
# 卸载
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1 -Action Remove
```

安装器核对随包 SHA-256，再调用已有 Harness 的官方插件命令。不会自动结束会话，也不修改系统执行策略。校验用于检查文件完整性；安装包和校验清单都应从本项目发布页获取。无需 Node/Python、模型文件或 API 密钥。

## 更新后会保留吗

插件安装在用户 profile，常规应用更新通常会保留。但 Harness 如果改变 subprocess 接口、runner 路径或启动方式，插件可能失效，不能保证所有后续版本兼容。每次更新后重做上述 PowerShell 检查；官方修复后可先关闭本插件验证，再卸载。

1.0.2 发布归档已在 Windows Desktop **0.2.2-rc.1** 自带引擎中通过中文/空格路径、真实 workspace-write ConPTY/PowerShell 执行，以及 Cordis **4.1.0** 实际代理连续三轮启停验收。原 1.0.1 另已完成桌面端真实安装、展示、关闭/重开和 Agent PowerShell 工具执行验收。清单声明的 optional peer 范围不是全部版本的测试承诺。当前开源版本的具体变化见 [CHANGELOG.md](CHANGELOG.md)。

## 实现与限制

- 按上游 `cordis-plugin-development` 的 Host 插件方式组织：bundle patch、图标、中英文元数据及 `ctx.effect` 生命周期。
- 只匹配当前 Electron 可执行文件和其安装目录内的 Windows ACL runner。CLI Node、其他系统和其他 runner 原样放行。若服务方法缺失则明确报错；runner 路径变化则不介入。
- 用 `cmd.exe /d /c call bridge.cmd` 启动同一个 runner，完整保留沙箱参数；启停通过原始属性描述符恢复，适配 Cordis 每次读取产生新函数代理的行为。
- 支持空格及中文路径。匹配调用的参数或插件路径若含双引号、`% ! & | < > ^` 或 ASCII 控制字符，会在启动前拒绝，避免 CMD/CALL 展开导致语义变化。
- 不包含遥测、网络请求、密钥或后台采集，不修复所有类型的终端故障。

## 开发、打包

开发需 Node.js 22+；打包另需 Python 3.10+。运行时没有第三方依赖。

```sh
npm test
npm run release:build
npm run release:verify
```

版本来自 `package.json`，产物在 `dist/`，包括 tgz、便携安装 ZIP 和 SHA-256。安装脚本使用 UTF-8 BOM，兼容 Windows PowerShell 5.1。可用环境变量 `PYTHON` 指定 Python。CI 在 Windows/Linux 和 Node 22/24 下运行回归及打包检查；CI 没有桌面端，不能替代真实 Harness 验收。推送 `v版本号` 标签会自动发布安装包。

详见 [English README](README.md)、[贡献说明](CONTRIBUTING.md)、[安全说明](SECURITY.md)。
