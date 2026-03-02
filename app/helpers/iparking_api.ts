import env from "#start/env";

const BASE_URL = "https://microservice.portale.pwr.edu.pl/api/iparking/v1/";
const REQUEST_TIMEOUT_MS = 10000;

async function fetchWithToken<T>(endpoint: string): Promise<T> {
  const token = env.get("API_ACCESS_TOKEN");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const url = new URL(endpoint, BASE_URL);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `iPark API error: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `iPark API request to "${endpoint}" timed out after ${REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface CarPark {
  id: number;
  symbol: string;
  name: string;
  address: string;
  access: string | null;
  openHour: string | null;
  closeHour: string | null;
  geoLan: string;
  geoLat: string;
  totalSlots: number;
  freeSlots: number;
  trend: string;
}

export interface CarParkFreeSlot {
  id: number;
  freeSlots: number;
  trend: string;
}

interface CarParksResponse {
  carParks: CarPark[];
}

interface CarParksFreeSlotResponse {
  carParksFreeSlots: CarParkFreeSlot[];
}

export async function getCarParks(): Promise<CarPark[]> {
  const data = await fetchWithToken<CarParksResponse>("car-parks");
  return data.carParks;
}

export async function getCarParksFreeSlots(): Promise<CarParkFreeSlot[]> {
  const data = await fetchWithToken<CarParksFreeSlotResponse>(
    "car-parks-free-slots",
  );
  return data.carParksFreeSlots;
}
