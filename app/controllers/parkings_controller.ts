import { DateTime } from "luxon";

import type { HttpContext } from "@adonisjs/core/http";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";
import env from "#start/env";
import { showParkingValidator } from "#validators/parking_id";

const APP_URL = env.get("APP_URL");
/**
 * Date since new parking instances are in development and shouldn't be currently displayed in the API response
 * Date is set to 01/09/2026 00:00:00, so any parking created after this date will be filtered out from the response
 */
const PARKING_IN_DEVELOPMENT_DATE = DateTime.local(2026, 9, 1);
export default class ParkingsController {
  /**
   * Display a list of resource
   */
  async index() {
    const parkingLots = await Parking.query()
      .where("is_visible", true)
      .where("createdAt", "<", PARKING_IN_DEVELOPMENT_DATE.toString())
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
          access: lot.access,
          nazwa: lot.name,
          open_hour: lot.openHour,
          close_hour: lot.closeHour,
          places: lot.places.toString(),
          geo_lan: lot.geoLan.toString(),
          geo_lat: lot.geoLat.toString(),
          photo: `${APP_URL}/images/parkings/original/${lot.symbol}.jpg`,
          miniature: `${APP_URL}/images/parkings/miniatures/${lot.symbol}.jpg`,
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

  async extraInfo() {
    return {
      info: `Parkingi zlokalizowane przy ul. Hoene-Wrońskiego oraz w Pasażu Studenckim są ogólnodostępne dla pracowników, doktorantów i studentów PWr od poniedziałku do piątku w godzinach 17:00-22:30, a także przez cały weekend.

W weekendy do dyspozycji pracowników, doktorantów i studentów PWr pozostaje również parking w budynku C-18 (Strefa Kultury Studenckiej).`,
    };
  }

  /**
   * Show individual resource
   */
  async show({ request }: HttpContext) {
    const payload = await request.validateUsing(showParkingValidator, {
      data: request.params(),
      meta: { table: "parkings", column: "id" },
    });

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
      .where("parking_id", payload.id)
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
