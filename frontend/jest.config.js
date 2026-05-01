module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testRegex: '.spec.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '@angular/core': '<rootDir>/jest.mock.angular.ts',
    '@angular/common/http': '<rootDir>/jest.mock.angular.ts',
    '@angular/router': '<rootDir>/jest.mock.angular.ts',
    '^../../environments/environment$': '<rootDir>/jest.mock.environment.ts',
    '@models/(.*)': '<rootDir>/src/app/models/$1',
    '@services/(.*)': '<rootDir>/src/app/services/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!@angular|rxjs)',
  ],
};
