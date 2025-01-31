import { DateTime } from "luxon";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Parking from "#models/parking";

import { getParkingAPI } from "../app/helpers/captcha.js";

interface UpstreamParking {
  id: string;
  parking_id: string;
  czas_pomiaru: string;
  liczba_miejsc: string;
  symbol: string;
  type: string | null | undefined;
  nazwa: string;
  open_hour: string | null | undefined;
  close_hour: string | null | undefined;
  places: string;
  geo_lan: string;
  geo_lat: string;
  photo: string;
  aktywny: string;
  show_park: string;
  lp: string;
  address: string;
  trend: string;
}

interface UpstreamParkingResponse {
  success: number;
  places: UpstreamParking[];
}

function isUpstreamParking(input: object): input is UpstreamParkingResponse {
  return "places" in input && typeof input.places === "object";
}

export default class SynchronizeParkings extends BaseCommand {
  static commandName = "synchronize:parkings";
  static description = "";

  static options: CommandOptions = {
    startApp: true,
  };

  async run() {
    const parkings = (await getParkingAPI({ o: "get_parks" })) as Record<
      string,
      string
    >;

    if (!isUpstreamParking(parkings)) {
      console.error("Wrong Parking API response");
      this.logger.error("Wrong Parking API response");
      return false;
    }

    this.logger.debug(JSON.stringify(parkings, null, 2));
    for (const place of parkings.places) {
      this.logger.debug(JSON.stringify(place, null, 2));

      let parking;
      try {
        parking = await Parking.updateOrCreate(
          {
            id: Number(place.id),
          },
          {
            symbol: place.symbol,
            name: place.nazwa,
            closeHour: place.close_hour,
            openHour: place.open_hour,
            type: place.type,
            places: Number(place.places),
            geoLan: Number(place.geo_lan),
            geoLat: Number(place.geo_lat),
            isVisible: Boolean(place.show_park),
            isActive: Boolean(place.aktywny),
            address: place.address,
          },
        );
      } catch (error) {
        console.error(error);
        throw error;
      }

      await parking.related("availabilities").updateOrCreate(
        {
          measuredAt: DateTime.fromFormat(
            place.czas_pomiaru,
            "yyyy-MM-dd HH:mm:ss",
            { zone: "Europe/Warsaw", setZone: true },
          ),
        },
        {
          spacesLeft: Number(place.liczba_miejsc),
          trend: Number(place.trend),
        },
      );
    }

    this.logger.info('"SynchronizeParkings" finished');
  }
}
