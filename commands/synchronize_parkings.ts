import { nullableMap } from "@solvro/utils/option";
import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";

import type { CarPark } from "../app/helpers/iparking_api.js";
import { getCarParks } from "../app/helpers/iparking_api.js";

export default class SynchronizeParkings extends BaseCommand {
  static commandName =
    "Synchronize car park details without updating their's fress slots";

  static options: CommandOptions = {
    startApp: true,
  };

  private isoTsToTime(this: void, iso: string): string {
    return DateTime.fromISO(iso)
      .setZone("Europe/Warsaw")
      .setLocale("pl-PL")
      .toLocaleString(DateTime.TIME_24_WITH_SECONDS);
  }
  private mapToParkingModel(carPark: CarPark): Parking {
    return new Parking().fill({
      symbol: carPark.symbol,
      externalId: carPark.id,
      name: carPark.name,
      access: carPark.access,
      closeHour: nullableMap(carPark.closeHour, this.isoTsToTime),
      openHour: nullableMap(carPark.openHour, this.isoTsToTime),
      places: carPark.totalSlots,
      geoLan: Number(carPark.geoLan),
      geoLat: Number(carPark.geoLat),
      address: carPark.address,
      isActive: true,
      isVisible: true,
    });
  }

  async run() {
    let carParks = await getCarParks();
    carParks = carParks.filter(
      /* TEMPORAL FIX!!!!!!!!
      We skip the this parnikng beacause it's not actual but external api 
      parkinging provider currently shares it as avctive. Results in errors after 
      parking "Strefa Kultury Studenckiej" was changed to "Parking Wrońskiego"
      */
      function skipSKSByName(value) {
        return value.name !== "Strefa Kultury Studenckiej";
      },
    );
    const seenParkingSymbols = new Set<string>();

    for (const carPark of carParks) {
      seenParkingSymbols.add(carPark.symbol);
      try {
        await this.insertParkingModelToDatabase(
          this.mapToParkingModel(carPark),
        );
      } catch (error) {
        this.logger.warning(
          `Failed to synchronize parking "${carPark.symbol}" (external ID: ${carPark.id}): ${error instanceof Error ? error.message : String(error)}`,
        );
        this.exitCode = 1;
      }
    }

    // Hide any parking no longer present in the upstream API (e.g. split lots)
    await Parking.query()
      .whereNotIn("symbol", [...seenParkingSymbols])
      .update({ is_visible: false });

    this.logger.info('"SynchronizeParkings" finished');
  }

  /**
   * Updates an existing parking or saves a new one when no match is found.
   * Matches by symbol first, falling back to the external ID.
   *
   * @param parkingInstance - Parking instance containing attributes to persist.
   * @returns The saved parking instance.
   */
  private async insertParkingModelToDatabase(parkingInstance: Parking) {
    let oldParkingInstance = await Parking.findBy(
      "symbol",
      parkingInstance.symbol,
    );

    oldParkingInstance ??= await Parking.findBy(
      "external_id",
      parkingInstance.externalId,
    );

    if (oldParkingInstance !== null) {
      return oldParkingInstance.merge(parkingInstance.$attributes).save();
    }
    return parkingInstance.save();
  }
}
