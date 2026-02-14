
import cv2
import numpy as np
import os

# Paths
caffemodel = "./resources/detection_model/Widerface-RetinaFace.caffemodel"
deploy = "./resources/detection_model/deploy.prototxt"

def check_model():
    print(f"Loading model from {caffemodel}")
    if not os.path.exists(caffemodel):
        print("Model file not found!")
        return

    net = cv2.dnn.readNetFromCaffe(deploy, caffemodel)
    
    # Create dummy image
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    blob = cv2.dnn.blobFromImage(img, 1, mean=(104, 117, 123))
    
    net.setInput(blob, 'data')
    out = net.forward('detection_out')
    
    print(f"Output shape: {out.shape}")
    if out.shape[2] > 0:
        first_detection = out[0, 0, 0]
        print(f"First detection vector length: {len(first_detection)}")
        print(f"First detection values: {first_detection}")

if __name__ == "__main__":
    check_model()
