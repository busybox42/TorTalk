module.exports = {
  // The root of your source code, typically /src
  roots: ['<rootDir>/src'],
  
  // Jest transformations -- this adds support for TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  
  // Test spec file resolution pattern
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Mock paths
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  
  // Test environment
  testEnvironment: 'jsdom',
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/reportWebVitals.ts',
  ],
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
}; 