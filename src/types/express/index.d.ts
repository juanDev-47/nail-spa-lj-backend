import { AuthUserPayload } from "../auth.types";

// Amplía el tipo Request de Express para transportar el usuario autenticado.
declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

export {};
