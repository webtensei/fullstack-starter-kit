import { z } from 'zod';

export const RegisterDtoSchema = z.object({
  username: z
    .string({ message: 'Необходимо ввести имя пользователя' })
    .min(1, { message: 'Имя пользователя не может быть пустым' }),
  password: z
    .string({ message: 'Необходимо ввести пароль' })
    .min(1, { message: 'Пароль не может быть пустым' }),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
