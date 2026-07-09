from ultralytics import YOLO
import torch


def main():
    print(torch.cuda.is_available())  # should print True
    print(torch.cuda.get_device_name(0))  # should print "NVIDIA GeForce RTX 3080"
    # Load a pretrained YOLOv8 nano checkpoint — we fine-tune from here
    # rather than training from scratch, since pretrained weights already
    # understand general object shapes/edges (transfer learning)
    # model = YOLO("yolov8n.pt")
    #
    # results = model.train(
    #     data="dataset/data.yaml",
    #     epochs=100,
    #     imgsz=416,                  # 416x416 from dl
    #     batch=16,                   # RTX 3080
    #     device=0,
    #     patience=20,                # stop early if val loss stalls for 20 epochs
    #     project="runs",
    #     name="plantdoc_crop_v1",
    #     workers=4,                  # dataloader workers, tune down if you get CPU bottleneck warnings
    # )

    # Print where the best weights ended up
    # print(f"Best model saved to: {results.save_dir}/weights/best.pt")


if __name__ == "__main__":
    main()
