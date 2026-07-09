from ultralytics import YOLO

model = YOLO("runs/detect/runs/plantdoc_crop_v1-3/weights/best.pt")
model.export(format="onnx", imgsz=416, opset=12, dynamic=False, simplify=True)