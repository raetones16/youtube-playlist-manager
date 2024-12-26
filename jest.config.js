module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/tests'],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1'
    },
    // Make sure your setup.ts is loaded before tests so the mock environment is ready
    setupFiles: ['<rootDir>/tests/setup.ts'],
    testMatch: [
      '**/tests/**/*.+(spec|test).+(ts|tsx|js)',
      '**/?(*.)+(spec|test).+(ts|tsx|js)'
    ],
    transform: {
      '^.+\\.(ts|tsx)$': ['ts-jest', {
        tsconfig: 'tsconfig.json'
      }]
    }
  };
  