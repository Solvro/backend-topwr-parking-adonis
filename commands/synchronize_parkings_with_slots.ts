import { DateTime } from "luxon";

import { BaseCommand, flags } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import { commandDiscordManager } from "../utils/command_message_manager.js";
import {
  MessagePayload,
  MessageType,
} from "../utils/discord_webhook_manager.js";

export default class SynchronizeParkingsWithSlots extends BaseCommand {
  static commandName = "synchronize:parkings-with-slots";
  static description =
    "Synchronize parking availability from iParking. If car parks are missing, synchronize their details and retry availability synchronization once.";

  static options: CommandOptions = {
    startApp: true,
  };

  @flags.boolean({
    alias: "w",
    description: "Enable discord webhooks on command error",
  })
  declare webhook: boolean;

  async run() {
    this.logger.info(`Start "${this.commandName}" command`);
    let slotsCommand = await this.kernel.exec("synchronize:parkings-slots", []);

    // Exit code 2 indicates missing car parks; other results require no retry.
    if (slotsCommand.exitCode === 2) {
      const parkingsCommand = await this.kernel.exec(
        "synchronize:parkings",
        [],
      );

      if (parkingsCommand.exitCode !== 0) {
        this.exitCode = parkingsCommand.exitCode;
        this.error = parkingsCommand.error as unknown;
        return;
      }

      // Retry once after synchronizing car parks and propagate the retry result.
      slotsCommand = await this.kernel.exec("synchronize:parkings-slots", []);
    }

    this.exitCode = slotsCommand.exitCode;
    this.error = slotsCommand.error as unknown;
  }

  async completed() {
    if (this.exitCode === 0) {
      this.logger.info(`"${this.commandName}" completed`);
      return;
    }

    this.logger.error(`"${this.commandName}" failed`);

    if (this.webhook) {
      const title = `backend-topwr-parking: command ${this.commandName} has failed`;
      const error: unknown = this.error;
      const description =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : `Command exited with code ${this.exitCode}`;

      try {
        const payload: MessagePayload = {
          messageType: MessageType.ERROR,
          title,
          description,
          timestamp: DateTime.now(),
        };
        const response = await commandDiscordManager.sendMessage(payload);

        if (!response.ok) {
          this.logger.warning(
            `Failed to send Discord notification: HTTP ${response.status}`,
          );
        }
      } catch (notificationError) {
        this.logger.warning(
          `Failed to send Discord notification: ${String(notificationError)}`,
        );
      }
    }
  }
}
