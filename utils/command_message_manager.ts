import { DateTime } from "luxon";

import DiscordWebhookManager from "./discord_webhook_manager.js";

const ONE_HOUR_SECONDS = 3600;
export const commandDiscordManager = new DiscordWebhookManager(
  DateTime.fromSeconds(ONE_HOUR_SECONDS),
);
