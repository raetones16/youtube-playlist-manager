// tests/setup.ts

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
      sync: {                   // Add sync storage
          get: jest.Mock;
          set: jest.Mock;
          onChanged: {
              addListener: jest.Mock;
          };
      };
  };
    identity: {
        getAuthToken: jest.Mock;
        removeCachedAuthToken: jest.Mock;
    };
    tabs: {
        sendMessage: jest.Mock;
    };
    alarms: {
        create: jest.Mock;
        onAlarm: {
            addListener: jest.Mock;
            removeListener: jest.Mock;
        };
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
      },
      sync: {
          get: jest.fn(),
          set: jest.fn(),
          onChanged: {
              addListener: jest.fn()
          }
      }
  },
    identity: {
        getAuthToken: jest.fn(),
        removeCachedAuthToken: jest.fn()
    },
    tabs: {
        sendMessage: jest.fn()
    },
    alarms: {
        create: jest.fn(),
        onAlarm: {
            addListener: jest.fn(),
            removeListener: jest.fn()
        }
    }
};

// Only mock the APIs we need, cast the rest as unknown
(global as any).chrome = mockChrome;

// Add structuredClone polyfill if it doesn't exist
if (typeof structuredClone !== 'function') {
  (global as any).structuredClone = (obj: any) => {
      return JSON.parse(JSON.stringify(obj));
  };
}

// Export for test usage
export const chrome = mockChrome;