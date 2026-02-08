## 2026-02-08 Video Proxy Notes (Own Server)

### What proxying means

- Using URLs like `http://<api>/api/video/...` means the browser streams video THROUGH the API.
- Traffic path: Browser → API (`/api/video/*`) → upstream CDN → API → Browser.
- Range requests should be forwarded so the player can seek (`206 Partial Content`).

### Load characteristics

- Main bottleneck is bandwidth + concurrent connections (not CPU).
- Memory impact should be moderate if response bodies are streamed (not buffered).

### Rough concurrency math

- Convert video size+duration to average bitrate.
  - Example: 10 MB over 100–120s ≈ 0.67–0.80 Mbps average per viewer.
- Rough concurrency ≈ usable_egress_Mbps / avg_bitrate_Mbps.
- Use only ~50–70% of measured peak throughput for safety margin.

### How to measure server throughput (Cloudflare)

- Download endpoint: `https://speed.cloudflare.com/__down?bytes=<N>`
- Upload endpoint: `https://speed.cloudflare.com/__up`
- Convert bytes/sec to Mbps: `Mbps = bytes_per_sec * 8 / 1_000_000`.

Example download (200MB):

```bash
curl -4 -L -o /dev/null -s -w "%{speed_download}\n" \
  "https://speed.cloudflare.com/__down?bytes=200000000" \
| awk '{printf "download_mbps=%.2f\n", ($1*8/1000000)}'
```

Example upload (100MB):

```bash
dd if=/dev/zero bs=1M count=100 2>/dev/null | \
curl -4 -s -o /dev/null -w "%{speed_upload}\n" \
  -X POST --data-binary @- "https://speed.cloudflare.com/__up" \
| awk '{printf "upload_mbps=%.2f\n", ($1*8/1000000)}'
```

### If curl shows 0 speed

- Often indicates the HTTPS request failed.
- If `curl -k` works but normal curl fails, the issue is TLS verification (CA bundle / MITM / trust store).
- Fix TLS trust before relying on upstream HTTPS in production.

### Stability checklist

- Fix TLS trust issues (avoid `-k`).
- Check/raise file descriptor limits (`ulimit -n`).
- Ensure reverse proxy (nginx/caddy) timeouts support long-lived streaming.
- Consider basic rate limiting on `/api/video/*`.
- Monitor: egress Mbps, concurrent connections, and 5xx rate.
