import json
from typing import Dict, Any
import os
import numpy as np
from PIL import Image
import rasterio
from backend.core.config import settings

class ResNetAdapter:
    def __init__(self):
        # Lazy imports inside constructor to avoid top-level dependency
        import torch
        import torch.nn as nn
        from torchvision import models, transforms
        
        self.torch = torch
        self.nn = nn
        self.models = models
        self.transforms = transforms
        
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.class_names = self._load_class_names()
        self.transform = self._get_transforms()
        self.model = self._initialize_model()

    def _load_class_names(self):
        default_classes = [
            "AnnualCrop", "Forest", "HerbaceousVegetation",
            "Highway", "Industrial", "Pasture",
            "PermanentCrop", "Residential", "River", "SeaLake"
        ]

        artifacts_path = getattr(settings, "ML_ARTIFACTS_PATH", None)

        if artifacts_path and os.path.exists(artifacts_path):
            try:
                with open(artifacts_path, "r", encoding="utf-8") as file:
                    artifacts = json.load(file)
                return artifacts.get("classes", default_classes)
            except Exception as e:
                print(f"Warning: failed to load ml_artifacts.json: {e}")

        return default_classes

    def _initialize_model(self):
        model = self.models.resnet50(weights=None)
        model.fc = self.nn.Linear(in_features=2048, out_features=len(self.class_names))

        weights_path = settings.RESNET_WEIGHTS_PATH

        if not os.path.exists(weights_path):
            raise FileNotFoundError(
                f"Model weights not found: {weights_path}. "
                "Place best_resnet_satellite_model.pth inside backend/infrastructure/ml/models/"
            )

        state_dict = self.torch.load(weights_path, map_location=self.device)
        model.load_state_dict(state_dict)

        model = model.to(self.device)
        model.eval()

        print(f"Loaded ResNet-50 model from {weights_path}")
        return model

    def _get_transforms(self):
        return self.transforms.Compose([
            self.transforms.Resize((224, 224)),
            self.transforms.ToTensor(),
            self.transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def _extract_rgb_from_tif(self, image_path: str) -> Image.Image:
        """
        Converts Sentinel/Raster TIFF into RGB-like image for ResNet.

        Important:
        The ResNet was trained on RGB EuroSAT images.
        For best reliability, the TIFF should contain RGB bands.
        If the raster has only Red/NIR bands, this function will still create
        a fallback image, but prediction quality can be lower.
        """
        with rasterio.open(image_path) as src:
            band_count = src.count

            if band_count >= 4:
                red = src.read(1).astype(np.float32)    # B4
                green = src.read(4).astype(np.float32)  # B3
                blue = src.read(3).astype(np.float32)   # B2
            elif band_count >= 3:
                red = src.read(1).astype(np.float32)
                green = src.read(2).astype(np.float32)
                blue = src.read(3).astype(np.float32)
            elif band_count == 2:
                red = src.read(1).astype(np.float32)
                nir = src.read(2).astype(np.float32)
                green = (red + nir) / 2.0
                blue = red
            else:
                single = src.read(1).astype(np.float32)
                red = green = blue = single

            rgb = np.dstack([red, green, blue])
            rgb = self._normalize_to_uint8(rgb)

        return Image.fromarray(rgb, "RGB")

    def _normalize_to_uint8(self, image: np.ndarray) -> np.ndarray:
        image = np.nan_to_num(image)

        p2 = np.percentile(image, 2)
        p98 = np.percentile(image, 98)

        if p98 - p2 < 1e-6:
            image = np.zeros_like(image)
        else:
            image = (image - p2) / (p98 - p2)

        image = np.clip(image * 255, 0, 255)
        return image.astype(np.uint8)

    def predict(self, image_path: str) -> Dict[str, Any]:
        """
        Perform Patch-based inference: split image into 224x224 tiles, 
        predict each, and aggregate results.
        """
        with rasterio.open(image_path) as src:
            w, h = src.width, src.height
            patch_size = 224
            
            # If image is smaller than patch size, do single prediction
            if w <= patch_size and h <= patch_size:
                return self._predict_single_patch(image_path)

            # Slicing logic
            all_predictions = []
            all_confidences = []

            # Step through the image in tiles
            for y in range(0, h, patch_size):
                for x in range(0, w, patch_size):
                    # Read window
                    window = rasterio.windows.Window(x, y, min(patch_size, w-x), min(patch_size, h-y))
                    
                    # Read bands and create RGB
                    try:
                        # Re-using normalization logic but on a per-patch basis
                        # For efficiency, we extract the patch as a numpy array
                        red = src.read(1, window=window).astype(np.float32)
                        green = src.read(4, window=window).astype(np.float32) if src.count >= 4 else src.read(min(2, src.count), window=window).astype(np.float32)
                        blue = src.read(3, window=window).astype(np.float32) if src.count >= 3 else src.read(1, window=window).astype(np.float32)
                        
                        rgb = np.dstack([red, green, blue])
                        rgb = self._normalize_to_uint8(rgb)
                        
                        # Pad patch to 224x224 if it's on the edge
                        if rgb.shape[0] < patch_size or rgb.shape[1] < patch_size:
                            padded = np.zeros((patch_size, patch_size, 3), dtype=np.uint8)
                            padded[:rgb.shape[0], :rgb.shape[1], :] = rgb
                            rgb = padded
                        
                        image = Image.fromarray(rgb, "RGB")
                        input_tensor = self.transform(image).unsqueeze(0).to(self.device)
                        
                        with self.torch.no_grad():
                            outputs = self.model(input_tensor)
                            probs = self.torch.nn.functional.softmax(outputs, dim=1)[0]
                            conf, idx = self.torch.max(probs, 0)
                            
                            all_predictions.append(self.class_names[idx.item()])
                            all_confidences.append(float(conf.item()))
                    except Exception:
                        continue

            if not all_predictions:
                return self._predict_single_patch(image_path)

            # Aggregate: Majority Vote
            from collections import Counter
            counts = Counter(all_predictions)
            most_common_class = counts.most_common(1)[0][0]
            avg_confidence = sum(all_confidences) / len(all_confidences)

            return {
                "predicted_class": most_common_class,
                "crop_type": most_common_class,
                "confidence": avg_confidence,
                "patch_count": len(all_predictions),
                "class_distribution": dict(counts)
            }

    def _predict_single_patch(self, image_path: str) -> Dict[str, Any]:
        image = self._extract_rgb_from_tif(image_path)
        input_tensor = self.transform(image).unsqueeze(0).to(self.device)

        with self.torch.no_grad():
            outputs = self.model(input_tensor)
            probabilities_tensor = self.torch.nn.functional.softmax(outputs, dim=1)[0]
            confidence, predicted_idx = self.torch.max(probabilities_tensor, 0)

        predicted_class = self.class_names[predicted_idx.item()]
        return {
            "predicted_class": predicted_class,
            "crop_type": predicted_class,
            "confidence": float(confidence.item()),
            "patch_count": 1
        }
    
     
_ml_adapter_instance = None

def get_ml_adapter():
    global _ml_adapter_instance

    if _ml_adapter_instance is None:
        _ml_adapter_instance = ResNetAdapter()

    return _ml_adapter_instance