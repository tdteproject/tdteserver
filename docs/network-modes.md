# Backend Network Modes

The backend can be used in two ways:

## 1. Local Server

Use this for development on the same machine.

Run the backend normally, then verify:

- `http://127.0.0.1:3000/health`

## 2. Public Tunnel

Use this when the mobile app must be reachable from any phone anywhere.

Start the tunnel:

- `D:\PDT_App\PDT_backend\scripts\start-cloudflare-tunnel.ps1`

The script prints a public `https://*.trycloudflare.com` URL.

## Important

- Keep the backend running on port `3000`.
- Keep the tunnel process running while you test the APK.
- If the tunnel URL changes, update the frontend environment and rebuild the APK.

## Health Check

After starting the tunnel, verify both endpoints:

- Local: `http://127.0.0.1:3000/health`
- Public: `https://<your-tunnel>.trycloudflare.com/health`
