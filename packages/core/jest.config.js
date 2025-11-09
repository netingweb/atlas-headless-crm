module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/**/*.d.ts'],
  coverageDirectory: '<rootDir>/coverage',
  moduleNameMapper: {
    '^@crm-atlas/(.*)$': '<rootDir>/../../packages/$1/src',
  },
};
