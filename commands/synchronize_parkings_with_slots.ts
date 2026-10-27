import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

export default class SynchronizeParkingsWithSlots extends BaseCommand {
  static commandName = "synchronize:parkings-with-slots";
  static description =
    "Synchronize parking availability from iParking. If car parks are missing, synchronize their details and retry availability synchronization once.";

  static options: CommandOptions = {
    startApp: true,
  };

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
        this.logger.error(`"${this.commandName}" failed`);
        this.exitCode = parkingsCommand.exitCode;
        return;
      }

      // Retry once after synchronizing car parks and propagate the retry result.
      slotsCommand = await this.kernel.exec("synchronize:parkings-slots", []);
    }
    this.exitCode = slotsCommand.exitCode;
    this.logger.info(`"${this.commandName}" completed`);
  }
}
