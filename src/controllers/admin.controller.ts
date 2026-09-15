import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { appointment_status, user_role } from "@prisma/client";
import prisma from "../config/prisma";

const SALT_ROUNDS = 10;

export async function listarServicios(_req: Request, res: Response): Promise<void> {
  const servicios = await prisma.servicio.findMany({ orderBy: { nombre: "asc" } });
  res.json(servicios.map((servicio) => ({ ...servicio, precio: Number(servicio.precio) })));
}

export async function crearServicio(req: Request, res: Response): Promise<void> {
  const { nombre, descripcion, duracionMinutos, precio } = req.body as Record<string, unknown>;
  if (typeof nombre !== "string" || !nombre.trim() || !Number.isInteger(duracionMinutos) || (duracionMinutos as number) <= 0 || typeof precio !== "number" || precio < 0) {
    res.status(400).json({ message: "Nombre, duracionMinutos y precio valido son obligatorios" });
    return;
  }
  const servicio = await prisma.servicio.create({ data: { nombre: nombre.trim(), descripcion: typeof descripcion === "string" ? descripcion.trim() || null : null, duracion_minutos: duracionMinutos as number, precio } });
  res.status(201).json({ ...servicio, precio: Number(servicio.precio) });
}

export async function actualizarServicio(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  const { nombre, descripcion, duracionMinutos, precio, activo } = req.body as Record<string, unknown>;
  if (!Number.isInteger(id) || typeof nombre !== "string" || !nombre.trim() || !Number.isInteger(duracionMinutos) || (duracionMinutos as number) <= 0 || typeof precio !== "number" || precio < 0 || typeof activo !== "boolean") {
    res.status(400).json({ message: "Datos de servicio invalidos" });
    return;
  }
  try {
    const servicio = await prisma.servicio.update({ where: { id }, data: { nombre: nombre.trim(), descripcion: typeof descripcion === "string" ? descripcion.trim() || null : null, duracion_minutos: duracionMinutos as number, precio, activo } });
    res.json({ ...servicio, precio: Number(servicio.precio) });
  } catch {
    res.status(404).json({ message: "Servicio no encontrado" });
  }
}

export async function listarTrabajadores(_req: Request, res: Response): Promise<void> {
  const trabajadores = await prisma.usuario.findMany({
    where: { rol: user_role.TRABAJADOR },
    select: { id: true, nombre: true, correo: true, telefono: true, disponibilidad: { orderBy: { dia_semana: "asc" } } },
    orderBy: { nombre: "asc" },
  });
  res.json(trabajadores);
}

export async function crearTrabajador(req: Request, res: Response): Promise<void> {
  const { nombre, correo, password, telefono } = req.body as Record<string, unknown>;
  if (typeof nombre !== "string" || !nombre.trim() || typeof correo !== "string" || !correo.trim() || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ message: "Nombre, correo y una contrasena de al menos 8 caracteres son obligatorios" });
    return;
  }
  try {
    const trabajador = await prisma.usuario.create({
      data: { nombre: nombre.trim(), correo: correo.trim().toLowerCase(), password_hash: await bcrypt.hash(password, SALT_ROUNDS), telefono: typeof telefono === "string" ? telefono.trim() || null : null, rol: user_role.TRABAJADOR },
      select: { id: true, nombre: true, correo: true, telefono: true },
    });
    res.status(201).json(trabajador);
  } catch {
    res.status(409).json({ message: "Ya existe una cuenta con ese correo" });
  }
}

export async function guardarDisponibilidad(req: Request, res: Response): Promise<void> {
  const trabajadorId = Array.isArray(req.params.id) ? "" : req.params.id;
  const { horarios } = req.body as { horarios?: unknown };
  if (!trabajadorId || !Array.isArray(horarios) || horarios.some((horario) => !horario || typeof horario.diaSemana !== "number" || horario.diaSemana < 0 || horario.diaSemana > 6 || typeof horario.horaInicio !== "string" || typeof horario.horaFin !== "string" || horario.horaInicio >= horario.horaFin)) {
    res.status(400).json({ message: "La disponibilidad no tiene un formato valido" });
    return;
  }
  const trabajador = await prisma.usuario.findFirst({ where: { id: trabajadorId, rol: user_role.TRABAJADOR } });
  if (!trabajador) {
    res.status(404).json({ message: "Trabajador no encontrado" });
    return;
  }
  await prisma.$transaction([
    prisma.disponibilidadTrabajador.deleteMany({ where: { trabajador_id: trabajadorId } }),
    prisma.disponibilidadTrabajador.createMany({ data: horarios.map((horario) => ({ trabajador_id: trabajadorId, dia_semana: horario.diaSemana, hora_inicio: new Date(`1970-01-01T${horario.horaInicio}:00.000Z`), hora_fin: new Date(`1970-01-01T${horario.horaFin}:00.000Z`) })) }),
  ]);
  res.status(204).end();
}

export async function actualizarTrabajador(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? "" : req.params.id;
  const { nombre, correo, password, telefono } = req.body as Record<string, unknown>;
  if (!id || typeof nombre !== "string" || !nombre.trim() || typeof correo !== "string" || !correo.trim() || (password !== undefined && (typeof password !== "string" || password.length < 8))) {
    res.status(400).json({ message: "Nombre y correo son obligatorios; la contrasena debe tener al menos 8 caracteres" });
    return;
  }
  try {
    const trabajador = await prisma.usuario.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        correo: correo.trim().toLowerCase(),
        telefono: typeof telefono === "string" ? telefono.trim() || null : null,
        ...(typeof password === "string" && password ? { password_hash: await bcrypt.hash(password, SALT_ROUNDS) } : {}),
      },
      select: { id: true, nombre: true, correo: true, telefono: true },
    });
    res.json(trabajador);
  } catch {
    res.status(409).json({ message: "No se pudo actualizar: verifica que el correo no este en uso" });
  }
}

export async function listarCitas(_req: Request, res: Response): Promise<void> {
  const citas = await prisma.cita.findMany({
    include: {
      servicio: { select: { nombre: true } },
      trabajador: { select: { nombre: true } },
    },
    orderBy: { fecha_hora_inicio: "desc" },
  });
  res.json(citas.map((cita) => ({
    id: cita.id,
    clienteNombre: cita.cliente_nombre_anonimo ?? "Cliente registrado",
    clienteTelefono: cita.cliente_telefono_anonimo,
    servicio: cita.servicio.nombre,
    trabajadora: cita.trabajador.nombre,
    inicio: cita.fecha_hora_inicio.toISOString(),
    fin: cita.fecha_hora_fin.toISOString(),
    estado: cita.estado,
  })));
}

export async function actualizarEstadoCita(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? "" : req.params.id;
  const { estado } = req.body as { estado?: unknown };
  if (!id || (estado !== appointment_status.COMPLETADA && estado !== appointment_status.CANCELADA)) {
    res.status(400).json({ message: "Solo se puede cambiar una cita a COMPLETADA o CANCELADA" });
    return;
  }

  const cita = await prisma.cita.findUnique({ where: { id } });
  if (!cita) {
    res.status(404).json({ message: "Cita no encontrada" });
    return;
  }
  if (cita.estado !== appointment_status.PENDIENTE) {
    res.status(409).json({ message: "Solo las citas pendientes pueden cambiar de estado" });
    return;
  }

  await prisma.cita.update({ where: { id }, data: { estado } });
  res.json({ id, estado });
}

export async function listarClientes(_req: Request, res: Response): Promise<void> {
  const clientes = await prisma.usuario.findMany({
    where: { rol: user_role.CLIENTE },
    select: { id: true, nombre: true, correo: true, telefono: true, fecha_nacimiento: true },
    orderBy: { nombre: "asc" },
  });
  res.json(clientes.map((cliente) => ({ ...cliente, fechaNacimiento: cliente.fecha_nacimiento?.toISOString().slice(0, 10) ?? null })));
}

export async function actualizarCliente(req: Request, res: Response): Promise<void> {
  const id = Array.isArray(req.params.id) ? "" : req.params.id;
  const { nombre, correo, telefono, fechaNacimiento } = req.body as Record<string, unknown>;
  if (!id || typeof nombre !== "string" || !nombre.trim() || typeof correo !== "string" || !correo.trim() || (fechaNacimiento !== null && fechaNacimiento !== undefined && (typeof fechaNacimiento !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)))) {
    res.status(400).json({ message: "Nombre y correo son obligatorios; el cumpleanos debe ser una fecha valida" });
    return;
  }
  try {
    const cliente = await prisma.usuario.update({
      where: { id },
      data: { nombre: nombre.trim(), correo: correo.trim().toLowerCase(), telefono: typeof telefono === "string" ? telefono.trim() || null : null, fecha_nacimiento: typeof fechaNacimiento === "string" && fechaNacimiento ? new Date(`${fechaNacimiento}T00:00:00.000Z`) : null },
      select: { id: true, nombre: true, correo: true, telefono: true, fecha_nacimiento: true },
    });
    res.json({ ...cliente, fechaNacimiento: cliente.fecha_nacimiento?.toISOString().slice(0, 10) ?? null });
  } catch {
    res.status(409).json({ message: "No se pudo actualizar: verifica que el correo no este en uso" });
  }
}