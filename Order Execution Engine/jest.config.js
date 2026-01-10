const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: "node",
  moduleNameMapper: {
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@infra/(.*)$': '<rootDir>/src/infra/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@dex/(.*)$': '<rootDir>/src/dex/$1',
  },
  transform: {
    ...tsJestTransformCfg,
  },
};