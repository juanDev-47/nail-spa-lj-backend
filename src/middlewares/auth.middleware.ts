import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AuthUserPayload } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extrae y verifica el JWT del header `Authorization: Bearer <token>`,
 * y adjunta el payload resultante a `req.user`.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token no proporcionado" });
    return;
  }

  if (!JWT_SECRET) {
    res.status(500).json({ message: "JWT_SECRET no configurado en el servidor" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = { id: payload.id, correo: payload.correo, rol: payload.rol };
    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado" });
  }
}
