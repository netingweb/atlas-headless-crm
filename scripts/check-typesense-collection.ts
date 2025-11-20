import { loadRootEnv } from '@crm-atlas/utils';
import { getTypesenseClient } from '@crm-atlas/search';

async function checkCollection() {
  loadRootEnv();
  const client = getTypesenseClient();

  try {
    const coll = await client.collections('demo2_contact').retrieve();
    console.log('✅ Collection exists:', coll.name);
    console.log('   Documents:', coll.num_documents);

    const searchResult = await client.collections('demo2_contact').documents().search({
      q: 'bianchi',
      query_by: '*',
      per_page: 10,
    });

    console.log('\n📊 Search results for "bianchi":');
    console.log('   Found:', searchResult.found);
    if (searchResult.hits && searchResult.hits.length > 0) {
      searchResult.hits.forEach((hit: unknown) => {
        const doc =
          (hit as { document?: Record<string, unknown> }).document ||
          (hit as Record<string, unknown>);
        console.log('   -', doc.name || doc._id);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

checkCollection().catch(console.error);
