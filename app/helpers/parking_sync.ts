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

export async function upsertMetadataParking(
  carPark: CarPark,
): Promise<Parking> {
  let parking = await Parking.findBy("symbol", carPark.symbol);

  parking ??= await Parking.findBy("external_id", carPark.id);

  if (parking !== null) {
    await parking
      .merge({
        symbol: carPark.symbol,
        externalId: carPark.id,
        name: carPark.name,
        access: carPark.access,
        closeHour: carPark.closeHour,
        openHour: carPark.openHour,
        places: carPark.totalSlots,
        geoLan: Number(carPark.geoLan),
        geoLat: Number(carPark.geoLat),
        address: carPark.address,
        isActive: true,
        isVisible: true,
      })
      .save();
    return parking;
  }

  parking = await Parking.create({
    symbol: carPark.symbol,
    externalId: carPark.id,
    name: carPark.name,
    access: carPark.access,
    closeHour: carPark.closeHour,
    openHour: carPark.openHour,
    places: carPark.totalSlots,
    geoLan: Number(carPark.geoLan),
    geoLat: Number(carPark.geoLat),
    address: carPark.address,
    isActive: true,
    isVisible: true,
  });
  return parking;
}
