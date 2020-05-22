import * as yup from 'yup';
import { SchemaValidationPipe } from './schema-validation.pipe';
import { BadRequestException } from '@nestjs/common';

describe('Schema validation pipe', () => {
  const testSchema = yup.object({
    propA: yup
      .string()
      .required()
      .trim(),
  });
  const validationPipe = new SchemaValidationPipe(testSchema);

  it('should be defined', () => {
    expect(validationPipe).toBeDefined();
  });
  it('should throw BadRequestException with an invalid payload', async () => {
    const payload = {
      ad: 'sd',
    };
    await expect(validationPipe.transform(payload)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('should succeed with a valid payload', async () => {
    const payload = {
      propA: 'ad',
    };
    await expect(validationPipe.transform(payload)).resolves.toEqual(payload);
  });
  it('should throw BadRequestException with a valid payload that has extra properties', async () => {
    const payload = {
      propA: 'value',
      propB: 'value',
    };
    await expect(validationPipe.transform(payload)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
