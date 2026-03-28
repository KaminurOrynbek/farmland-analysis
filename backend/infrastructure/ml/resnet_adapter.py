import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import rasterio
import numpy as np
from backend.core.config import settings
import os

class ResNetAdapter:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self._initialize_model()
        self.transform = self._get_transforms()
        
        # EuroSAT 10 classes as referenced in your methodology
        self.class_names = [
            "AnnualCrop", "Forest", "HerbaceousVegetation",
            "Highway", "Industrial", "Pasture",
            "PermanentCrop", "Residential", "River", "SeaLake"
        ]

    def _initialize_model(self):
        """
        Initializes ResNet-50 and loads the custom EuroSAT weights.
        """
        model = models.resnet50(pretrained=False)
        # Replace the final fully connected layer for 10 classes
        model.fc = nn.Linear(in_features=2048, out_features=10)
        
        weights_path = settings.RESNET_WEIGHTS_PATH
        
        if os.path.exists(weights_path):
            try:
                # Load weights (map_location handles loading GPU model on CPU)
                model.load_state_dict(torch.load(weights_path, map_location=self.device))
                print(f"Successfully loaded ResNet-50 weights from {weights_path}")
            except Exception as e:
                print(f"Warning: Failed to load weights: {e}")
        else:
            print(f"CRITICAL WARNING: No model weights found at {weights_path}. Inference will use random weights until the .pth file is provided!")
            
        model = model.to(self.device)
        model.eval()
        return model

    def _get_transforms(self):
        """
        Methodology specifies Resize to 224x224 and ImageNet normalization.
        """
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def predict(self, image_path: str) -> dict:
        """
        Runs the ResNet-50 inference pipeline on a given image.
        """
        try:
            with rasterio.open(image_path) as src:
                # GEE exports B4 (Red) as Band 1, B8 (NIR) as Band 2, scaled by 10,000
                red = src.read(1).astype(np.float32)
                nir = src.read(2).astype(np.float32)
                
                # Normalize reflectance to standard 8-bit RGB image range [0, 255]
                # We enhance contrast by clipping roughly at 0.3 reflectance
                red_norm = np.clip((red / 3000.0) * 255, 0, 255).astype(np.uint8)
                nir_norm = np.clip((nir / 3000.0) * 255, 0, 255).astype(np.uint8)
                
                # Synthesize a third channel (fake Green) to satisfy ResNet 3-channel requirement
                fake_green = np.clip((red_norm.astype(int) + nir_norm.astype(int)) / 2, 0, 255).astype(np.uint8)
                
                # Stack HxWxC
                rgb_array = np.dstack((red_norm, fake_green, nir_norm))
                
            image = Image.fromarray(rgb_array, "RGB")
            input_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(input_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
                
                # Get the predicted class index
                confidence, predicted_idx = torch.max(probabilities, 0)
                
            predicted_class = self.class_names[predicted_idx.item()]
            
            return {
                "crop_type": predicted_class,
                "confidence": float(confidence.item()),
                # Basic heuristic mappings or external models would calculate this
                "vegetation_health": int(confidence.item() * 100), 
                "risk_level": "Low" if confidence.item() > 0.8 else "Medium"
            }
            
        except Exception as e:
            raise RuntimeError(f"Error during ML inference: {str(e)}")
