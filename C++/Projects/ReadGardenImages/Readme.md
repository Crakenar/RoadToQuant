# Plant Disease Detection Pipeline — Architecture Recap

## Problem

Detecting disease/stress symptoms (fungal spots, water stress, nutrient deficiency) on garden plant photos, across **multiple species**, using C++ and OpenCV as the core stack.

## Why raw thresholding isn't enough

Classic OpenCV approaches (Otsu thresholding, HSV color masks) are good for **segmenting** a leaf from the background, but not for **classifying disease**. Symptom color, texture, and shape vary heavily by species and lighting condition. Hardcoded thresholds tuned for one species/photo will break on another.

## Two separate pipelines

### Pipeline A — Training (offline, Python, done once)

1. Labeled dataset (per species + condition — disease, water stress, deficiency). Public datasets: PlantVillage, PlantDoc.
2. Python + OpenCV for dataset preprocessing (normalization, augmentation).
3. Python + PyTorch: train a CNN for classification and/or a U-Net for lesion segmentation.
4. Export trained model(s) to **ONNX**.

### Pipeline B — Inference (production, C++ app)

1. **C++ OpenCV**: load/capture image, preprocessing (crop, Lab-space normalization, resize, illumination correction).
2. **C++ + ONNX Runtime (or `cv::dnn`)**: load the ONNX model from Pipeline A, run inference → output = class (healthy/diseased), optional lesion segmentation map, confidence score.
3. **(Optional) LLM/VLM (e.g. DeepSeek)**: takes the CNN's *structured output* (not the raw image) and generates a natural-language explanation + recommendation.

**Key point**: steps "train CNN" and "run CNN in C++" are not sequential runtime steps — they're the same model at two different lifecycle stages. Python builds it, C++/ONNX runs it. At runtime, only two steps actually execute: OpenCV preprocessing → ONNX inference (→ optional LLM text generation).

## Where the LLM fits

Don't feed the raw image to DeepSeek and hope for a zero-shot diagnosis — unreliable and not reproducible. Instead, use it downstream as a **text generator** from structured, trusted output:

```
CNN output (JSON) → prompt template → LLM → user-facing explanation
```

Example prompt:
> "Diagnostic for a [species] leaf: class=blight, confidence=0.82, affected_area=15%. Generate a concise explanation and a gardening recommendation."

This decouples the diagnosis (reliable, trained model) from the explanation (flexible, natural language) — easier to debug, and the LLM can be swapped without touching the core detection system.

## Gaps in the "matrices + threshold" approach, and what to add

- **Species as an explicit variable**: either one model per species, or a shared backbone with species fed in as an auxiliary embedding before the final layer.
- **Storage**: don't store raw matrices — store **embeddings** (output of the CNN's penultimate layer) in a vector database (FAISS locally, or Milvus). Enables similarity search and anomaly detection without full reclassification.
- **Texture features** as a complement to color-based features: GLCM (Gray-Level Co-occurrence Matrix) or Local Binary Patterns — useful for capturing reticulated/necrotic texture patterns.
- **Clean, labeled dataset per species and per condition** — usually the real bottleneck, more than the architecture itself.

## Summary diagram

```
[Training - Python, offline]
Dataset → OpenCV preprocessing → PyTorch (CNN + U-Net) → export ONNX

[Inference - C++, production]
Image → C++ OpenCV preprocessing → C++ ONNX Runtime inference
      → structured output (class, confidence, lesion %)
      → (optional) LLM prompt → natural language explanation
```