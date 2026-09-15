const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

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
