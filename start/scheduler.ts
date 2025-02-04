import scheduler from "adonisjs-scheduler/services/main";

import logger from "@adonisjs/core/services/logger";

import env from "#start/env";

const parkingInterval = env.get("PARKING_INTERVAL");

logger.info(`Parking synchronization interval: ${parkingInterval}`);

switch (parkingInterval) {
  case "EVERY_MINUTE":
    scheduler.command("synchronize:parkings").everyMinute();
    break;
  case "EVERY_5":
    scheduler.command("synchronize:parkings").everyFiveMinutes();
    break;
  case "EVERY_15":
    scheduler.command("synchronize:parkings").everyFifteenMinutes();
    break;
}
