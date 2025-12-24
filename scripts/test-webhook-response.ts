/**
 * Test script to check webhook response format
 */

async function testWebhook() {
  const webhookUrl = 'https://automation.neting.it/webhook/2a0f4907-80e3-4216-ae7b-279b1dbc8c59';

  console.log('\n🔍 Testing webhook response...\n');
  console.log(`URL: ${webhookUrl}`);

  const testEmail = 'test@example.com';
  console.log(`Test email: ${testEmail}\n`);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail }),
    });

    console.log(`✅ Response status: ${response.status} ${response.statusText}`);

    const responseData = await response.json();

    console.log('\n📦 Response data:');
    console.log(JSON.stringify(responseData, null, 2));

    console.log('\n🔍 Data type check:');
    console.log(`- Type: ${typeof responseData}`);
    console.log(`- Is object: ${typeof responseData === 'object' && responseData !== null}`);
    console.log(`- Is array: ${Array.isArray(responseData)}`);

    if (typeof responseData === 'string') {
      console.log('\n⚠️  WARNING: Response is a STRING, not an object!');
      console.log('Attempting to parse...');
      try {
        const parsed = JSON.parse(responseData);
        console.log('✅ Parsed successfully:');
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('❌ Failed to parse as JSON');
      }
    }
  } catch (error) {
    console.log(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

testWebhook().catch(console.error);
