const API_BASE_URL = "http://127.0.0.1:8000/api";

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

export const runAnalysis = async (imageId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/run-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_id: imageId,
        parameters: {}
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error - runAnalysis:", error);
    throw error;
  }
};

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error - uploadImage:", error);
    throw error;
  }
};

export const uploadGeoJSON = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload-geojson`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`GeoJSON upload failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error - uploadGeoJSON:", error);
    throw error;
  }
};
