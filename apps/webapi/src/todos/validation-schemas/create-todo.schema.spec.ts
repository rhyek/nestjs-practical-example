import { createTodoSchema } from './create-todo.schema';

describe('Create Todo Schema', () => {
  it('requires [name] property', async () => {
    const data = {
      description: 'description',
    };
    await expect(createTodoSchema.validate(data)).rejects.toThrow();
  });
  it('requires [description] property', async () => {
    const data = {
      name: 'name',
    };
    await expect(createTodoSchema.validate(data)).rejects.toThrow();
  });
  it('succeeds with a valid payload', async () => {
    const data = {
      name: 'name',
      description: 'description',
    };
    await expect(createTodoSchema.validate(data)).resolves.not.toThrow();
  });
});
