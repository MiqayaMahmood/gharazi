module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@Gharazi/shared-config$': '<rootDir>/packages/shared-config/src',
    '^@Gharazi/shared-events$': '<rootDir>/packages/shared-events/src',
    '^@Gharazi/shared-types$': '<rootDir>/packages/shared-types/src',
    '^@Gharazi/shared-utils$': '<rootDir>/packages/shared-utils/src'
  },
  collectCoverageFrom: ['apps/**/*.ts', 'packages/**/*.ts'],
  testEnvironment: 'node',
};
