// Test environment setup - must be imported first in all test files
process.env.DATABASE_URL = "file::memory:";
process.env.NODE_ENV = "test";
process.env.API_PROXY_URL = "http://localhost:3002";
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.BETTER_AUTH_SECRET = "test-secret-key";
process.env.ADMIN_AUTH_SECRET = "test-admin-secret";
