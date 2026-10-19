import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

export default class SynchronizeParkingsWithSlots extends BaseCommand {
  static commandName = "synchronize:parkings-with-slots";
  static description =
    "Synchronize free slots, synchronizing parkings and retrying once if any parkings are missing.";

  static options: CommandOptions = {
    startApp: true,
  };

  async run() {
    const slotsCommand = await this.kernel.exec(
      "synchronize:parkings-slots",
      [],
    );

    if (slotsCommand.exitCode === 2) {
      const parkingsCommand = await this.kernel.exec(
        "synchronize:parkings",
        [],
      );

      if (parkingsCommand.exitCode !== 0) {
        this.logger.error('"Synchronize: parking-with-slots" failed');
        this.exitCode = 1;
        return;
      }
    }
    this.exitCode = slotsCommand.exitCode;
  }
}
