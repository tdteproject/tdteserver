$port = if ($env:PORT) { $env:PORT } else { 3000 }
$target = "http://127.0.0.1:$port"

Write-Host "[Cloudflare Tunnel] Starting tunnel for $target"
Write-Host "[Cloudflare Tunnel] Make sure `cloudflared` is installed and authenticated."
Write-Host "[Cloudflare Tunnel] Copy the https://*.trycloudflare.com URL into the Android app build env."

cloudflared tunnel --url $target
