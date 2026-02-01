import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db';

export function GET() {
	const db = getDb();
	const now = new Date().toISOString();

	const drops = db
		.prepare(
			`SELECT * FROM drops
			 WHERE status IN ('scheduled','live')
			   AND opens_at <= ?
			   AND (closes_at IS NULL OR closes_at > ?)
			 ORDER BY drop_date ASC`
		)
		.all(now, now) as any[];

	for (const drop of drops) {
		drop.items = db
			.prepare(
				`SELECT di.*, p.name, p.description, p.image, p.category,
				        COALESCE(di.price_cents_override, p.price_cents) as price_cents
				 FROM drop_items di
				 JOIN products p ON p.id = di.product_id
				 WHERE di.drop_id = ?`
			)
			.all(drop.id);
	}

	return json(drops);
}
