/**
 * List available contacts to find a valid ID for testing
 */

const TENANT = 'demo';
const UNIT = 'sales';
const API_URL = process.env.API_URL || 'http://localhost:3000';
const JWT_TOKEN = process.env.JWT_TOKEN || 'YOUR_JWT_TOKEN_HERE';

async function listContacts() {
  console.log('\n📋 Listing contacts in demo/sales...\n');

  try {
    const url = `${API_URL}/${TENANT}/${UNIT}/entities/contact?limit=10`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch contacts: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    const contacts = result.data || result;

    if (!contacts || contacts.length === 0) {
      console.log('❌ No contacts found in demo/sales');
      console.log('\n💡 You may need to seed data first:');
      console.log('   pnpm seed:demo\n');
      return;
    }

    console.log(`✅ Found ${contacts.length} contacts:\n`);
    console.log('═'.repeat(80));

    for (const contact of contacts) {
      console.log(`📇 ${contact.name || 'N/A'}`);
      console.log(`   ID: ${contact._id}`);
      console.log(`   Email: ${contact.email || 'N/A'}`);
      console.log(`   Status: ${contact.status || 'N/A'}`);
      console.log(`   Phone: ${contact.phone || 'N/A'}`);
      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('\n💡 Use any of these IDs to test the workflow:');
    console.log(
      `   JWT_TOKEN="${JWT_TOKEN}" pnpm tsx scripts/test-contact-update.ts ${contacts[0]._id}\n`
    );
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}

listContacts().catch(console.error);
