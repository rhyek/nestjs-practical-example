export function dataAbstractionLayerMockFactory() {
  const todoRepositoryMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    persist: jest.fn(),
  };
  const entityManagerMock = {
    flush: jest.fn(),
    getRepository: jest.fn(() => todoRepositoryMock),
    getTransactionContext: jest.fn(),
    getConnection: jest.fn(() => ({
      execute: jest.fn(),
    })),
    transactional: jest.fn(async cb => {
      await cb(entityManagerMock);
    }),
  };
  return { todoRepositoryMock, entityManagerMock };
}
