module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: {
    '^@crm-atlas/(.*)$': '<rootDir>/../../packages/$1/src',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/main.ts'],
  testSequencer: '<rootDir>/jest.test-sequencer.cjs',
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
};

