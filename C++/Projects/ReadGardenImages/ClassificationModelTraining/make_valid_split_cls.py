# make_valid_split_cls.py
import os
import random
import shutil

random.seed(42)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_DIR = os.path.join(SCRIPT_DIR, "classification_data", "train")
VALID_DIR = os.path.join(SCRIPT_DIR, "classification_data", "valid")
VAL_RATIO = 0.15

for class_name in os.listdir(TRAIN_DIR):
    class_train_path = os.path.join(TRAIN_DIR, class_name)
    if not os.path.isdir(class_train_path):
        continue

    class_valid_path = os.path.join(VALID_DIR, class_name)
    os.makedirs(class_valid_path, exist_ok=True)

    images = [f for f in os.listdir(class_train_path) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
    random.shuffle(images)
    n_val = int(len(images) * VAL_RATIO)

    for img_name in images[:n_val]:
        shutil.move(os.path.join(class_train_path, img_name),
                    os.path.join(class_valid_path, img_name))

print("Validation split created.")