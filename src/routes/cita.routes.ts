import { Router } from "express";
import { catalogoReserva, crearCita, disponibilidad } from "../controllers/cita.controller";

const router = Router();

// Público: clientes registrados o anónimos agendan desde la landing page.
router.get("/catalogo", catalogoReserva);
router.get("/disponibilidad", disponibilidad);
router.post("/", crearCita);

export default router;
