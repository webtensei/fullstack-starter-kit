import { z } from 'zod';

export const LoginDtoSchema = z.object({
  username: z.string({ message: 'Необходимо ввести имя пользователя' }).min(1),
  password: z.string({ message: 'Необходимо ввести пароль' }).min(1),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;
