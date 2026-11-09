param(
    [ValidateSet('Install', 'Remove')][string]$Action = 'Install',
    [string]$HarnessDirectory,
    [string]$Profile = 'desktop'
)
$ErrorActionPreference = 'Stop'
if ($Profile -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Profile名称无效。' }
if (Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue) {
    throw '请先完整退出 DeepSeek Harness 桌面端，再运行此脚本。脚本不会自动结束会话。'
}
$candidates = @()
if ($HarnessDirectory) { $candidates += $HarnessDirectory }
if ($env:LOCALAPPDATA) { $candidates += Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness' }
if ($env:ProgramFiles) { $candidates += Join-Path $env:ProgramFiles 'DeepSeek Harness' }
$dshCommand = $null
foreach ($candidate in $candidates) {
    $command = Join-Path $candidate 'resources\runtime\cli\bin\dsh.cmd'
    if (Test-Path -LiteralPath $command -PathType Leaf) { $dshCommand = $command; break }
}
if (-not $dshCommand) {
    $onPath = Get-Command dsh.cmd -ErrorAction SilentlyContinue
    if ($onPath) { $dshCommand = $onPath.Source }
}
if (-not $dshCommand) { throw '找不到已安装的Harness。请用 -HarnessDirectory 指定安装目录。' }
if ($Action -eq 'Remove') {
    & $dshCommand plugin --profile $Profile remove dsh-windows-pty-console-bridge
} else {
    $release = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'release.json') -Raw | ConvertFrom-Json
    if ($release.name -ne 'dsh-windows-pty-console-bridge' -or $release.version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid release metadata.' }
    $archiveName = 'dsh-windows-pty-console-bridge-' + $release.version + '.tgz'
    if ($release.archive -cne $archiveName) { throw 'Archive name does not match release metadata.' }
    $archive = Join-Path $PSScriptRoot $archiveName
    $checksums = Join-Path $PSScriptRoot 'SHA256SUMS.txt'
    if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw "缺少安装包：$archiveName" }
    $expected = Get-Content -LiteralPath $checksums | Where-Object { $_ -match ('^[a-fA-F0-9]{64}\s+\*?' + [regex]::Escape($archiveName) + '$') }
    if (@($expected).Count -ne 1) { throw '安装包的SHA-256校验记录缺失或不唯一。' }
    $expectedHash = ($expected -split '\s+')[0]
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    $archiveStream = [System.IO.File]::OpenRead($archive)
    try { $actualHash = [System.BitConverter]::ToString($algorithm.ComputeHash($archiveStream)).Replace('-', '') }
    finally { $archiveStream.Dispose(); $algorithm.Dispose() }
    if ($actualHash -ine $expectedHash) { throw '安装包SHA-256校验失败，请重新复制完整ZIP。' }
    & $dshCommand plugin --profile $Profile add $archive
}
if ($LASTEXITCODE -ne 0) { throw "Harness插件操作失败，退出码：$LASTEXITCODE" }
Write-Output '操作成功。重新打开桌面端，在插件页面查看 Windows PTY 兼容修复。'
