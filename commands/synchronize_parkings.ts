import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";

import {
  getCarParks,
  getCarParksFreeSlots,
} from "../app/helpers/iparking_api.js";

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
    const [carParks, freeSlots] = await Promise.all([
      getCarParks(),
      getCarParksFreeSlots(),
    ]);

    const freeSlotsMap = new Map(freeSlots.map((slot) => [slot.id, slot]));
    const seenSymbols = new Set<string>();

    for (const carPark of carParks) {
      if (process.env.DEBUG) {
        this.logger.debug(JSON.stringify(carPark, null, 2));
      }

      seenSymbols.add(carPark.symbol);
      const freeSlot = freeSlotsMap.get(carPark.id);

      let parking = await Parking.findBy("symbol", carPark.symbol);

      try {
        if (parking) {
          await parking
            .merge({
              name: carPark.name,
              access: carPark.access,
              closeHour: carPark.closeHour,
              openHour: carPark.openHour,
              places: carPark.totalSlots,
              geoLan: Number(carPark.geoLan),
              geoLat: Number(carPark.geoLat),
              address: carPark.address,
              isVisible: true,
            })
            .save();
        } else {
          parking = await Parking.create({
            id: carPark.id,
            symbol: carPark.symbol,
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
        }
      } catch (error) {
        console.error(error);
        throw error;
      }

      const rawTrend = freeSlot?.trend ?? carPark.trend;
      await ParkingAvailability.create({
        parkingId: parking.id,
        spacesLeft: freeSlot?.freeSlots ?? carPark.freeSlots,
        trend: parseTrend(rawTrend),
        measuredAt: DateTime.now(),
      });
    }

    // Hide any parking no longer present in the upstream API (e.g. split lots)
    await Parking.query()
      .whereNotIn("symbol", [...seenSymbols])
      .update({ is_visible: false });

    this.logger.info('"SynchronizeParkings" finished');
  }
}
