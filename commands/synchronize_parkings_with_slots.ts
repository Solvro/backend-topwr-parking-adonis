import { toIBaseError } from "@solvro/error-handling/base";
import {
  analyzeErrorStack,
  prepareReportForLogging,
} from "@solvro/error-handling/reporting";
import { DateTime } from "luxon";

import { BaseCommand, flags } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import env from "#start/env";

interface DiscordWebhookPayload {
  title: string;
  description: string;
  /** Event time as an ISO 8601 string, e.g. "2026-11-06T12:00:00Z". */
  timestamp: string;
}

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

      const description =
        this.error === null || this.error === undefined
          ? `Command exited with code ${this.exitCode}`
          : prepareReportForLogging(
              analyzeErrorStack(toIBaseError(this.error)),
            );

      // : `Command exited with code ${this.exitCode}`;a

      try {
        const payload: DiscordWebhookPayload = {
          title: `❌ [ERROR]: ${title}`,
          description,
          timestamp: DateTime.now().toISO(),
        };
        const response = await fetch(
          env.get("DISORD_WEBHOOK_URL") as unknown as string,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ embeds: [payload] }),
          },
        );

        if (!response.ok) {
          this.logger.warning(
            `Failed to send Discord notification: HTTP ${response.status}`,
          );
        }
      } catch (notificationError) {
        const report = analyzeErrorStack(toIBaseError(notificationError));
        this.logger.warning(
          `Failed to send Discord notification: ${prepareReportForLogging(report)}`,
        );
      }
    }
  }
}
