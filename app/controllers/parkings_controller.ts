import { DateTime } from "luxon";

import type { HttpContext } from "@adonisjs/core/http";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";
import env from "#start/env";
import { showParkingValidator } from "#validators/parking_id";

const APP_URL = env.get("APP_URL");
/**
 * Override of the faulty DI API coordinates for Polinka (C13)
 */
const POLINKA_COORDINATES_OVERRIDE = { lat: "51.107502", lan: "17.058340" };
export default class ParkingsController {
  /**
   * Display a list of resource
   */
  async index() {
    // LATERAL + LIMIT 1 lets Postgres fetch only the latest measurement per parking
    // via parking_availabilities_latest_idx instead of scanning the whole history
    const parkingLots = await Parking.query()
      .select("parkings.*")
      .select("latest.spaces_left as latest_spaces_left")
      .select("latest.trend as latest_trend")
      .joinRaw(
        `LEFT JOIN LATERAL (
          SELECT spaces_left, trend
          FROM parking_availabilities
          WHERE parking_id = parkings.id
          ORDER BY measured_at DESC, id DESC
          LIMIT 1
        ) AS latest ON true`,
      )
      .where("parkings.is_visible", true)
      .orderBy("parkings.id", "asc");
    return {
      success: 0,
      places: parkingLots.map((lot) => {
        return {
          id: lot.id.toString(),
          parking_id: lot.id.toString(),
          liczba_miejsc: String(lot.$extras.latest_spaces_left ?? 0),
          symbol: lot.symbol,
          type: lot.type,
          access: lot.access,
          nazwa: lot.name,
          open_hour: lot.openHour,
          close_hour: lot.closeHour,
          places: lot.places.toString(),
          geo_lan:
            lot.symbol === "C13"
              ? POLINKA_COORDINATES_OVERRIDE.lan
              : lot.geoLan.toString(),
          geo_lat:
            lot.symbol === "C13"
              ? POLINKA_COORDINATES_OVERRIDE.lat
              : lot.geoLat.toString(),
          photo: `${APP_URL}/images/parkings/original/${lot.symbol}.jpg`,
          miniature: `${APP_URL}/images/parkings/miniatures/${lot.symbol}.jpg`,
          aktywny: lot.isActive ? "1" : "0",
          show_park: lot.isVisible ? "1" : "0",
          lp: "",
          address: lot.address,
          trend: String(lot.$extras.latest_trend ?? "?"),
        };
      }),
    };
  }

  async extraInfo() {
    return {
      info: `Parkingi zlokalizowane przy ul. Hoene-Wrońskiego oraz w Pasażu Studenckim są ogólnodostępne dla pracowników, doktorantów i studentów PWr od poniedziałku do piątku w godzinach 14:30-22:30, a także przez cały weekend.

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
