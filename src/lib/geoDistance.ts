export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// Coordenadas de referencia del centro de Cumaná, Estado Sucre
export const CUMANA_CENTER: GeoPoint = {
  latitude: 10.4539,
  longitude: -64.1826,
};

/**
 * Coordenadas aproximadas por zonas conocidas de Cumaná
 */
export const CUMANA_ZONES: Record<string, GeoPoint> = {
  centro: { latitude: 10.4539, longitude: -64.1826 },
  bermudez: { latitude: 10.4512, longitude: -64.1754 },
  gran_mariscal: { latitude: 10.4435, longitude: -64.168 },
  los_chaimas: { latitude: 10.448, longitude: -64.185 },
  san_juan: { latitude: 10.461, longitude: -64.195 },
  el_penon: { latitude: 10.441, longitude: -64.148 },
  cascajal: { latitude: 10.439, longitude: -64.188 },
  puerto_sucre: { latitude: 10.462, longitude: -64.18 },
};

/**
 * Fórmula de Haversine para calcular la distancia en kilómetros entre dos coordenadas geográficas
 */
export function calculateDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formatea una distancia en metros o kilómetros para la interfaz
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Obtiene las coordenadas de una tienda a partir de sus campos o zona
 */
export function getStoreCoordinates(store?: {
  latitude?: number;
  longitude?: number;
  zone?: string;
  name?: string;
}): GeoPoint {
  if (store?.latitude && store?.longitude) {
    return { latitude: Number(store.latitude), longitude: Number(store.longitude) };
  }

  const zoneKey = (store?.zone || '').toLowerCase();
  for (const [key, coords] of Object.entries(CUMANA_ZONES)) {
    if (zoneKey.includes(key.replace('_', ' '))) {
      return coords;
    }
  }

  // Generar ligera variación consistente basada en el nombre para evitar que todas tengan idéntica distancia
  const seed = (store?.name || 'Aura').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const offsetLat = ((seed % 20) - 10) * 0.0008;
  const offsetLon = (((seed * 7) % 20) - 10) * 0.0008;

  return {
    latitude: CUMANA_CENTER.latitude + offsetLat,
    longitude: CUMANA_CENTER.longitude + offsetLon,
  };
}

