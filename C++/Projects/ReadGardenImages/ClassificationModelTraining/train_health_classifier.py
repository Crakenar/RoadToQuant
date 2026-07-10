# train_health_classifier.py
import os
from ultralytics import YOLO

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def main():
    model = YOLO("yolov8n-cls.pt")

    results = model.train(
        data=os.path.join(SCRIPT_DIR, "classification_data"),
        epochs=50,
        imgsz=224,
        batch=32,
        device=0,
        patience=15,
        project=os.path.join(SCRIPT_DIR, "runs_cls"),
        name="health_classifier_v1",
    )

    print(f"Best model saved to: {results.save_dir}/weights/best.pt")

if __name__ == "__main__":
    main()