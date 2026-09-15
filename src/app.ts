import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import citaRoutes from "./routes/cita.routes";

const app: Express = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN;
app.use(cors({
  origin: (origin, callback) => {
    const esOrigenLocal = !!origin && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    callback(null, !origin || origin === frontendOrigin || esOrigenLocal);
  },
}));
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/citas", citaRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Recurso no encontrado" });
});

// Handler de errores centralizado: cualquier `next(err)` de los controladores cae aquí.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
});

export default app;
