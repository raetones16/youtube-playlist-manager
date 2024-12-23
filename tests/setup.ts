import { jest, afterEach } from '@jest/globals';

// Define the shape of our mocked Chrome API
type ChromeMock = {
  runtime: {
    sendMessage: jest.Mock;
    onMessage: {
      addListener: jest.Mock;
    };
  };
  storage: {
    local: {
      get: jest.Mock;
      set: jest.Mock;
    };
  };
  identity: {
    getAuthToken: jest.Mock;
    removeCachedAuthToken: jest.Mock;
  };
};

// Create the mock
const mockChrome: ChromeMock = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn()
  }
};

// Only mock the APIs we need, cast the rest as unknown
(global as any).chrome = mockChrome;

// Export for test usage
export const chrome = mockChrome;