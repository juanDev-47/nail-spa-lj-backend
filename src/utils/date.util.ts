const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Acepta únicamente cadenas ISO 8601 en UTC (con sufijo "Z"); rechaza offsets locales. */
export function esFechaIsoUtc(valor: unknown): valor is string {
  return typeof valor === "string" && ISO_UTC_REGEX.test(valor) && !Number.isNaN(new Date(valor).getTime());
}

/** Parsea una cadena ya validada con `esFechaIsoUtc`. */
export function parsearFechaIsoUtc(valor: string): Date {
  return new Date(valor);
}

/** Serializa explícitamente a ISO 8601 UTC para las respuestas de la API. */
export function aIsoUtc(fecha: Date): string {
  return fecha.toISOString();
}

/** Colombia no usa horario de verano: agenda local (UTC-5) a instante UTC. */
export function fechaBogotaAUtc(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00.000-05:00`);
}

/** Reinterpreta un instante UTC como fecha/hora de la agenda de Bogotá. */
export function comoFechaBogota(fecha: Date): Date {
  return new Date(fecha.getTime() - BOGOTA_OFFSET_MS);
}

export function horaBogota(fecha: Date): string {
  return comoFechaBogota(fecha).toISOString().slice(11, 16);
}

export function minutosBogota(fecha: Date): number {
  const local = comoFechaBogota(fecha);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}
