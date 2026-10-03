# Backend API

API REST para reservas y administracion de LJ Nail Spa, implementada con Express, TypeScript y Prisma sobre PostgreSQL. Consulta [la documentacion general](../README.md) para el inventario completo de rutas, reglas funcionales y recorrido del sistema.

## Estructura

- `src/routes/`: endpoints de autenticacion, administracion y citas.
- `src/controllers/`: validaciones y casos de uso HTTP.
- `src/middlewares/`: validacion JWT y autorizacion por rol.
- `src/config/prisma.ts`: cliente Prisma/PostgreSQL.
- `src/utils/date.util.ts`: conversion entre UTC y hora de Bogota.
- `prisma/schema.prisma` y `prisma/migrations/`: esquema y evolucion de base.

## Configuracion

Variables requeridas: `DATABASE_URL`, `DIRECT_URL` y `JWT_SECRET`. Variables opcionales: `PORT` (por defecto `3000`), `JWT_EXPIRES_IN` (por defecto `8h`) y `FRONTEND_ORIGIN`. Para crear la cuenta inicial de administrador tambien se requieren `ADMIN_NOMBRE`, `ADMIN_CORREO` y `ADMIN_PASSWORD` (minimo 8 caracteres).

## Comandos

```powershell
npm install
npm run build
npm start
npm run create:admin
```

`npm start` inicia el servidor mediante `index.js`; `/health` proporciona un chequeo basico. El script `npm test` aun no esta configurado con pruebas.