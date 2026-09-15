import { Router } from "express";
import { actualizarEstadoCita, actualizarServicio, actualizarTrabajador, crearServicio, crearTrabajador, guardarDisponibilidad, listarCitas, listarServicios, listarTrabajadores } from "../controllers/admin.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { checkRole } from "../middlewares/role.middleware";

const router = Router();
router.use(authMiddleware, checkRole(["ADMIN"]));
router.get("/servicios", listarServicios);
router.post("/servicios", crearServicio);
router.put("/servicios/:id", actualizarServicio);
router.get("/trabajadores", listarTrabajadores);
router.post("/trabajadores", crearTrabajador);
router.put("/trabajadores/:id", actualizarTrabajador);
router.put("/trabajadores/:id/disponibilidad", guardarDisponibilidad);
router.get("/citas", listarCitas);
router.put("/citas/:id/estado", actualizarEstadoCita);

export default router;