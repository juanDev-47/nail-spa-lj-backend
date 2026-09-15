import { user_role } from "@prisma/client";

export type Rol = user_role;

export interface AuthUserPayload {
  id: string;
  correo: string;
  rol: Rol;
}
