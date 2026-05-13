const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export const checkHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === "ok";
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
};

export const runAnalysis = async (fieldId, startDate = null, endDate = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/analysis/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        field_id: fieldId,
        start_date: startDate,
        end_date: endDate
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Analysis failed: ${err.detail || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error - runAnalysis:", error);
    throw error;
  }
};

export const saveField = async (name, geometry, area_ha) => {
  try {
    const response = await fetch(`${API_BASE_URL}/geo/fields`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        geometry: geometry,
        area_ha: area_ha
      }),
    });

    if (!response.ok) {
      throw new Error(`Field saving failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error - saveField:", error);
    throw error;
  }
};

export const fetchAllFields = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/geo/fields`);
    if (!response.ok) {
      throw new Error(`Failed to fetch fields: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("API Error - fetchAllFields:", error);
    throw error;
  }
};

// Fallback exports for any un-refactored components
export const uploadImage = async () => { console.warn("uploadImage is deprecated."); return {}; };
export const uploadGeoJSON = async () => { console.warn("uploadGeoJSON is deprecated. Use saveField."); return {}; };


// Fetch analysis history for Projects page
export const fetchAnalysisHistory = async () => {
  const response = await fetch(`${API_BASE_URL}/analysis/history`);

  if (!response.ok) {
    throw new Error(`Failed to fetch analysis history: ${response.statusText}`);
  }

  return await response.json();
};