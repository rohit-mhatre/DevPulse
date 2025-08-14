/**
 * Mock for better-sqlite3 database used in tests
 */

interface MockStatement {
  run: jest.Mock;
  get: jest.Mock;
  all: jest.Mock;
  prepare: jest.Mock;
}

interface MockDatabase {
  exec: jest.Mock;
  prepare: jest.Mock;
  close: jest.Mock;
  statements: Map<string, MockStatement>;
}

const createMockStatement = (): MockStatement => ({
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  prepare: jest.fn()
});

const createMockDatabase = (): MockDatabase => {
  const statements = new Map<string, MockStatement>();
  
  return {
    statements,
    exec: jest.fn(),
    close: jest.fn(),
    prepare: jest.fn((sql: string) => {
      if (!statements.has(sql)) {
        statements.set(sql, createMockStatement());
      }
      return statements.get(sql);
    })
  };
};

// Default mock database instance
const mockDb = createMockDatabase();

// Mock constructor
const Database = jest.fn().mockImplementation((path: string) => {
  console.log(`Mock database created for path: ${path}`);
  return mockDb;
});

// Helper functions for tests
Database.mockClear = () => {
  mockDb.statements.clear();
  jest.clearAllMocks();
};

Database.mockStatement = (sql: string, implementation: Partial<MockStatement>) => {
  const statement = createMockStatement();
  Object.assign(statement, implementation);
  mockDb.statements.set(sql, statement);
  return statement;
};

Database.mockDatabase = mockDb;

export default Database;