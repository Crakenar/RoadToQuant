import os
import random
import shutil

random.seed(42)  # reproducible split

BASE = "./dataset/plantdoc_detection"
TRAIN_IMG = os.path.join(BASE, "train", "images")
TRAIN_LBL = os.path.join(BASE, "train", "labels")
VALID_IMG = os.path.join(BASE, "valid", "images")
VALID_LBL = os.path.join(BASE, "valid", "labels")

VAL_RATIO = 0.15  # 15% of train goes to validation

os.makedirs(VALID_IMG, exist_ok=True)
os.makedirs(VALID_LBL, exist_ok=True)

images = [f for f in os.listdir(TRAIN_IMG) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
random.shuffle(images)

n_val = int(len(images) * VAL_RATIO)
val_images = images[:n_val]

moved = 0
for img_name in val_images:
    label_name = os.path.splitext(img_name)[0] + ".txt"

    src_img = os.path.join(TRAIN_IMG, img_name)
    src_lbl = os.path.join(TRAIN_LBL, label_name)

    if not os.path.exists(src_lbl):
        continue  # skip images with no matching label

    shutil.move(src_img, os.path.join(VALID_IMG, img_name))
    shutil.move(src_lbl, os.path.join(VALID_LBL, label_name))
    moved += 1

print(f"Moved {moved} image/label pairs to valid/ (out of {len(images)} total train images)")