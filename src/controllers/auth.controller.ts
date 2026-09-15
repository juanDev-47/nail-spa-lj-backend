import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { user_role } from "@prisma/client";
import prisma from "../config/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "8h") as SignOptions["expiresIn"];
const SALT_ROUNDS = 10;

function firmarToken(usuario: { id: string; correo: string; rol: user_role }): string {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET no configurado en el servidor");
  }

  return jwt.sign(
    { id: usuario.id, correo: usuario.correo, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

/** Login para empleados (ADMIN / TRABAJADOR) del panel administrativo. */
export async function login(req: Request, res: Response): Promise<void> {
  const { correo, password } = req.body as { correo?: string; password?: string };

  if (!correo || !password) {
    res.status(400).json({ message: "Correo y contraseña son obligatorios" });
    return;
  }

  const usuario = await prisma.usuario.findUnique({ where: { correo } });

  // El acceso al panel administrativo está restringido a empleados.
  if (!usuario || usuario.rol === user_role.CLIENTE) {
    res.status(401).json({ message: "Credenciales inválidas" });
    return;
  }

  const passwordValida = await bcrypt.compare(password, usuario.password_hash);

  if (!passwordValida) {
    res.status(401).json({ message: "Credenciales inválidas" });
    return;
  }

  try {
    const token = firmarToken(usuario);
    res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
}

/** Registro inicial de un usuario (por defecto CLIENTE si no se especifica rol). */
export async function registro(req: Request, res: Response): Promise<void> {
  const { nombre, correo, password, telefono } = req.body as {
    nombre?: string;
    correo?: string;
    password?: string;
    telefono?: string;
  };

  if (!nombre || !correo || !password) {
    res.status(400).json({ message: "Nombre, correo y contraseña son obligatorios" });
    return;
  }

  const existente = await prisma.usuario.findUnique({ where: { correo } });

  if (existente) {
    res.status(409).json({ message: "Ya existe un usuario con ese correo" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      correo,
      password_hash: passwordHash,
      telefono,
      rol: user_role.CLIENTE,
    },
  });

  res.status(201).json({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
  });
}
