/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // First match wins, so the stylesheet stub must precede the aliases or an aliased
    // `@/…/x.module.css` import resolves to the real file and Jest tries to parse CSS as JS.
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^d3$': '<rootDir>/node_modules/d3/dist/d3.min.js',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/features/(.*)$': '<rootDir>/src/features/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'CommonJS',
          moduleResolution: 'Node',
          jsx: 'react-jsx',
          isolatedModules: true,
        },
      },
    ],
  },
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/main.tsx'],
};
