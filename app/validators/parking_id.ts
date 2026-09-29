import vine from "@vinejs/vine";

interface ParkingIdMetadata {
  table: string;
  column: string;
}

export const showParkingValidator = vine
  .withMetaData<ParkingIdMetadata>()
  .compile(
    vine.object({
      id: vine
        .number()
        .withoutDecimals()
        .exists(async (db, value, field) => {
          const record = await db
            .query<{ found: number }>()
            .from(field.meta.table as string)
            .select(db.raw("1 AS found"))
            .where(field.meta.column as string, value)
            .first();

          return record !== null;
        }),
    }),
  );
