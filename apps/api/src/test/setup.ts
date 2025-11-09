// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/crm_atlas_test';
  process.env.TYPESENSE_HOST = 'localhost';
  process.env.TYPESENSE_PORT = '8108';
  process.env.TYPESENSE_API_KEY = 'xyz';
  process.env.QDRANT_URL = 'http://localhost:6333';
});

afterAll(() => {
  // Cleanup if needed
});
