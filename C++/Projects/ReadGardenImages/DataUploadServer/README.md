# Data Upload Server

A small FastAPI app for collecting garden-image training data remotely: classification
samples (labeled, sorted into train/valid/test) and raw unlabeled images for the crop
detector. No authentication — anyone with the URL can upload (deliberate choice, see
"Security" below).

## Setup

```bash
pip install -r requirements.txt
```

## Running locally

```bash
python app.py
```

Defaults to `http://127.0.0.1:8000`. Configurable via environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `UPLOAD_HOST` | `127.0.0.1` | interface to bind to |
| `UPLOAD_PORT` | `8000` | port to bind to |
| `SSL_CERTFILE` / `SSL_KEYFILE` | unset | set both to serve HTTPS directly instead of plain HTTP |

## Uploading files

### Web UI

Open `http://127.0.0.1:8000/` (or your tunnel URL) in a browser. Two forms:

- **Classification sample** — pick an image, type a label (autocompletes from existing
  classes), pick a split (`train`/`valid`/`test`), optionally check "Allow creating a new
  class" if the label doesn't exist yet.
- **Unlabeled detection sample** — just pick an image; it lands in the crop-detector's
  incoming-images folder for later labeling.

### CLI / curl

Classification sample:

```bash
curl -X POST http://127.0.0.1:8000/upload/classification \
  -F "file=@/path/to/image.jpg" \
  -F "label=Tomato_healthy" \
  -F "split=train"
```

Add `-F "allow_new_class=true"` to create a brand-new label instead of using an existing
one.

Unlabeled detection sample:

```bash
curl -X POST http://127.0.0.1:8000/upload/detection \
  -F "file=@/path/to/image.jpg"
```

### Other endpoints

- `GET /health` — liveness check, returns `{"status": "ok"}`
- `GET /classes` — lists known classification labels (subdirectories under
  `ClassificationModelTraining/classification_data/train/`)

## Where files land

- Classification: `ClassificationModelTraining/classification_data/<split>/<label>/<uuid>.<ext>`
- Detection: `ImageCropModelTraining/incoming_unlabeled/<uuid>.<ext>`

Allowed extensions: `.jpg`, `.jpeg`, `.png`. Labels are restricted to letters, digits, and
underscores (prevents path traversal).

## Exposing it remotely (Cloudflare Tunnel)

This app is meant to run behind a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
rather than being port-forwarded directly, so you get free HTTPS and don't need to open
anything on your router.

1. `cloudflared tunnel login`
2. `cloudflared tunnel create garden-upload`
3. Add a DNS route: `cloudflared tunnel route dns garden-upload upload.yourdomain.com`
4. Create `%USERPROFILE%\.cloudflared\config.yml`:
   ```yaml
   tunnel: <tunnel-id>
   credentials-file: C:\Users\<you>\.cloudflared\<tunnel-id>.json

   ingress:
     - hostname: upload.yourdomain.com
       service: http://127.0.0.1:8000
     - service: http_status:404
   ```
5. Run the server (`python app.py`), then in another terminal: `cloudflared tunnel run garden-upload`

## Security

There is **no authentication** on this app, by explicit choice — anyone with the tunnel
URL can upload files or pollute the dataset. Acceptable tradeoffs given this is a
throwaway data-collection tool, but keep in mind:

- Don't share the URL publicly.
- Uploaded files aren't scanned/validated beyond extension + label checks — don't treat
  this as a hardened public-facing service.
- If this ever needs real protection, options are HTTP Basic Auth in `app.py` or a
  [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
  policy in front of the tunnel — neither is currently in place.
