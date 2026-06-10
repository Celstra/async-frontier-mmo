import { pgTable, text } from 'drizzle-orm/pg-core';

export const pilots = pgTable('pilots', {
	id: text('id').primaryKey(),
	frameId: text('frame_id').notNull().default('recon')
});
