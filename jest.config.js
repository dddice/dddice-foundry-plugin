/**
 * @format
 * @type {import('ts-jest/dist/types').InitialOptionsTsJest}
 */

module.exports = {
  clearMocks: true,
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { resources: 'usable' },
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'],
  //setupFiles: [<rootDir>/tests/Jest/mocks/jest.setup.ts'],
  transformIgnorePatterns: [
    '<rootDir>/node_modules/(?!three|react-dnd-touch-backend|react-colorful|@owlbear-rodeo/sdk)',
  ],
  testMatch: ['<rootDir>/tests/*.spec.ts*'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: '<rootDir>tests/results', outputName: 'jest.xml' }],
  ],
};
