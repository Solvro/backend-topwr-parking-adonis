import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";

import { getCarParksFreeSlots } from "../app/helpers/iparking_api.js";
import type { CarParkFreeSlot } from "../app/helpers/iparking_api.js";

export default class SynchronizeParkingSlots extends BaseCommand {
  static commandName = "synchronize:parkings-slots";
  static description =
    "Record parking availability from iParking, skipping entries with null free-slot counts. Exit with code 2 without saving records if any parking is missing; run synchronize:parkings first.";

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

  /**
   * Saves availability records for car parks returned by iParking.
   * Skips entries whose free-slot count is null.
   *
   * @throws {Error} If a database query or availability insert fails.
   *
   * @remarks
   * Sets exit code 1 if the API request fails (including a timeout) or the
   * response cannot be parsed. No availability records are saved.
   * Sets exit code 2 if any remaining external ID has no matching parking in the
   * database. No availability records are saved; run synchronize:parkings first.
   */
  async run() {
    this.logger.info(`Start "${this.commandName}" command`);
    let freeSlots: CarParkFreeSlot[];

    try {
      freeSlots = await getCarParksFreeSlots();
    } catch (error) {
      this.logger.error(
        `Failed to fetch parking slots from iParking: ${error}`,
      );
      this.exitCode = 1;
      return;
    }
    freeSlots = freeSlots.filter(
      // Skip entries with null freeSlots, which may indicate an iParking's inside error.
      function skipNullSlots(value: CarParkFreeSlot) {
        return value.freeSlots !== null;
      },
    );
    // Collect external IDs from entries with known availability.
    const requestedExternalIds = freeSlots.map((slot) => slot.id);

    const knownParkings = await Parking.query().whereIn(
      "external_id",
      requestedExternalIds,
    );

    const knownParkingsByExternalId = new Map<number, Parking>(
      knownParkings
        .filter(
          (parking): parking is Parking & { externalId: number } =>
            parking.externalId !== null,
        )
        .map((parking) => [parking.externalId, parking]),
    );

    const unknownExternalIds = requestedExternalIds.filter(
      (externalId) => !knownParkingsByExternalId.has(externalId),
    );

    if (unknownExternalIds.length > 0) {
      this.logger.error(
        `Missing parkings for external IDs: ${unknownExternalIds.join(", ")}. ` +
          'Run "node ace synchronize:parkings" first.',
      );

      this.exitCode = 2;
      return;
    }

    const measuredAt = DateTime.now();

    for (const slot of freeSlots) {
      const parking = knownParkingsByExternalId.get(slot.id);
      if (parking === undefined) {
        this.logger.warning(
          `Skipping slot update for unknown external ID ${slot.id}`,
        );
        continue;
      }

      await ParkingAvailability.create({
        parkingId: parking.id,
        spacesLeft: slot.freeSlots as unknown as number,
        trend: this.parseTrend(slot.trend),
        measuredAt,
      });
    }

    this.logger.info(`"${this.commandName}" completed`);
  }
}
