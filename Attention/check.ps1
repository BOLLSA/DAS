# ========== 黑暗中世纪 · 语法检查脚本 ==========
# 逐个检查全部 JS 文件（需安装 Node.js），每次修改后一键执行
# 用法：在 Attention 目录运行  ./check.ps1  （或 powershell -File Attention/check.ps1）
# 注意：脚本位于 Attention/ 子目录，游戏根目录为其父目录

$ErrorActionPreference = 'Continue'
Set-Location -Path (Split-Path -Parent $PSScriptRoot)   # 切换到游戏根目录（Attention 的父目录），保证相对路径可用
$files = @(
    'js/cards.js',
    'js/game-state.js',
    'js/battle-engine.js',
    'js/skill-charge.js',
    'js/skill-active.js',
    'js/skill-config.js',
    'js/game-flow.js',
    'js/equipment.js',
    'js/decks.js',
    'js/targeting.js',
    'js/ui.js',
    'js/ui-overlay.js',
    'js/ai.js',
    'js/network.js',
    'js/main.js'
)

$failed = 0
foreach ($f in $files) {
    node --check $f 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Output ("OK    " + $f)
    } else {
        Write-Output ("FAIL  " + $f)
        $failed++
    }
}
Write-Output ""
if ($failed -eq 0) {
    Write-Output ("全部通过：" + $files.Count + " 个文件无语法错误")
} else {
    Write-Output ("存在语法错误的文件数：" + $failed)
}
