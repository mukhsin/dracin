/**
 * Global test setup for Bun test runner
 * This file is preloaded before all tests as configured in bunfig.toml
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Global test configuration
export const TEST_CONFIG = {
  // Test timeouts
  timeout: 10000,
  
  // Mock data defaults
  mockDate: new Date('2024-01-01T00:00:00Z'),
  
  // Test fixtures
  fixtures: {
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
    drama: {
      id: 'test-drama-456',
      title: 'Test Drama',
      slug: 'test-drama',
      description: 'A test drama for testing',
      status: 'ongoing' as const,
    },
  },
};

// Console suppression for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

/**
 * Suppress console output during tests
 */
export function suppressConsole(): void {
  console.log = () => {};
  console.info = () => {};
}

/**
 * Restore console output
 */
export function restoreConsole(): void {
  console.log = originalConsoleLog;
  console.info = originalConsoleInfo;
}

// Global beforeAll hook (runs once before all tests)
if (typeof beforeAll !== 'undefined') {
  beforeAll(() => {
    // Any global setup can go here
  });
}

// Global afterAll hook (runs once after all tests)
if (typeof afterAll !== 'undefined') {
  afterAll(() => {
    // Any global cleanup can go here
    restoreConsole();
  });
}

// Log that setup is complete
console.log('Test setup loaded');
