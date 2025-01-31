import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "parkings";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer("id");
      table.primary(["id"]);

      table.text("symbol").notNullable();
      table.text("type").nullable();
      table.text("name").notNullable();
      table.text("open_hour").nullable();
      table.text("close_hour").nullable();
      table.integer("places").notNullable();
      table.float("geo_lan").notNullable();
      table.float("geo_lat").notNullable();
      table.boolean("is_active").notNullable();
      table.boolean("is_visible").notNullable();
      table.text("address").notNullable();

      table.timestamp("created_at").notNullable();
      table.timestamp("updated_at").notNullable();
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
