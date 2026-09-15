import { NextFunction, Request, Response } from "express";
import { Rol } from "../types/auth.types";

/**
 * Middleware factory: exige que `req.user.rol` esté entre `rolesPermitidos`.
 * Debe usarse después de `authMiddleware`.
 */
export function checkRole(rolesPermitidos: Rol[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rol = req.user?.rol;

    if (!rol || !rolesPermitidos.includes(rol)) {
      res.status(403).json({ message: "No tienes permisos para acceder a este recurso" });
      return;
    }

    next();
  };
}
