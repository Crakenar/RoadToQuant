import os
from ultralytics import YOLO

# Directory this script lives in, regardless of where it's run from
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def main():
    model = YOLO("yolov8n.pt")

    results = model.train(
        data=os.path.join(SCRIPT_DIR, "dataset", "plantdoc_detection", "data.yaml"),
        epochs=100,
        imgsz=416,
        batch=16,
        device=0,
        patience=20,
        project=os.path.join(SCRIPT_DIR, "runs"),
        name="plantdoc_crop_v1",   # no "./" needed, and no leading "runs" duplication
        workers=4,
    )

    print(f"Best model saved to: {results.save_dir}/weights/best.pt")

if __name__ == "__main__":
    main()