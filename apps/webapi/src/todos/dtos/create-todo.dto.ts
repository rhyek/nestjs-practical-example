import * as yup from 'yup';
import { createTodoSchema } from '../validation-schemas/create-todo.schema';

export type CreateTodoDto = yup.InferType<typeof createTodoSchema>;
