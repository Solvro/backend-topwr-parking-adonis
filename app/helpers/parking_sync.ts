import { nullableMap } from "@solvro/utils/option";
import { DateTime } from "luxon";

import type { CarPark } from "#helpers/iparking_api";
import Parking from "#models/parking";

const trendMap: Record<string, number> = {
  constant: 0,
  up: 1,
  down: -1,
};

export function parseTrend(trend: string): number {
  return trendMap[trend] ?? 0;
}

function isoTsToTime(iso: string): string {
  return DateTime.fromISO(iso)
    .setZone("Europe/Warsaw")
    .setLocale("pl-PL")
    .toLocaleString(DateTime.TIME_24_SIMPLE);
}

export async function upsertMetadataParking(
  carPark: CarPark,
): Promise<Parking> {
  let parking = await Parking.findBy("symbol", carPark.symbol);

  parking ??= await Parking.findBy("external_id", carPark.id);

  const parkingData = {
    symbol: carPark.symbol,
    externalId: carPark.id,
    name: carPark.name,
    access: carPark.access,
    closeHour: nullableMap(carPark.closeHour, isoTsToTime),
    openHour: nullableMap(carPark.openHour, isoTsToTime),
    places: carPark.totalSlots,
    geoLan: Number(carPark.geoLan),
    geoLat: Number(carPark.geoLat),
    address: carPark.address,
    isActive: true,
    isVisible: true,
  };
  if (parking !== null) {
    await parking.merge(parkingData).save();
    return parking;
  }

  parking = await Parking.create(parkingData);
  return parking;
}
