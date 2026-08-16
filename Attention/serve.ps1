# 简易 HTTP 服务器 (TcpListener) - 无需管理员权限
$port = 8080
$root = $PSScriptRoot

# 获取本机局域网IP
$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.*' } | Select-Object -ExpandProperty IPAddress

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
    '.ttf'  = 'font/ttf'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  服务器已启动 (端口 $port)" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "电脑访问: http://localhost:$port" -ForegroundColor White
Write-Host "手机访问 (确保同一WiFi):" -ForegroundColor Cyan
foreach ($ip in $ips) {
    Write-Host "  http://${ip}:$port" -ForegroundColor Yellow
}
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止" -ForegroundColor Gray
Write-Host ""

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        
        # 读取HTTP请求
        $buffer = New-Object byte[] 8192
        $read = $stream.Read($buffer, 0, $buffer.Length)
        if ($read -le 0) { $client.Close(); continue }
        
        $requestText = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $read)
        $firstLine = ($requestText -split "`n")[0]
        $path = ($firstLine -split ' ')[1]
        
        if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
        
        # 解码URL
        $path = [System.Uri]::UnescapeDataString($path)
        $filePath = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
        
        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $header = "HTTP/1.1 200 OK`r`n" +
                      "Content-Type: $contentType`r`n" +
                      "Content-Length: $($fileBytes.Length)`r`n" +
                      "Connection: close`r`n" +
                      "Access-Control-Allow-Origin: *`r`n" +
                      "Cache-Control: no-cache`r`n" +
                      "`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($fileBytes, 0, $fileBytes.Length)
            Write-Host "[200] $path" -ForegroundColor DarkGray
        } else {
            $body = "404 Not Found: $path"
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            $header = "HTTP/1.1 404 Not Found`r`n" +
                      "Content-Type: text/plain; charset=utf-8`r`n" +
                      "Content-Length: $($bodyBytes.Length)`r`n" +
                      "Connection: close`r`n" +
                      "`r`n"
            $headerBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($headerBytes, 0, $headerBytes.Length)
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            Write-Host "[404] $path" -ForegroundColor Red
        }
        
        $stream.Close()
        $client.Close()
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
}
