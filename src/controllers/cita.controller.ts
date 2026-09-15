import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { user_role } from "@prisma/client";
import prisma from "../config/prisma";
import { CrearCitaBody } from "../types/cita.types";
import { aIsoUtc, comoFechaBogota, esFechaIsoUtc, fechaBogotaAUtc, horaBogota, minutosBogota, parsearFechaIsoUtc } from "../utils/date.util";

const MINUTOS_EN_MS = 60_000;
const INTERVALO_RESERVA_MINUTOS = 20;
const INICIO_ALMUERZO_MINUTOS = 13 * 60;
const FIN_ALMUERZO_MINUTOS = 13 * 60 + 30;

function seCruzaConAlmuerzo(inicio: Date, fin: Date): boolean {
  const inicioMinutos = minutosBogota(inicio);
  const finMinutos = minutosBogota(fin);
  return inicioMinutos < FIN_ALMUERZO_MINUTOS && finMinutos > INICIO_ALMUERZO_MINUTOS;
}

export async function catalogoReserva(_req: Request, res: Response): Promise<void> {
  const [servicios, trabajadores] = await Promise.all([
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({
      where: { rol: user_role.TRABAJADOR },
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  res.json({
    servicios: servicios.map((servicio) => ({
      id: servicio.id,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      duracionMinutos: servicio.duracion_minutos,
      precio: Number(servicio.precio),
    })),
    trabajadores,
  });
}

export async function disponibilidad(req: Request, res: Response): Promise<void> {
  const servicioId = Number(req.query.servicioId);
  const trabajadorId = typeof req.query.trabajadorId === "string" ? req.query.trabajadorId : "";
  const fecha = typeof req.query.fecha === "string" ? req.query.fecha : "";
  if (!Number.isInteger(servicioId) || !trabajadorId || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    res.status(400).json({ message: "servicioId, trabajadorId y fecha (YYYY-MM-DD) son obligatorios" });
    return;
  }

  const [servicio, trabajador] = await Promise.all([
    prisma.servicio.findFirst({ where: { id: servicioId, activo: true } }),
    prisma.usuario.findFirst({ where: { id: trabajadorId, rol: user_role.TRABAJADOR } }),
  ]);
  if (!servicio || !trabajador) {
    res.status(404).json({ message: "Servicio o trabajador no disponible" });
    return;
  }

  const inicioDia = fechaBogotaAUtc(fecha, "00:00");
  const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000 - 1);
  const hoy = comoFechaBogota(new Date()).toISOString().slice(0, 10);
  if (Number.isNaN(inicioDia.getTime()) || inicioDia < fechaBogotaAUtc(hoy, "00:00")) {
    res.status(400).json({ message: "La fecha debe ser valida y no puede estar en el pasado" });
    return;
  }

  const fechaLocal = new Date(`${fecha}T00:00:00.000Z`);
  const disponibilidadLaboral = await prisma.disponibilidadTrabajador.findUnique({
    where: { trabajador_id_dia_semana: { trabajador_id: trabajadorId, dia_semana: fechaLocal.getUTCDay() } },
  });
  if (!disponibilidadLaboral) {
    res.json({ fecha, horarios: [] });
    return;
  }

  const citas = await prisma.cita.findMany({
    where: {
      trabajador_id: trabajadorId,
      estado: { not: "CANCELADA" },
      fecha_hora_inicio: { lte: finDia },
      fecha_hora_fin: { gt: inicioDia },
    },
    select: { fecha_hora_inicio: true, fecha_hora_fin: true },
  });
  const inicioLaboral = fechaBogotaAUtc(fecha, disponibilidadLaboral.hora_inicio.toISOString().slice(11, 16)).getTime();
  const finLaboral = fechaBogotaAUtc(fecha, disponibilidadLaboral.hora_fin.toISOString().slice(11, 16)).getTime();
  const horarios: string[] = [];

  for (let timestamp = inicioLaboral; timestamp + servicio.duracion_minutos * MINUTOS_EN_MS <= finLaboral; timestamp += INTERVALO_RESERVA_MINUTOS * MINUTOS_EN_MS) {
    const inicio = new Date(timestamp);
    const fin = new Date(timestamp + servicio.duracion_minutos * MINUTOS_EN_MS);
    if (!seCruzaConAlmuerzo(inicio, fin) && !citas.some((cita) => inicio < cita.fecha_hora_fin && fin > cita.fecha_hora_inicio)) {
      horarios.push(horaBogota(inicio));
    }
  }
  res.json({ fecha, horarios });
}

function validarBody(body: Partial<CrearCitaBody>): string | null {
  if (typeof body.servicioId !== "number" || Number.isNaN(body.servicioId)) {
    return "servicioId es obligatorio y debe ser numérico";
  }

  if (!body.trabajadorId) {
    return "trabajadorId es obligatorio";
  }

  if (!esFechaIsoUtc(body.fechaHoraInicio)) {
    return "fechaHoraInicio es obligatoria y debe ser ISO 8601 en UTC (ej: 2026-09-20T15:30:00.000Z)";
  }

  if (!body.clienteId && !body.clienteNombreAnonimo) {
    return "Debe indicarse clienteId o, para clientes anónimos, clienteNombreAnonimo";
  }

  return null;
}

/** Verifica que el rango [inicio, fin) caiga dentro del bloque laboral del día correspondiente. */
async function estaDentroDeHorarioLaboral(
  trabajadorId: string,
  inicio: Date,
  fin: Date,
): Promise<boolean> {
  const inicioLocal = comoFechaBogota(inicio);
  const finLocal = comoFechaBogota(fin);
  const diaSemana = inicioLocal.getUTCDay();

  const disponibilidad = await prisma.disponibilidadTrabajador.findUnique({
    where: { trabajador_id_dia_semana: { trabajador_id: trabajadorId, dia_semana: diaSemana } },
  });

  if (!disponibilidad) {
    return false;
  }

  const mismoDia =
    inicioLocal.getUTCFullYear() === finLocal.getUTCFullYear() &&
    inicioLocal.getUTCMonth() === finLocal.getUTCMonth() &&
    inicioLocal.getUTCDate() === finLocal.getUTCDate();

  const minutosInicioCita = minutosBogota(inicio);
  const minutosFinCita = minutosBogota(fin);
  const minutosInicioLaboral = disponibilidad.hora_inicio.getUTCHours() * 60 + disponibilidad.hora_inicio.getUTCMinutes();
  const minutosFinLaboral = disponibilidad.hora_fin.getUTCHours() * 60 + disponibilidad.hora_fin.getUTCMinutes();

  return (
    mismoDia &&
    minutosInicioCita >= minutosInicioLaboral &&
    minutosFinCita <= minutosFinLaboral
  );
}

/** Réplica exacta de la consulta OVERLAPS de la sección 5 del SPEC. */
async function existeSolapamiento(trabajadorId: string, inicio: Date, fin: Date): Promise<boolean> {
  const resultado = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM citas
    WHERE trabajador_id = ${trabajadorId}::uuid
      AND estado != 'CANCELADA'
      AND (fecha_hora_inicio, fecha_hora_fin) OVERLAPS (${inicio}, ${fin})
  `;

  return Number(resultado[0]?.count ?? 0) > 0;
}

export async function crearCita(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<CrearCitaBody>;

  const errorValidacion = validarBody(body);
  if (errorValidacion) {
    res.status(400).json({ message: errorValidacion });
    return;
  }

  const { servicioId, trabajadorId, fechaHoraInicio: fechaHoraInicioRaw } = body as CrearCitaBody;
  const fechaHoraInicio = parsearFechaIsoUtc(fechaHoraInicioRaw);

  const servicio = await prisma.servicio.findUnique({ where: { id: servicioId } });

  if (!servicio || !servicio.activo) {
    res.status(404).json({ message: "El servicio indicado no existe o no está activo" });
    return;
  }

  const trabajador = await prisma.usuario.findUnique({ where: { id: trabajadorId } });

  if (!trabajador || trabajador.rol !== user_role.TRABAJADOR) {
    res.status(404).json({ message: "El trabajador indicado no existe" });
    return;
  }

  const fechaHoraFin = new Date(fechaHoraInicio.getTime() + servicio.duracion_minutos * MINUTOS_EN_MS);

  if (seCruzaConAlmuerzo(fechaHoraInicio, fechaHoraFin)) {
    res.status(400).json({
      message: "El horario solicitado se cruza con el descanso de almuerzo de 13:00 a 13:30",
    });
    return;
  }

  const dentroDeHorario = await estaDentroDeHorarioLaboral(trabajadorId, fechaHoraInicio, fechaHoraFin);
  if (!dentroDeHorario) {
    res.status(400).json({
      message: "El horario solicitado está fuera de la disponibilidad laboral del trabajador",
    });
    return;
  }

  const haySolapamiento = await existeSolapamiento(trabajadorId, fechaHoraInicio, fechaHoraFin);
  if (haySolapamiento) {
    res.status(400).json({
      message: "El trabajador ya tiene una cita asignada que se cruza con ese horario",
    });
    return;
  }

  let clienteId = body.clienteId;
  if (!clienteId) {
    const correo = body.clienteCorreoAnonimo?.trim().toLowerCase();
    const nombre = body.clienteNombreAnonimo?.trim();
    if (!correo || !nombre) {
      res.status(400).json({ message: "Nombre y correo del cliente son obligatorios" });
      return;
    }
    const existente = await prisma.usuario.findUnique({ where: { correo } });
    if (existente && existente.rol !== user_role.CLIENTE) {
      res.status(409).json({ message: "El correo indicado pertenece a una cuenta interna" });
      return;
    }
    const cliente = existente ?? await prisma.usuario.create({
      data: {
        nombre,
        correo,
        telefono: body.clienteTelefonoAnonimo?.trim() || null,
        password_hash: await bcrypt.hash(randomUUID(), 10),
        rol: user_role.CLIENTE,
      },
    });
    clienteId = cliente.id;
  }

  const cita = await prisma.cita.create({
    data: {
      trabajador_id: trabajadorId,
      servicio_id: servicioId,
      fecha_hora_inicio: fechaHoraInicio,
      fecha_hora_fin: fechaHoraFin,
      notas: body.notas,
      cliente_id: clienteId,
      cliente_nombre_anonimo: body.clienteNombreAnonimo,
      cliente_telefono_anonimo: body.clienteTelefonoAnonimo,
      cliente_correo_anonimo: body.clienteCorreoAnonimo,
    },
  });

  // Serialización explícita: nunca depender del formato por defecto de Date en JSON.
  res.status(201).json({
    ...cita,
    fecha_hora_inicio: aIsoUtc(cita.fecha_hora_inicio),
    fecha_hora_fin: aIsoUtc(cita.fecha_hora_fin),
    fecha_creacion: aIsoUtc(cita.fecha_creacion),
  });
}
