const appendCoordinatePairs = (input, pairs) => {
  if (!Array.isArray(input)) {
    return;
  }

  if (
    input.length >= 2 &&
    typeof input[0] === 'number' &&
    typeof input[1] === 'number'
  ) {
    pairs.push([input[0], input[1]]);
    return;
  }

  input.forEach((child) => appendCoordinatePairs(child, pairs));
};

export const computeBboxFromGeometry = (geometry) => {
  if (!geometry?.coordinates) {
    return null;
  }

  const coordinatePairs = [];
  appendCoordinatePairs(geometry.coordinates, coordinatePairs);

  if (coordinatePairs.length === 0) {
    return null;
  }

  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  coordinatePairs.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    minLat = Math.min(minLat, lat);
    maxLng = Math.max(maxLng, lng);
    maxLat = Math.max(maxLat, lat);
  });

  return [minLng, minLat, maxLng, maxLat];
};

export const computeBboxFromGeoJson = (geoJson) => {
  if (!geoJson) {
    return null;
  }

  if (geoJson.type === 'FeatureCollection') {
    const boxes = geoJson.features
      .map((feature) => computeBboxFromGeometry(feature?.geometry))
      .filter(Boolean);

    if (boxes.length === 0) {
      return null;
    }

    return boxes.reduce(
      (merged, current) => ([
        Math.min(merged[0], current[0]),
        Math.min(merged[1], current[1]),
        Math.max(merged[2], current[2]),
        Math.max(merged[3], current[3])
      ])
    );
  }

  if (geoJson.type === 'Feature') {
    return computeBboxFromGeometry(geoJson.geometry);
  }

  return computeBboxFromGeometry(geoJson);
};

export const formatBbox = (bbox) => {
  if (!Array.isArray(bbox) || bbox.length !== 4) {
    return 'Unavailable';
  }

  return bbox.map((value) => Number(value).toFixed(5)).join(', ');
};
