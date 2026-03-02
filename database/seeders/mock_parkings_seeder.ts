import { DateTime } from "luxon";

import { BaseSeeder } from "@adonisjs/lucid/seeders";

import Parking from "#models/parking";
import ParkingAvailability from "#models/parking_availability";

const MOCK_PARKINGS = [
  {
    id: 2,
    symbol: "C13",
    name: "Polinka",
    access: null,
    openHour: null,
    closeHour: null,
    places: 54,
    geoLan: 17.058468,
    geoLat: 51.10739,
    address: "wybrzeże Stanisława Wyspiańskiego 25, 50-370 Wrocław",
    freeSlots: 0,
    trend: 0,
  },
  {
    id: 4,
    symbol: "WRO",
    name: "Parking Wrońskiego",
    access: null,
    openHour: "06:00:00",
    closeHour: "22:00:00",
    places: 207,
    geoLan: 17.055565,
    geoLat: 51.108963,
    address: "Hoene-Wrońskiego 10, 50-376 Wrocław",
    freeSlots: 18,
    trend: -1,
  },
  {
    id: 5,
    symbol: "D20",
    name: "D20 - D21",
    access: null,
    openHour: "06:00:00",
    closeHour: "22:30:00",
    places: 76,
    geoLan: 17.059677,
    geoLat: 51.11005,
    address: "Janiszewskiego 8, 50-372 Wrocław",
    freeSlots: 0,
    trend: 0,
  },
  {
    id: 6,
    symbol: "GEO-L",
    name: "GEO LO1 Geocentrum",
    access: null,
    openHour: "06:00:00",
    closeHour: "22:30:00",
    places: 301,
    geoLan: 17.055334,
    geoLat: 51.104164,
    address: "Na Grobli 15, 50-421 Wrocław",
    freeSlots: 226,
    trend: 0,
  },
  {
    id: 7,
    symbol: "E01",
    name: "Architektura",
    access: null,
    openHour: "06:00:00",
    closeHour: "22:30:00",
    places: 75,
    geoLan: 17.054167,
    geoLat: 51.118736,
    address: "Bolesława Prusa 53/55, 50-317 Wrocław",
    freeSlots: 51,
    trend: -1,
  },
] as const;

export default class MockParkingsSeeder extends BaseSeeder {
  static environment = ["development"];

  async run() {
    await ParkingAvailability.query().delete();
    await Parking.query().delete();

    const now = DateTime.now();

    for (const mock of MOCK_PARKINGS) {
      const parking = await Parking.create({
        id: mock.id,
        symbol: mock.symbol,
        name: mock.name,
        access: mock.access,
        openHour: mock.openHour,
        closeHour: mock.closeHour,
        places: mock.places,
        geoLan: mock.geoLan,
        geoLat: mock.geoLat,
        address: mock.address,
        isActive: true,
        isVisible: true,
      });

      await ParkingAvailability.create({
        parkingId: parking.id,
        spacesLeft: mock.freeSlots,
        trend: mock.trend,
        measuredAt: now,
      });
    }
  }
}
