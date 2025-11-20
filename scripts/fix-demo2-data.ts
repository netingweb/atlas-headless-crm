import { Db, MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_atlas';
const dbName = process.env.MONGODB_DB_NAME || 'crm_atlas';
const tenantId = 'demo2';

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
    return new Date(timestamp);
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }

  return null;
}

async function getUnitIds(db: Db): Promise<string[]> {
  const units = await db
    .collection('units_config')
    .find({ tenant_id: tenantId }, { projection: { unit_id: 1 } })
    .toArray();
  return Array.from(new Set(units.map((unit) => unit.unit_id)));
}

async function fixDemo2Data(): Promise<void> {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(dbName);
  const now = Date.now();

  try {
    const unitIds = await getUnitIds(db);

    // Ensure contact.name field is populated
    const contacts = await db.collection('demo2_contact').find({}).toArray();
    for (const contact of contacts) {
      const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim();
      await db.collection('demo2_contact').updateOne(
        { _id: contact._id },
        {
          $set: {
            name: name || contact.email || `Contact ${contact._id}`,
          },
        }
      );
    }
    console.log(`✅ Updated ${contacts.length} contact(s) with name field`);
    const normalizedContacts = await db.collection('demo2_contact').find({}).toArray();

    // Ensure notes have status + expiration_date_time
    const noteCollections = unitIds.map((unitId) => `${tenantId}_${unitId}_note`);
    for (const collName of noteCollections) {
      const notes = await db.collection(collName).find({}).toArray();
      for (const [index, note] of notes.entries()) {
        const expiration =
          note.expiration_date_time instanceof Date
            ? note.expiration_date_time
            : new Date(now + (index + 1) * 7 * 24 * 60 * 60 * 1000);
        await db.collection(collName).updateOne(
          { _id: note._id },
          {
            $set: {
              status: note.status || 'to do',
              expiration_date_time: expiration,
            },
          }
        );
      }
      console.log(`✅ Updated ${notes.length} note(s) in ${collName}`);
    }

    // Normalize task due_date fields (must be stored as Date objects)
    const taskCollections = unitIds.map((unitId) => `${tenantId}_${unitId}_task`);
    for (const collName of taskCollections) {
      const tasks = await db.collection(collName).find({}).toArray();
      if (!tasks.length) continue;

      let updatedCount = 0;
      for (const task of tasks) {
        const updates: Record<string, unknown> = {};
        if (task.due_date && !(task.due_date instanceof Date)) {
          const parsed = parseDateValue(task.due_date);
          if (parsed) {
            updates.due_date = parsed;
          }
        }

        if (Object.keys(updates).length > 0) {
          await db.collection(collName).updateOne({ _id: task._id }, { $set: updates });
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        console.log(`✅ Normalized ${updatedCount} task(s) in ${collName}`);
      }
    }

    const products = await db.collection('demo2_product').find({}).toArray();
    const fallbackProductId = products[0]?._id;

    const contactByName = new Map<string, string>();
    for (const contact of normalizedContacts) {
      if (typeof contact.name === 'string') {
        contactByName.set(contact.name.toLowerCase().trim(), contact._id);
      }
    }
    const fallbackContactId = normalizedContacts[0]?._id;

    // Ensure deals have deal_number
    const dealCollections = unitIds.map((unitId) => ({
      name: `${tenantId}_${unitId}_deal`,
      prefix: `DL-${unitId.split('_')[0]?.substring(0, 3).toUpperCase() || 'TEN'}`,
    }));
    for (const { name, prefix } of dealCollections) {
      const deals = await db.collection(name).find({}).toArray();
      for (const [index, deal] of deals.entries()) {
        const dealNumber = `${prefix}-${String(index + 1).padStart(3, '0')}`;
        const updates: Record<string, unknown> = {};

        if (!deal.deal_number) {
          updates.deal_number = dealNumber;
        }

        if (!deal.contact_id) {
          const normalizedName =
            typeof deal.contact_name === 'string' ? deal.contact_name.toLowerCase().trim() : '';
          const contactId =
            (normalizedName && contactByName.get(normalizedName)) || fallbackContactId;
          if (contactId) {
            updates.contact_id = contactId;
          }
        }

        if (!deal.product_id && fallbackProductId) {
          updates.product_id = fallbackProductId;
        }

        const startDate = parseDateValue(deal.start_date);
        if (startDate && !(deal.start_date instanceof Date)) {
          updates.start_date = startDate;
        }

        const closeDate = parseDateValue(deal.close_date);
        if (closeDate && !(deal.close_date instanceof Date)) {
          updates.close_date = closeDate;
        }

        const expectedCloseDate = parseDateValue(deal.expected_close_date);
        if (expectedCloseDate && !(deal.expected_close_date instanceof Date)) {
          updates.expected_close_date = expectedCloseDate;
        }

        if (Object.keys(updates).length > 0) {
          await db.collection(name).updateOne({ _id: deal._id }, { $set: updates });
        }
      }
      console.log(`✅ Updated ${deals.length} deal(s) in ${name}`);
    }
  } finally {
    await client.close();
  }
}

fixDemo2Data()
  .then(() => {
    console.log('\n✅ demo2 data normalized\n');
  })
  .catch((error) => {
    console.error('❌ Failed to normalize demo2 data:', error);
    process.exit(1);
  });
