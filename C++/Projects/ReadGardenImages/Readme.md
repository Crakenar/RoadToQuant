# Plant Disease Detection Pipeline — Architecture Recap

## Problem

Detecting disease/stress symptoms (fungal spots, water stress, nutrient deficiency) on garden plant photos, across **multiple species**, using C++ and OpenCV as the core stack.

## Why raw thresholding isn't enough

Classic OpenCV approaches (Otsu thresholding, HSV color masks) are good for **segmenting** a leaf from the background, but not for **classifying disease**. Symptom color, texture, and shape vary heavily by species and lighting condition. Hardcoded thresholds tuned for one species/photo will break on another. Contour-based auto-crop and saliency detection were also evaluated as classical fallbacks — both work as a rough first pass, but neither generalizes across mixed subjects (leaves, fruit, flowers) reliably.

## Two-model pipeline

The system is split into two independently-trained models, chained at inference time:

- **Job 1 — Crop detection**: given a raw garden photo, find and crop to the plant/leaf region. Solves the "photo taken from any distance/angle/framing" problem that a fixed `cv::Range()` crop can't handle.
- **Job 2 — Health classification**: given the *cropped* image from Job 1, classify healthy vs. diseased (and disease type).

Each is its own train → export → run cycle. They are not the same model at different stages — they're two separate ONNX files chained together in the C++ app.

### Pipeline A — Training (offline, Python, done once per model)

1. **Job 1 dataset**: object-detection format (bounding boxes), currently PlantDoc via Roboflow's public object-detection export (`public.roboflow.com/object-detection/plantdoc/1`, YOLOv8 format, CC BY 4.0 license). Known limitation: PlantDoc is leaf/disease-focused across ~13 species — it has **no flower class**, so Job 1 currently crops leaves reliably but performs poorly on flowers (see "Known limitations" below). Additional fruit/flower detection datasets from Roboflow Universe are the next step to broaden coverage.
2. **Job 2 dataset**: classification format (pre-cropped images sorted into class folders, no bounding boxes needed) — e.g. PlantVillage or the PlantDoc classification variant from Kaggle. Not yet trained as of this recap.
3. Python + Ultralytics YOLOv8 (`yolov8n.pt` for detection, `yolov8n-cls.pt` for classification) — fine-tuned via transfer learning rather than trained from scratch.
4. Export trained model(s) to **ONNX** (`opset=12`, `dynamic=False`, `simplify=True` — static shapes needed for reliable downstream inference).

### Pipeline B — Inference (production, C++ app)

1. **C++ OpenCV**: load image (`cv::imread`), letterbox preprocessing (resize + pad to model's square input size, preserving aspect ratio).
2. **C++ + ONNX Runtime**: run Job 1 (crop detector) → decode raw output tensor → NMS → bounding box → crop original image to that box.
3. **C++ + ONNX Runtime**: run Job 2 (health classifier) on the cropped image → class label + confidence.
4. **(Optional) LLM/VLM (e.g. DeepSeek)**: takes the classifier's *structured output* (not the raw image) and generates a natural-language explanation + recommendation.

**Important engineering note — OpenCV DNN vs ONNX Runtime**: initial inference attempts used `cv::dnn::readNetFromONNX`, which loaded the model but crashed inside `net.forward()` with a shape assertion error. Root cause: OpenCV's DNN module maps ONNX ops to its own hand-written layer implementations and has incomplete coverage of YOLOv8's decoupled detection head (chained `Slice`/`Split`/`Reshape` ops). This is not fixable via re-export flags — it's a genuine op-support gap in OpenCV 4.6's importer. **ONNX Runtime** (the reference execution engine ONNX itself is built around) has full op coverage and loaded/ran the same model without issue. OpenCV is still used for image I/O and cropping; ONNX Runtime handles all model inference.

At runtime, only these steps execute: OpenCV preprocessing → ONNX Runtime crop-detection inference → crop → ONNX Runtime classification inference (→ optional LLM text generation).

## Where the LLM fits

Don't feed the raw image to DeepSeek and hope for a zero-shot diagnosis — unreliable and not reproducible. Instead, use it downstream as a **text generator** from structured, trusted output:

```
Classifier output (JSON/struct) → prompt template → LLM → user-facing explanation
```

Example prompt:
> "Diagnostic for a [species] leaf: class=blight, confidence=0.82, affected_area=15%. Generate a concise explanation and a gardening recommendation."

This decouples the diagnosis (reliable, trained model) from the explanation (flexible, natural language) — easier to debug, and the LLM can be swapped without touching the core detection system.

## Deployment shape (undecided / to finalize)

Three options considered for how an end user would actually use this:

- **A — On-device mobile app**: C++ inference engine compiled as a library, embedded via JNI (Android) or Obj-C++ bridge (iOS). Fully offline, fastest, most private.
- **B — C++ backend service**: engine runs as a small HTTP/gRPC server; mobile/web frontend just uploads a photo and gets JSON back. Simpler frontend work, needs hosting + internet.
- **C — WebAssembly**: C++ compiled to WASM, runs in-browser. No server, no app store, but more finicky ONNX Runtime + WASM setup.

Leaning toward **B** given existing familiarity with backend/web stacks — C++ still does 100% of the actual CV/ML work, just exposed over HTTP instead of embedded in a mobile binary.

## Environment setup — commands actually used

### CLion + WSL/GCC toolchain, Python interpreter registration

CLion's Python plugin must be installed (Settings → Plugins → search "Python") before any Python interpreter/SDK options appear. Interpreter registered via Settings → Python Interpreter → Add Local Interpreter → Existing environment, pointing at the venv's `python.exe`.

### Python venv + CUDA-enabled PyTorch

The default `pip install torch` pulls a **CPU-only** build. Needed the explicit CUDA index:

```bash
# from WSL bash — call the Windows venv's python.exe directly rather than
# sourcing Scripts/activate (that script has CRLF line endings and breaks bash)
/mnt/d/Code/Serious/Quant/RoadToQuant/.venv/Scripts/python.exe -m pip cache purge
/mnt/d/Code/Serious/Quant/RoadToQuant/.venv/Scripts/python.exe -m pip install torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu124 --no-cache-dir --timeout 120 --retries 5
```

Verify:
```python
import torch
print(torch.__version__)              # should show "+cu124"
print(torch.cuda.is_available())      # should be True
print(torch.cuda.get_device_name(0))  # "NVIDIA GeForce RTX 3080"
```

### Dataset acquisition (Job 1 — crop detection)

Downloaded from Roboflow's public PlantDoc object-detection export (YOLOv8 format, 416x416 resize):

```bash
cd dataset
curl -L --retry 5 --retry-delay 2 -C - "https://public.roboflow.com/ds/<export-id>?key=<key>" -o roboflow.zip
file roboflow.zip          # confirm "Zip archive data", not an HTML error page (expired signed link)
unzip -t roboflow.zip      # test archive integrity before extracting
unzip roboflow.zip -d plantdoc_detection
```

**Gotcha**: this export only ships `train/` and `test/` — no `valid/` folder, despite `data.yaml` expecting `val: ../valid/images`. Fixed by carving a 15% validation split out of `train/` with a small script (`make_valid_dataset_split.py`) that moves matching image/label pairs into a new `valid/images` + `valid/labels`.

### Training (Job 1)

```python
# crop_detection.py
import os
from ultralytics import YOLO

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

model = YOLO("yolov8n.pt")
results = model.train(
    data=os.path.join(SCRIPT_DIR, "dataset", "plantdoc_detection", "data.yaml"),
    epochs=100,
    imgsz=416,
    batch=16,
    device=0,
    patience=20,
    project=os.path.join(SCRIPT_DIR, "runs"),
    name="plantdoc_crop_v1",
    workers=4,
)
```

**Note**: all paths anchored to `SCRIPT_DIR` (the script's own location via `os.path.abspath(__file__)`) rather than relative paths — relative paths resolve against the terminal's current working directory, not the script's location, which caused output to land in the wrong folder (`RoadToQuant/` instead of `RoadToQuant/C++/Projects/ReadGardenImages/`) on the first run.

Result after 100 epochs: `mAP50 ≈ 0.43`, `mAP50-95 ≈ 0.30`. Usable for a first pass; loss plateaued around epoch 60-70, so more epochs won't help further — the next accuracy lever is more/better labeled data, not more training time.

### Export to ONNX

```python
model = YOLO("runs/detect/runs/plantdoc_crop_v1-3/weights/best.pt")
exported_path = model.export(format="onnx", imgsz=416, opset=12, dynamic=False, simplify=True)
```

### ONNX Runtime (C++) setup

```bash
cd /mnt/d/Code/Serious/Quant/RoadToQuant/C++/Projects/ReadGardenImages
wget https://github.com/microsoft/onnxruntime/releases/download/v1.17.1/onnxruntime-linux-x64-1.17.1.tgz
tar -xzf onnxruntime-linux-x64-1.17.1.tgz
```

`CMakeLists.txt`:
```cmake
cmake_minimum_required(VERSION 3.28)
project(ReadGardenImages)
set(CMAKE_CXX_STANDARD 20)

set(OpenCV_DIR /usr/lib/x86_64-linux-gnu/cmake/opencv4)
find_package(OpenCV REQUIRED)
include_directories(${OpenCV_INCLUDE_DIRS})

set(ONNXRUNTIME_ROOT "${CMAKE_SOURCE_DIR}/onnxruntime-linux-x64-1.17.1")
include_directories(${ONNXRUNTIME_ROOT}/include)
link_directories(${ONNXRUNTIME_ROOT}/lib)

add_executable(ReadGardenImages main.cpp helper.cpp helper.h)

target_link_libraries(ReadGardenImages
        ${OpenCV_LIBS}
        ${ONNXRUNTIME_ROOT}/lib/libonnxruntime.so
)

# so the built binary can find libonnxruntime.so at runtime without manually
# exporting LD_LIBRARY_PATH each time
set_target_properties(ReadGardenImages PROPERTIES
    BUILD_RPATH ${ONNXRUNTIME_ROOT}/lib
)
```

Model input/output tensor names, confirmed via a minimal load test (`Ort::Session`, `GetInputNameAllocated`/`GetOutputNameAllocated`): input = `"images"`, output = `"output0"`.

## Known limitations (current state)

- **Job 1 only reliably detects leaves**, not fruit or flowers — PlantDoc has no training examples for either. Tested on a flower photo: model produced a low-quality crop (zoomed into a couple of petals rather than the whole flower), confirming it has no real concept of "flower" as a category.
- **Job 2 (health classifier) not yet trained** — next step, using a classification-format dataset (PlantVillage or PlantDoc classification variant).
- **mAP50 ≈ 0.43** on Job 1 is a working first pass, not production-quality. More/better labeled data (especially fruit + flower detection sets from Roboflow Universe) is the planned next step before expanding species/subject coverage.

## Gaps in the "matrices + threshold" approach, and what to add

- **Species as an explicit variable**: either one model per species, or a shared backbone with species fed in as an auxiliary embedding before the final layer.
- **Storage**: don't store raw matrices — store **embeddings** (output of the CNN's penultimate layer) in a vector database (FAISS locally, or Milvus). Enables similarity search and anomaly detection without full reclassification.
- **Texture features** as a complement to color-based features: GLCM (Gray-Level Co-occurrence Matrix) or Local Binary Patterns — useful for capturing reticulated/necrotic texture patterns.
- **Clean, labeled dataset per species and per condition** — usually the real bottleneck, more than the architecture itself.

## Summary diagram

```
[Training - Python, offline]
Job 1 dataset (bboxes) → YOLOv8 detection training → export best.onnx (crop detector)
Job 2 dataset (class folders) → YOLOv8 classification training → export health_classifier.onnx

[Inference - C++, production]
Image → C++ OpenCV preprocessing (letterbox resize)
      → ONNX Runtime: crop detector → decode → NMS → bounding box
      → C++ OpenCV: crop original image to box
      → ONNX Runtime: health classifier → class + confidence
      → structured output (struct / JSON)
      → (optional) LLM prompt → natural language explanation
```