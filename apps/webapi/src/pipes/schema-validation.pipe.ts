import {
  ArgumentMetadata,
  Injectable,
  PipeTransform,
  BadRequestException,
} from '@nestjs/common';
import * as yup from 'yup';

@Injectable()
export class SchemaValidationPipe<T extends object> implements PipeTransform {
  constructor(private schema: yup.ObjectSchema<T>) {}

  async transform(value: any, metadata?: ArgumentMetadata) {
    try {
      const validatedAndTransformed = await this.schema
        .noUnknown()
        .strict(true)
        .validate(value);
      return validatedAndTransformed;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
