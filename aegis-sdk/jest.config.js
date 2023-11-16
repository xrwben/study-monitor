module.exports = {
  preset: 'ts-jest',
  globals: {
    DEV: true,
    JSDOM: true,
    VERSION: 1,
    FLOG_VERSION: 2,
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'lcov', 'text'],
  collectCoverageFrom: ['packages/*/src/**/*.ts'],
  watchPathIgnorePatterns: ['/node_modules/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  moduleNameMapper: {
    '^@tencent/aegis-(.*?)$': '<rootDir>/packages/$1/src',
    'aegis-core': '<rootDir>/packages/core/src',
  },
  rootDir: __dirname,
  testMatch: ['<rootDir>/packages/**/__tests__/**/*spec.[jt]s?(x)'],
};
