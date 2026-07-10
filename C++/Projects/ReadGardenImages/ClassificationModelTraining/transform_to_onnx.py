from ultralytics import YOLO

model = YOLO("runs_cls/health_classifier_v1-5/weights/best.pt")
model.export(format="onnx", imgsz=224, opset=12, dynamic=False, simplify=True)