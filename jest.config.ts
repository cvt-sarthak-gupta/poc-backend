import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.spec.ts', '**/*.spec.ts', '**/*.test.ts'],
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@infra/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@admin/(.*)$': '<rootDir>/src/admin/$1',
    '^@tenants/(.*)$': '<rootDir>/src/tenants/$1',
    '^@errors/(.*)$': '<rootDir>/src/errors/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/**/*.entity.ts',
    '!src/**/migrations/**',
    '!src/**/__tests__/**',
  ],
};

export default config;
