import * as yup from 'yup';

export const createTodoSchema = yup.object({
  name: yup
    .string()
    .required()
    .max(50)
    .trim(),
  description: yup
    .string()
    .required()
    .max(100)
    .trim(),
});
