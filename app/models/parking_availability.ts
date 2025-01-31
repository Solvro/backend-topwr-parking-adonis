import { DateTime } from "luxon";

import { BaseModel, belongsTo, column } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

import Parking from "./parking.js";

export default class ParkingAvailability extends BaseModel {
  @column({ isPrimary: true })
  declare id: number;

  @column()
  declare parkingId: number;

  @column()
  declare spacesLeft: number;

  @column()
  declare trend: number;

  @column.dateTime()
  declare measuredAt: DateTime;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime;

  @belongsTo(() => Parking)
  declare parking: BelongsTo<typeof Parking>;
}
