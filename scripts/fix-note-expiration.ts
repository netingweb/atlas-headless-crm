import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenants = ['demo', 'demo2'];
const defaultOffsetMs = 7 * 24 * 60 * 60 * 1000; // 7 giorni

type PrimitiveDate = string | number | Date | null | undefined;

function parseDateValue(value: PrimitiveDate): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const timestamp = value > 1e12 ? value : value * 1000;
    const d = new Date(timestamp);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }

  return null;
}

async function fixNotes(): Promise<void> {
  const client = await MongoClient.connect(mongoUri);
  const db = client.db(dbName);
  const now = Date.now();

  try {
    for (const tenant of tenants) {
      const regex = new RegExp(`^${tenant}_.+_note$`, 'i');
      const collections = await db.listCollections({ name: { $regex: regex } }).toArray();

      if (!collections.length) {
        console.log(`ℹ️  Nessuna collection note trovata per tenant ${tenant}`);
        continue;
      }

      for (const coll of collections) {
        const name = coll.name;
        const docs = await db.collection(name).find({}).toArray();
        if (!docs.length) {
          console.log(`- ${name}: nessun documento da aggiornare`);
          continue;
        }

        let updated = 0;
        for (const doc of docs) {
          const parsedDate = parseDateValue(doc.expiration_date_time);
          const targetDate =
            parsedDate ||
            new Date(
              doc.created_at
                ? parseDateValue(doc.created_at)!.getTime() + defaultOffsetMs
                : now + defaultOffsetMs
            );

          const isAlreadyDate =
            doc.expiration_date_time instanceof Date &&
            !Number.isNaN(doc.expiration_date_time.getTime());

          if (
            !isAlreadyDate ||
            (parsedDate && parsedDate.getTime() !== doc.expiration_date_time.getTime())
          ) {
            await db.collection(name).updateOne(
              { _id: doc._id },
              {
                $set: {
                  expiration_date_time: targetDate,
                },
              }
            );
            updated++;
          }
        }
        console.log(`- ${name}: aggiornati ${updated} documenti su ${docs.length}`);
      }
    }

    console.log('\n✅ Normalizzazione expiration_date_time completata\n');
  } catch (error) {
    console.error('❌ Errore durante la normalizzazione:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

fixNotes();
