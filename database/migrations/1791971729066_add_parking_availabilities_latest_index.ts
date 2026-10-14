import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "parking_availabilities";
  protected indexName = "parking_availabilities_latest_idx";

  static disableTransactions = true;

  async up() {
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS ${this.indexName}
      ON ${this.tableName} (parking_id, measured_at DESC, id DESC)
    `);
  }

  async down() {
    await this.db.rawQuery(
      `DROP INDEX CONCURRENTLY IF EXISTS ${this.indexName}`,
    );
  }
}
