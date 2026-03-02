import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "parkings";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text("access").nullable();
      table.boolean("is_active").defaultTo(true).notNullable().alter();
      table.boolean("is_visible").defaultTo(true).notNullable().alter();
      table.integer("external_id").nullable();
      table.unique(["external_id"]);
      table.unique(["symbol"]);
    });

    await this.db.rawQuery(`CREATE SEQUENCE IF NOT EXISTS parkings_id_seq`);
    await this.db.rawQuery(
      `SELECT setval('parkings_id_seq', COALESCE((SELECT MAX(id) FROM ${this.tableName}), 1))`,
    );
    await this.db.rawQuery(
      `ALTER TABLE ${this.tableName} ALTER COLUMN id SET DEFAULT nextval('parkings_id_seq')`,
    );
    await this.db.rawQuery(
      `ALTER SEQUENCE parkings_id_seq OWNED BY ${this.tableName}.id`,
    );
  }

  async down() {
    await this.db.rawQuery(
      `ALTER TABLE ${this.tableName} ALTER COLUMN id DROP DEFAULT`,
    );
    await this.db.rawQuery(`DROP SEQUENCE IF EXISTS parkings_id_seq`);

    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(["symbol"]);
      table.dropUnique(["external_id"]);
      table.dropColumn("external_id");
      table.dropColumn("access");
      table.boolean("is_active").defaultTo(null).notNullable().alter();
      table.boolean("is_visible").defaultTo(null).notNullable().alter();
    });
  }
}
