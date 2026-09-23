import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";

import { getCarParksFreeSlots } from "../app/helpers/iparking_api.js";
import type { CarParkFreeSlot } from "../app/helpers/iparking_api.js";

export default class SynchronizeParkingSlots extends BaseCommand {
  static commandName = "synchronize:parking-slots";
  static description = "Synchronize free slots from iParking";

  static options: CommandOptions = {
    startApp: true,
  };
  private readonly trendMap: Record<string, number> = {
    constant: 0,
    up: 1,
    down: -1,
  };
  private parseTrend(trend: string): number {
    return this.trendMap[trend] ?? 0;
  }

  async run() {
    let freeSlots = await getCarParksFreeSlots();
    freeSlots = freeSlots.filter(
      /* TEMPORAL FIX!!!!!!!!
      We skip the this parnikng od external_id = 3 beacause it's not actual but external api 
      parkinging provider currently shares it as avctive. Results in errors after 
      parking "Strefa Kultury Studenckiej" was changed to "Parking Wrońskiego"
      */
      function skipSKSByExternalid(value: CarParkFreeSlot) {
        return value.id !== 3;
      },
    );
    const requestedExternalIds = freeSlots.map((slot) => slot.id);

    const knownParkings = await Parking.query().whereIn(
      "external_id",
      requestedExternalIds,
    );

    const knownByExternalId = new Map<number, Parking>(
      knownParkings
        .filter(
          (parking): parking is Parking & { externalId: number } =>
            parking.externalId !== null,
        )
        .map((parking) => [parking.externalId, parking]),
    );

    const unknownExternalIds = requestedExternalIds.filter(
      (externalId) => !knownByExternalId.has(externalId),
    );

    if (unknownExternalIds.length > 0) {
      this.logger.warning(
        `Unknown external parking IDs found: ${unknownExternalIds.join(", ")}. Running sync for all CarParks.`,
      );
      await this.syncUnknownParkings();

      const refreshedParkings = await Parking.query().whereIn(
        "external_id",
        requestedExternalIds,
      );
      knownByExternalId.clear();
      for (const parking of refreshedParkings) {
        if (parking.externalId !== null) {
          knownByExternalId.set(parking.externalId, parking);
        }
      }
    }

    const measuredAt = DateTime.now();

    for (const slot of freeSlots) {
      const parking = knownByExternalId.get(slot.id);
      if (parking === undefined) {
        this.logger.warning(
          `Skipping slot update for unknown external ID ${slot.id}`,
        );
        continue;
      }

      await ParkingAvailability.create({
        parkingId: parking.id,
        spacesLeft: slot.freeSlots,
        trend: this.parseTrend(slot.trend),
        measuredAt,
      });
    }

    this.logger.info('"SynchronizeParkingSlots" finished');
  }

  private async syncUnknownParkings() {
    await this.kernel.exec("synchronize:parkings", []);
  }
}
