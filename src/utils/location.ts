import Constants from "expo-constants";

export const GOOGLE_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra?.googleMapsApiKey as string | undefined) ||
  "";

export function getMapPreview(lat: number, lng: number) {
  const imagePreviewUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=400x200&maptype=roadmap&markers=color:red%7Clabel:S%7C${lat},${lng}&key=${GOOGLE_API_KEY}`;
  return imagePreviewUrl;
}

export async function getAddress(lat: number, lng: number) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch address!');
  }
  
  const data = await response.json();
  const address = data.results[0].formatted_address;
  return address;
}

export const fetchStations = async (lat: number, lng: number) => {
  const radius = 5000;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=gas_station&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error("Failed to fetch gas stations:", response.status);
      throw new Error("Failed to fetch gas stations.");
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error("Google API Error:", data.status, data.error_message);
      throw new Error(data.error_message || "API error occurred.");
    }

    return data.results;
  } catch (error) {
    console.error("fetchStations error:", error);
    return [];
  }
};
