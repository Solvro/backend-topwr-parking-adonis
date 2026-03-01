import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "parkings";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text("access").nullable();
      table.boolean("is_active").defaultTo(true).alter();
      table.boolean("is_visible").defaultTo(true).alter();
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn("access");
      table.boolean("is_active").defaultTo(null).notNullable().alter();
      table.boolean("is_visible").defaultTo(null).notNullable().alter();
    });
  }
}
