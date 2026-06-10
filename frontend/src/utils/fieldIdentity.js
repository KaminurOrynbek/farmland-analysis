const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value) => (
  typeof value === 'string' && UUID_PATTERN.test(value.trim())
);

export const getSavedFieldId = (geoJsonUploadResponse) => {
  const candidate = geoJsonUploadResponse?.data?.id;
  return isUuid(candidate) ? candidate : null;
};

export const getFeatureIdentity = (feature) => {
  const properties = feature?.properties || {};

  return (
    properties.client_feature_id ||
    properties.id ||
    properties.field_id ||
    JSON.stringify(feature?.geometry || null)
  );
};
