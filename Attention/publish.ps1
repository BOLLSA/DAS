# ========== 黑暗中世纪 · 正式版发布脚本 ==========
# 把当前成熟版本拷贝到桌面 DAS 的正式版本目录（按既有文件夹格式）
# 格式：C:\Users\WhereIt\Desktop\DAS\正式版本\1.01\<命名文件夹>\
# 命名规则：Dark Age Saga + 本次改动一句话总结（例如 "Dark Age Saga单位改名与界面卡顿优化"）
# 用法：powershell -File Attention/publish.ps1 -FolderName "Dark Age Saga单位改名与界面卡顿优化"
# 注意：脚本位于 Attention/ 子目录，游戏根目录为其父目录；发布的副本保留 Attention/（文档与脚本随行）

param(
    [Parameter(Mandatory = $true)][string]$FolderName
)

$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot   # 游戏根目录 = Attention 的父目录
$attDir = $PSScriptRoot                        # Attention 目录（文档与开发脚本）
Set-Location -Path $gameRoot

$src = $gameRoot
$dasRoot = "C:\Users\WhereIt\Desktop\DAS"
$versionDir = Join-Path $dasRoot "正式版本\1.01"
$dest = Join-Path $versionDir $FolderName

Write-Host "来源: $src"
Write-Host "目标: $dest"

# 1. 目标文件夹已存在则中止（防止覆盖旧版本）
if (Test-Path $dest) {
    Write-Host "错误：目标文件夹已存在：$dest" -ForegroundColor Red
    exit 1
}

# 2. 创建版本目录
New-Item -ItemType Directory -Path $versionDir -Force | Out-Null

# 3. 干净拷贝游戏文件（排除 .git、日志与临时文件；Attention 目录整体随行）
robocopy $src $dest /E /XD .git /XF _check.log *.log /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) {
    Write-Host "错误：拷贝失败（robocopy 退出码 $LASTEXITCODE）" -ForegroundColor Red
    exit 1
}

# 4. 同步更新 DAS 根目录的交接文档与更新日志（从 Attention 读取）
Copy-Item -Path (Join-Path $attDir "AI_HANDOVER（游戏有改动随时更新我）.md") `
          -Destination (Join-Path $dasRoot "AI_HANDOVER（游戏有改动随时更新我）.md") -Force
Copy-Item -Path (Join-Path $attDir "Dark Age Saga更新日志.md") `
          -Destination (Join-Path $dasRoot "Dark Age Saga更新日志.md") -Force -ErrorAction SilentlyContinue
Copy-Item -Path (Join-Path $attDir "RELEASE_CHECKLIST.md") `
          -Destination (Join-Path $dasRoot "RELEASE_CHECKLIST.md") -Force -ErrorAction SilentlyContinue

# 5. 验证文件数量
$srcCount = (Get-ChildItem $src -Recurse -File | Where-Object { $_.FullName -notmatch '\\\.git\\' }).Count
$destCount = (Get-ChildItem $dest -Recurse -File).Count

Write-Host ""
Write-Host "发布完成：$dest" -ForegroundColor Green
Write-Host "源文件数: $srcCount  |  目标文件数: $destCount"
if ($srcCount -ne $destCount) {
    Write-Host "警告：文件数量不一致，请人工核对！" -ForegroundColor Yellow
}
