# AvatarSideClassifierWeb

简短说明：这是一个通过上传截图自动记录角色BP状态的应用。使用了来自 https://github.com/babalae/better-genshin-impact 的角色头像识别模型来辅助头像识别。

## 目录
- 简介
- 先决条件
- 本地启动（快速入门）
- 常见问题与故障排查
- 贡献

## 简介
此仓库包含一个基于 .NET 的小型 Web 应用，用于演示。项目会在本地开启一个 HTTP 服务并在浏览器中提供示例页面。

## 先决条件
- 已安装 .NET SDK（建议 .NET 8 或更高）
- Git（用于克隆仓库）

## 本地启动（快速入门）
按以下步骤在 Windows 上快速启动项目：

1. 打开 PowerShell（或命令提示符），进入想要存放项目的目录：

```powershell
# 示例：在桌面创建文件夹并进入
mkdir AvatarSideClassifierWeb
cd AvatarSideClassifierWeb
```

2. 克隆仓库：

```powershell
git clone https://github.com/kunkun11451/AvatarSideClassifierWeb.git .
```

3. 启动应用：

```powershell
dotnet run
```

4. 在浏览器中打开：

```
http://localhost:5000/
```

如果 `dotnet run` 显示类似输出（Now listening on: http://localhost:5000），表示服务已启动。

### 在后台运行并获取 PID（可选）
如果你想让应用在后台运行并立即获取进程 PID：

```powershell
$proc = Start-Process -FilePath "dotnet" -ArgumentList "run" -PassThru
$proc.Id
```

## 常见问题与故障排查
- 当前处于测试阶段，可能会有大量BUG、教程未补全与交互逻辑不合理之处
- 如果端口被占用，尝试更改应用监听端口或结束占用进程（查找 PID：`Get-NetTCPConnection -LocalPort 5000`）。
- 如果需要查看 dotnet 进程的完整命令行，可使用：

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "AvatarSideClassifierWeb" } | Select-Object ProcessId, CommandLine
```

## 贡献
欢迎提交 issue 或 PR，改进示例、添加测试或改进文档。
