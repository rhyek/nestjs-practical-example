import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { TodoCreateDTO } from './todo-create.dto';

describe('Create Todo Dto', () => {
  it('requires [name] property', async () => {
    const data = {
      description: 'description',
    };
    const dto = plainToClass(TodoCreateDTO, data);
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    const [error] = errors;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.property).toBe('name');
    expect(Object.keys(error.constraints!)).toContain('maxLength');
  });

  it('requires [description] property', async () => {
    const data = {
      name: 'name',
    };
    const dto = plainToClass(TodoCreateDTO, data);
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    const [error] = errors;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.property).toBe('description');
    expect(Object.keys(error.constraints!)).toContain('maxLength');
  });

  it('succeeds with a valid payload', async () => {
    const data = {
      name: 'name',
      description: 'description',
    };
    const dto = plainToClass(TodoCreateDTO, data);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('[name] property has a max length of 50', async () => {
    const data = {
      name: new Array(51).fill('a').join(''),
      description: 'description',
    };
    const dto = plainToClass(TodoCreateDTO, data);
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    const [error] = errors;
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.property).toBe('name');
    expect(Object.keys(error.constraints!)).toContain('maxLength');
  });
});
