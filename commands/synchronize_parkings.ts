import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";

import { getCarParks } from "../app/helpers/iparking_api.js";
import {
  getNextLocalId,
  parseTrend,
  upsertMetadataParking,
} from "../app/helpers/parking_sync.js";

export default class SynchronizeParkings extends BaseCommand {
  static commandName = "synchronize:parkings";
  static description = "";

  static options: CommandOptions = {
    startApp: true,
  };

  async run() {
    const carParks = await getCarParks();
    const seenSymbols = new Set<string>();
    let nextLocalId = await getNextLocalId();

    for (const carPark of carParks) {
      seenSymbols.add(carPark.symbol);

      try {
        const { parking, created } = await upsertMetadataParking(
          carPark,
          nextLocalId,
        );
        if (created) {
          nextLocalId += 1;
        }

        await ParkingAvailability.create({
          parkingId: parking.id,
          spacesLeft: carPark.freeSlots,
          trend: parseTrend(carPark.trend),
          measuredAt: DateTime.now(),
        });
      } catch (error) {
        console.error(error);
        throw error;
      }
    }

    // Hide any parking no longer present in the upstream API (e.g. split lots)
    await Parking.query()
      .whereNotIn("symbol", [...seenSymbols])
      .update({ is_visible: false });

    this.logger.info('"SynchronizeParkings" finished');
  }
}
