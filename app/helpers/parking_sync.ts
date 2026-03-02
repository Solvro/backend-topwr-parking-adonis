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

export async function getNextLocalId(): Promise<number> {
  const lastParking = await Parking.query().orderBy("id", "desc").first();
  return (lastParking?.id ?? 0) + 1;
}

export async function upsertMetadataParking(
  carPark: CarPark,
  nextLocalId: number,
): Promise<{ parking: Parking; created: boolean }> {
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
    return { parking, created: false };
  }

  parking = await Parking.create({
    id: nextLocalId,
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
  return { parking, created: true };
}
