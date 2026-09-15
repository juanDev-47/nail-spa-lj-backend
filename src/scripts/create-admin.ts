import "dotenv/config";
import bcrypt from "bcryptjs";
import { user_role } from "@prisma/client";
import prisma from "../config/prisma";

async function main(): Promise<void> {
  const nombre = process.env.ADMIN_NOMBRE;
  const correo = process.env.ADMIN_CORREO?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!nombre || !correo || !password || password.length < 8) {
    throw new Error("Define ADMIN_NOMBRE, ADMIN_CORREO y ADMIN_PASSWORD (minimo 8 caracteres) en el entorno");
  }

  const existente = await prisma.usuario.findUnique({ where: { correo } });
  if (existente) {
    throw new Error("Ya existe una cuenta con ese correo");
  }

  await prisma.usuario.create({
    data: {
      nombre,
      correo,
      password_hash: await bcrypt.hash(password, 10),
      rol: user_role.ADMIN,
    },
  });
  console.log(`Administrador creado: ${correo}`);
}

main().finally(() => prisma.$disconnect());