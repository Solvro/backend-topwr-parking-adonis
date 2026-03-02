import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";

import { getCarParks } from "../app/helpers/iparking_api.js";

const trendMap: Record<string, number> = {
  constant: 0,
  up: 1,
  down: -1,
};

function parseTrend(trend: string): number {
  return trendMap[trend] ?? 0;
}

export default class SynchronizeParkings extends BaseCommand {
  static commandName = "synchronize:parkings";
  static description = "";

  static options: CommandOptions = {
    startApp: true,
  };

  async run() {
    const carParks = await getCarParks();
    const seenSymbols = new Set<string>();
    let nextLocalId = await this.getNextLocalId();

    for (const carPark of carParks) {
      seenSymbols.add(carPark.symbol);
      let parking = await Parking.findBy("symbol", carPark.symbol);

      parking ??= await Parking.findBy("external_id", carPark.id);

      try {
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
        } else {
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
          nextLocalId += 1;
        }
      } catch (error) {
        console.error(error);
        throw error;
      }

      await ParkingAvailability.create({
        parkingId: parking.id,
        spacesLeft: carPark.freeSlots,
        trend: parseTrend(carPark.trend),
        measuredAt: DateTime.now(),
      });
    }

    // Hide any parking no longer present in the upstream API (e.g. split lots)
    await Parking.query()
      .whereNotIn("symbol", [...seenSymbols])
      .update({ is_visible: false });

    this.logger.info('"SynchronizeParkings" finished');
  }

  private async getNextLocalId(): Promise<number> {
    const lastParking = await Parking.query().orderBy("id", "desc").first();
    return (lastParking?.id ?? 0) + 1;
  }
}
