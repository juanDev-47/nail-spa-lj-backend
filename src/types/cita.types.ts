export interface CrearCitaBody {
  servicioId: number;
  trabajadorId: string;
  /** ISO 8601 en UTC, ej: "2026-09-20T15:30:00.000Z" */
  fechaHoraInicio: string;
  clienteId?: string;
  clienteNombreAnonimo?: string;
  clienteTelefonoAnonimo?: string;
  clienteCorreoAnonimo?: string;
  notas?: string;
}
