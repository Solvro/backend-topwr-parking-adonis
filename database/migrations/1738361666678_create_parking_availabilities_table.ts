import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "parking_availabilities";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id");

      table.integer("parking_id").notNullable();
      table.foreign("parking_id").references("id").inTable("parkings");

      table.integer("spaces_left").notNullable();
      table.integer("trend").notNullable();
      table.timestamp("measured_at").notNullable();

      table.timestamp("created_at").notNullable();
      table.timestamp("updated_at").notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
