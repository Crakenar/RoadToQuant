import os
import re
import sys
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parent  # ReadGardenImages/

CLASSIFICATION_DATA_ROOT = PROJECT_ROOT / "ClassificationModelTraining" / "classification_data"
DETECTION_INCOMING_ROOT = PROJECT_ROOT / "ImageCropModelTraining" / "incoming_unlabeled"

ALLOWED_SPLITS = {"train", "valid", "test"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
LABEL_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")

# No auth by design (deliberate choice - see README): anyone with the URL can upload.
app = FastAPI(title="Garden Data Upload Server")


def _known_classes() -> list[str]:
    train_dir = CLASSIFICATION_DATA_ROOT / "train"
    if not train_dir.exists():
        return []
    return sorted(p.name for p in train_dir.iterdir() if p.is_dir())


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file extension '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")
    return ext


def _validate_label(label: str) -> str:
    if not LABEL_PATTERN.match(label):
        raise HTTPException(400, "label must contain only letters, digits, and underscores")
    return label


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/classes")
def list_classes():
    return {"classes": _known_classes()}


@app.post("/upload/classification")
async def upload_classification(
    file: UploadFile = File(...),
    label: str = Form(...),
    split: str = Form("train"),
    allow_new_class: bool = Form(False),
):
    if split not in ALLOWED_SPLITS:
        raise HTTPException(400, f"split must be one of {sorted(ALLOWED_SPLITS)}")

    label = _validate_label(label)

    known = _known_classes()
    if label not in known and not allow_new_class:
        raise HTTPException(
            400,
            f"Unknown class '{label}'. Pass allow_new_class=true to create it, "
            f"or pick one of: {known}",
        )

    ext = _validate_extension(file.filename)
    target_dir = CLASSIFICATION_DATA_ROOT / split / label
    target_dir.mkdir(parents=True, exist_ok=True)

    target_path = target_dir / f"{uuid.uuid4().hex}{ext}"
    target_path.write_bytes(await file.read())

    return JSONResponse({"saved_to": str(target_path.relative_to(PROJECT_ROOT))})


@app.post("/upload/detection")
async def upload_detection(file: UploadFile = File(...)):
    ext = _validate_extension(file.filename)
    DETECTION_INCOMING_ROOT.mkdir(parents=True, exist_ok=True)

    target_path = DETECTION_INCOMING_ROOT / f"{uuid.uuid4().hex}{ext}"
    target_path.write_bytes(await file.read())

    return JSONResponse({"saved_to": str(target_path.relative_to(PROJECT_ROOT))})


@app.get("/", response_class=HTMLResponse)
def upload_page():
    return """
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Garden Data Upload</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
  fieldset { margin-bottom: 2rem; }
  label { display: block; margin-top: 0.75rem; }
  input, select { width: 100%; padding: 0.4rem; box-sizing: border-box; }
  button { margin-top: 1rem; padding: 0.5rem 1rem; }
  pre { background: #f4f4f4; padding: 0.75rem; white-space: pre-wrap; word-break: break-all; }
</style>
</head>
<body>
<h1>Garden Data Upload</h1>

<fieldset>
  <legend>Classification sample</legend>
  <form id="cls-form">
    <label>Image <input type="file" name="file" accept=".jpg,.jpeg,.png" required></label>
    <label>Label <input type="text" name="label" list="known-classes" required></label>
    <datalist id="known-classes"></datalist>
    <label>Split
      <select name="split">
        <option value="train">train</option>
        <option value="valid">valid</option>
        <option value="test">test</option>
      </select>
    </label>
    <label><input type="checkbox" name="allow_new_class" style="width:auto"> Allow creating a new class</label>
    <button type="submit">Upload</button>
  </form>
</fieldset>

<fieldset>
  <legend>Unlabeled detection sample</legend>
  <form id="det-form">
    <label>Image <input type="file" name="file" accept=".jpg,.jpeg,.png" required></label>
    <button type="submit">Upload</button>
  </form>
</fieldset>

<pre id="result"></pre>

<script>
async function populateClasses() {
  const res = await fetch("/classes");
  if (!res.ok) return;
  const { classes } = await res.json();
  const list = document.getElementById("known-classes");
  list.innerHTML = classes.map(c => `<option value="${c}">`).join("");
}

async function submitForm(formEl, url) {
  const formData = new FormData(formEl);
  const checkbox = formEl.querySelector('input[name="allow_new_class"]');
  if (checkbox) formData.set("allow_new_class", checkbox.checked ? "true" : "false");

  const res = await fetch(url, { method: "POST", body: formData });
  const text = await res.text();
  document.getElementById("result").textContent = `${res.status} ${res.statusText}\n${text}`;
  if (res.ok) {
    formEl.reset();
    populateClasses();
  }
}

document.getElementById("cls-form").addEventListener("submit", e => {
  e.preventDefault();
  submitForm(e.target, "/upload/classification");
});
document.getElementById("det-form").addEventListener("submit", e => {
  e.preventDefault();
  submitForm(e.target, "/upload/detection");
});

populateClasses();
</script>
</body>
</html>
"""


if __name__ == "__main__":
    import uvicorn

    ssl_certfile = os.environ.get("SSL_CERTFILE")
    ssl_keyfile = os.environ.get("SSL_KEYFILE")
    host = os.environ.get("UPLOAD_HOST", "127.0.0.1")
    port = int(os.environ.get("UPLOAD_PORT", "8000"))

    if bool(ssl_certfile) != bool(ssl_keyfile):
        raise RuntimeError("Set both SSL_CERTFILE and SSL_KEYFILE, or neither.")

    if not ssl_certfile and host != "127.0.0.1":
        print(
            "WARNING: binding to a non-localhost host with no auth in this app and no "
            "SSL_CERTFILE/SSL_KEYFILE set. Make sure something in front of this "
            "(Cloudflare Access, a reverse proxy, etc.) is actually gating access.",
            file=sys.stderr,
        )

    uvicorn.run(app, host=host, port=port, ssl_certfile=ssl_certfile, ssl_keyfile=ssl_keyfile)
