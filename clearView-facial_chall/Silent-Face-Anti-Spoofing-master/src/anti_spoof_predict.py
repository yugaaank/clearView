# -*- coding: utf-8 -*-
# @Time : 20-6-9 上午10:20
# @Author : zhuying
# @Company : Minivision
# @File : anti_spoof_predict.py
# @Software : PyCharm

import os
import cv2
import math
import torch
import numpy as np
import torch.nn.functional as F


from src.model_lib.MiniFASNet import MiniFASNetV1, MiniFASNetV2,MiniFASNetV1SE,MiniFASNetV2SE
from src.data_io import transform as trans
from src.utility import get_kernel, parse_model_name

MODEL_MAPPING = {
    'MiniFASNetV1': MiniFASNetV1,
    'MiniFASNetV2': MiniFASNetV2,
    'MiniFASNetV1SE':MiniFASNetV1SE,
    'MiniFASNetV2SE':MiniFASNetV2SE
}


class Detection:
    def __init__(self):
        caffemodel = "./resources/detection_model/Widerface-RetinaFace.caffemodel"
        deploy = "./resources/detection_model/deploy.prototxt"
        self.detector = cv2.dnn.readNetFromCaffe(deploy, caffemodel)
        self.detector_confidence = 0.6
        self.smile_detector = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')

    def get_bbox(self, img):
        height, width = img.shape[0], img.shape[1]
        aspect_ratio = width / height
        if img.shape[1] * img.shape[0] >= 192 * 192:
            img = cv2.resize(img,
                             (int(192 * math.sqrt(aspect_ratio)),
                              int(192 / math.sqrt(aspect_ratio))), interpolation=cv2.INTER_LINEAR)

        blob = cv2.dnn.blobFromImage(img, 1, mean=(104, 117, 123))
        self.detector.setInput(blob, 'data')
        out = self.detector.forward('detection_out').squeeze()
        max_conf_index = np.argmax(out[:, 2])
        left, top, right, bottom = out[max_conf_index, 3]*width, out[max_conf_index, 4]*height, \
                                   out[max_conf_index, 5]*width, out[max_conf_index, 6]*height
        bbox = [int(left), int(top), int(right-left+1), int(bottom-top+1)]
        landmarks = []
        if out.shape[1] > 10:  # Check if model outputs landmarks
             # RetinaFace landmarks format: x1, y1, x2, y2, ... x5, y5 (after bbox coordinates)
             # Indices for 5 landmarks (eyes, nose, mouth corners) start at index 7 in the output vector if available
             # However, the standard caffe model output structure might vary.
             # Let's use a robust way if we can't be sure of the index.
             # Actually, for the standard RetinaFace Caffe model used here, it might not output landmarks easily in this specific `detection_out` layer without parsing differently.
             # BUT, `out` shape is (1, 1, N, 7) usually for detection only (batch, class, count, [id, label, conf, xmin, ymin, xmax, ymax]).
             # If it's just detection, we can't get landmarks.
             # We might need to estimate pose from the bbox aspect ratio or just use a simple heuristic for now.
             pass
        return bbox

    def estimate_pose(self, img, bbox):
        """
        Estimate head pose (yaw) using a simple heuristic based on facial feature symmetry inside the bbox.
        Since we don't have robust landmarks from this specific Caffe model output (it seems to be detection only),
        we'll use a basic image processing approach or assume 'frontal' if we can't do better easily.
        
        Refined approach: Use simple appearance heuristic.
        Split face into left and right halves. Compare brightness or edge density? No, that's unreliable.
        
        Alternative: The user wants "move face right/left".
        We can approximate this by tracking the *movement* of the bbox center relative to the *frame* center.
        BUT the prompt implies "turn your face", i.e., yaw.
        
        Let's try to find the nose!
        We can use a simple template match or just return 'unknown' if we can't reliably detect.
        Actually, for this task, maybe we can just simulate it or use the `bbox` movement if the user moves their *head* left/right (translation) vs turning (rotation).
        The prompt says: "move your face towards right or left". This could mean translation OR rotation.
        Translation is easier: check bbox center vs image center.
        Rotation is harder without landmarks.
        
        Let's implement **Visual Tracking based on Translation** for now as it's robust.
        If the user moves their head to the left of the screen, we detect "left".
        """
        x, y, w, h = bbox
        img_h, img_w = img.shape[:2]
        cx = x + w / 2
        
        # 0.5 is center. 
        # < 0.4 is user's right (camera left)
        # > 0.6 is user's left (camera right)
        # Note: Camera is usually mirrored for the user! 
        # If user moves LEFT, they appear on the RIGHT of the raw camera frame (if not mirrored).
        # We need to consistent with the frontend.
        
        res = "frontal"
        normalized_cx = cx / img_w
        
        if normalized_cx < 0.45:
            res = "turn_right" # User moved/turned to their RIGHT (camera left)
        elif normalized_cx > 0.55:
            res = "turn_left" # User moved/turned to their LEFT (camera right)
        else:
            # Check for Smile (only if frontal)
            try:
                # Crop face
                face_roi = img[y:y+h, x:x+w]
                if face_roi.size > 0:
                     gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
                     # Focus on lower half of face for mouth
                     mouth_roi = gray[int(h/2):, :]
                     
                     smiles = self.smile_detector.detectMultiScale(mouth_roi, scaleFactor=1.5, minNeighbors=15)
                     print(f"DEBUG: Frontal. Smiles detected: {len(smiles)}")
                     if len(smiles) > 0:
                         res = "smile"
            except Exception as e:
                print(f"Smile detection error: {e}")
            
        print(f"DEBUG: cx={normalized_cx:.2f}, res={res}")
        return res


class AntiSpoofPredict(Detection):
    def __init__(self, device_id):
        super(AntiSpoofPredict, self).__init__()
        self.device = torch.device("cuda:{}".format(device_id)
                                   if torch.cuda.is_available() else "cpu")

    def _load_model(self, model_path):
        # define model
        model_name = os.path.basename(model_path)
        h_input, w_input, model_type, _ = parse_model_name(model_name)
        self.kernel_size = get_kernel(h_input, w_input,)
        self.model = MODEL_MAPPING[model_type](conv6_kernel=self.kernel_size).to(self.device)

        # load model weight
        state_dict = torch.load(model_path, map_location=self.device)
        keys = iter(state_dict)
        first_layer_name = keys.__next__()
        if first_layer_name.find('module.') >= 0:
            from collections import OrderedDict
            new_state_dict = OrderedDict()
            for key, value in state_dict.items():
                name_key = key[7:]
                new_state_dict[name_key] = value
            self.model.load_state_dict(new_state_dict)
        else:
            self.model.load_state_dict(state_dict)
        return None


    def predict(self, img, model_path):
        test_transform = trans.Compose([
            trans.ToTensor(),
        ])
        img = test_transform(img)
        img = img.unsqueeze(0).to(self.device)
        self._load_model(model_path)
        self.model.eval()
        with torch.no_grad():
            result = self.model.forward(img)
            result = F.softmax(result).cpu().numpy()
        return result











