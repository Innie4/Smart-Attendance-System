"""Downloads the YuNet face detector and SFace recognizer ONNX weights from
the OpenCV Zoo into models_data/. Run once after installing requirements.txt
and before starting the live attendance or facial enrolment features.

    python download_models.py
"""

import os
import urllib.request

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models_data")

MODELS = {
    "face_detection_yunet_2023mar.onnx": (
        "https://github.com/opencv/opencv_zoo/raw/main/models/"
        "face_detection_yunet/face_detection_yunet_2023mar.onnx"
    ),
    "face_recognition_sface_2021dec.onnx": (
        "https://github.com/opencv/opencv_zoo/raw/main/models/"
        "face_recognition_sface/face_recognition_sface_2021dec.onnx"
    ),
}


def main():
    os.makedirs(MODEL_DIR, exist_ok=True)
    for filename, url in MODELS.items():
        destination = os.path.join(MODEL_DIR, filename)
        if os.path.exists(destination):
            print(f"[skip] {filename} already present")
            continue
        print(f"[download] {filename} <- {url}")
        urllib.request.urlretrieve(url, destination)
        print(f"[done] saved to {destination}")


if __name__ == "__main__":
    main()
