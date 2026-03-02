import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";

import {
  getCarParks,
  getCarParksFreeSlots,
} from "../app/helpers/iparking_api.js";
import {
  parseTrend,
  upsertMetadataParking,
} from "../app/helpers/parking_sync.js";

export default class SynchronizeParkingSlots extends BaseCommand {
  static commandName = "synchronize:parking-slots";
  static description = "Synchronize free slots from iParking";

  static options: CommandOptions = {
    startApp: true,
  };

  async run() {
    const freeSlots = await getCarParksFreeSlots();

    const requestedExternalIds = [...new Set(freeSlots.map((slot) => slot.id))];
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
      this.logger.info(
        `Unknown external parking IDs found: ${unknownExternalIds.join(", ")}. Running metadata sync for all lots.`,
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
        this.logger.info(
          `Skipping slot update for unknown external ID ${slot.id}`,
        );
        continue;
      }

      await ParkingAvailability.create({
        parkingId: parking.id,
        spacesLeft: slot.freeSlots,
        trend: parseTrend(slot.trend),
        measuredAt,
      });
    }

    this.logger.info('"SynchronizeParkingSlots" finished');
  }

  private async syncUnknownParkings() {
    const carParks = await getCarParks();
    for (const carPark of carParks) {
      await upsertMetadataParking(carPark);
    }
  }
}
