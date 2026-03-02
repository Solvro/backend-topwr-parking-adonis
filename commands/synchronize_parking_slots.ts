import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";

import type { CarPark } from "../app/helpers/iparking_api.js";
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
          (parking): parking is typeof parking & { externalId: number } =>
            parking.externalId !== null,
        )
        .map((parking) => [parking.externalId, parking]),
    );

    const unknownExternalIds = requestedExternalIds.filter(
      (externalId) => !knownByExternalId.has(externalId),
    );

    if (unknownExternalIds.length > 0) {
      this.logger.info(
        `Unknown external parking IDs found: ${unknownExternalIds.join(", ")}. Running metadata sync for missing lots.`,
      );
      await this.syncUnknownParkings(unknownExternalIds);

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

  private async syncUnknownParkings(unknownExternalIds: number[]) {
    const carParks = await getCarParks();
    const unknownCarParks = carParks.filter((park) =>
      unknownExternalIds.includes(park.id),
    );

    if (unknownCarParks.length === 0) {
      return;
    }

    let nextLocalId = await this.getNextLocalId();

    for (const carPark of unknownCarParks) {
      await this.upsertMetadataParking(carPark, nextLocalId);
      nextLocalId += 1;
    }
  }

  private async upsertMetadataParking(carPark: CarPark, nextLocalId: number) {
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
      return;
    }

    await Parking.create({
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
  }

  private async getNextLocalId(): Promise<number> {
    const lastParking = await Parking.query().orderBy("id", "desc").first();
    return (lastParking?.id ?? 0) + 1;
  }
}
