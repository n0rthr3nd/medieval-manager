module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/interfaces/*.ts',
    '!src/**/types/*.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '@utils/(.*)': '<rootDir>/src/utils/$1',
    '@models/(.*)': '<rootDir>/src/models/$1',
    '@config/(.*)': '<rootDir>/src/config/$1',
  },
  testTimeout: 30000,
};
