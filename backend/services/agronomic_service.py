from typing import Dict, Any, List

class AgronomicService:
    @staticmethod
    def generate_assessment(ndvi: float, stress_percentage: float, crop_type: str) -> Dict[str, Any]:
        """
        Generates a human-readable agronomic assessment based on satellite and ML data.
        """
        recommendations = []
        status = "Healthy"
        
        # 1. Evaluate Vegetation Health (NDVI)
        if ndvi > 0.7:
            health_desc = "Excellent vegetation density. High biomass production."
        elif ndvi > 0.4:
            health_desc = "Good vegetation health. Normal development for most crops."
        elif ndvi > 0.2:
            health_desc = "Moderate to low vegetation. Potential signs of stress or early growth stage."
            status = "Warning"
        else:
            health_desc = "Very low vegetation. Likely bare soil, water, or severe crop failure."
            status = "Critical"

        # 2. Evaluate Stress Areas
        if stress_percentage > 20:
            recommendations.append("Significant stress detected in over 20% of the field. Immediate field inspection recommended.")
            status = "Critical"
        elif stress_percentage > 5:
            recommendations.append("Local stress zones detected. Check irrigation and nutrient levels in identified areas.")
            if status != "Critical":
                status = "Warning"

        # 3. Crop Specific Logic (Simplified example)
        if crop_type.lower() == "corn" and ndvi < 0.5:
             recommendations.append("Corn development is below average for mid-season. Consider additional nitrogen application.")
        elif crop_type.lower() == "wheat" and stress_percentage > 10:
             recommendations.append("Wheat stress detected. Monitor for yellow rust or water deficiency.")

        if not recommendations:
            recommendations.append("No immediate action required. Continue routine monitoring.")

        return {
            "overall_status": status,
            "vegetation_description": health_desc,
            "recommendations": recommendations,
            "stress_assessment": f"{stress_percentage}% of the field is currently under stress."
        }
