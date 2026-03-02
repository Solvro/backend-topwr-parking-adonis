import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "parkings";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer("external_id").nullable();
      table.unique(["external_id"]);
      table.unique(["symbol"]);
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(["symbol"]);
      table.dropUnique(["external_id"]);
      table.dropColumn("external_id");
    });
  }
}
