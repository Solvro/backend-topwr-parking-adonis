import { DateTime } from "luxon";

import { Exception } from "@adonisjs/core/exceptions";
import { HttpContext } from "@adonisjs/core/http";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";
import env from "#start/env";

export default class ParkingsController {
  /**
   * Display a list of resource
   */
  async index() {
    const parkingLots = await Parking.query()
      .preload("availabilities", (query) =>
        query.orderBy("measured_at", "desc").groupLimit(1),
      )
      .orderBy("id", "asc");
    return {
      success: 0,
      places: parkingLots.map((lot) => {
        return {
          id: lot.id.toString(),
          parking_id: lot.id.toString(),
          liczba_miejsc:
            lot.availabilities.length > 0
              ? lot.availabilities[0].spacesLeft.toString()
              : "0",
          symbol: lot.symbol,
          type: lot.type,
          nazwa: lot.name,
          open_hour: lot.openHour,
          close_hour: lot.closeHour,
          places: lot.places.toString(),
          geo_lan: lot.geoLan.toString(),
          geo_lat: lot.geoLat.toString(),
          photo: `${env.get("APP_URL")}/images/parkings/${lot.id}.jpg`,
          aktywny: lot.isActive ? "1" : "0",
          show_park: lot.isVisible ? "1" : "0",
          lp: "",
          address: lot.address,
          trend:
            lot.availabilities.length > 0
              ? lot.availabilities[0].trend.toString()
              : "?",
        };
      }),
    };
  }

  /**
   * Show individual resource
   */
  async show({ request }: HttpContext) {
    const id = Number(request.param("id"));
    if (Number.isNaN(id) || id % 1 !== 0) {
      throw new Exception("kurwa int miał być", {
        status: 400,
        code: "E_DEBIL",
      });
    }
    const plNow = DateTime.now().setZone("Europe/Warsaw");
    const startOfDay = plNow
      .set({
        hour: 6,
        minute: 0,
        second: 0,
        millisecond: 0,
      })
      .toJSDate();
    const endOfDay = plNow
      .set({
        hour: 23,
        minute: 59,
        second: 59,
        millisecond: 999,
      })
      .toJSDate();

    const availabilities = await ParkingAvailability.query()
      .where("parking_id", id)
      .whereBetween("measured_at", [startOfDay, endOfDay])
      .orderBy("measured_at", "asc");

    return {
      success: 0,
      slots: {
        labels: availabilities.map((availability) =>
          availability.measuredAt.setZone("Europe/Warsaw").toFormat("HH:mm"),
        ),
        data: availabilities.map((availability) =>
          String(availability.spacesLeft),
        ),
      },
    };
  }
}
