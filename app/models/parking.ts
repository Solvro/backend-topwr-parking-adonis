import { DateTime } from "luxon";

import { BaseModel, column, hasMany } from "@adonisjs/lucid/orm";
import type { HasMany } from "@adonisjs/lucid/types/relations";

import ParkingAvailability from "./parking_availability.js";

export default class Parking extends BaseModel {
  static selfAssignPrimaryKey = true;

  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare symbol: string;

  @column()
  declare type: string | null;

  @column()
  declare name: string;

  @column()
  declare openHour: string | null;

  @column()
  declare closeHour: string | null;

  @column()
  declare places: number;

  @column()
  declare geoLan: number;

  @column()
  declare geoLat: number;

  @column()
  declare isActive: boolean;

  @column()
  declare isVisible: boolean;

  @column()
  declare address: string;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @hasMany(() => ParkingAvailability)
  declare availabilities: HasMany<typeof ParkingAvailability>;
}
