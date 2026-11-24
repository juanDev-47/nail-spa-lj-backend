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

## Confirmacion de citas por WhatsApp

Al reservar, la clienta autoriza la confirmacion y proporciona un celular colombiano. La API guarda la cita y la fecha de autorizacion, y envia la plantilla aprobada `confirmacion_citas_siemprelindaslj` (`es_CO`) mediante WhatsApp Cloud API v27.0. Las variables son nombre, servicio, fecha y hora de Bogota, en ese orden. Un celular de 10 digitos se envia con el prefijo `57`.

Configura `WHATSAPP_ACCESS_TOKEN` como secreto del servidor con permiso `whatsapp_business_messaging` y acceso al numero habilitado, y `WHATSAPP_IMAGE_URL` como URL HTTPS publica de la imagen del encabezado. La URL debe devolver el JPEG sin autenticacion. La plantilla debe estar aprobada y tener encabezado de imagen. Nunca pongas el token en el frontend ni lo compartas en el chat.

Para AWS, agrega el secreto `WHATSAPP_ACCESS_TOKEN` al repositorio de GitHub del backend; el despliegue usa la imagen publicada por el frontend en `/assets/LOGO_SPA.jpeg`. Publica el frontend con esa imagen antes de activar la integracion. Ejecuta las migraciones Prisma antes de desplegar el backend. En local, configura ambas variables en el entorno del backend.

La respuesta de creacion incluye `confirmacionWhatsapp`: `aceptada` significa que Meta acepto la solicitud, no que el mensaje se entrego; `no_confirmada` indica fallo o resultado incierto. En ese caso la cita sigue guardada, se informa a la clienta y se registra el identificador de la cita sin datos personales ni token. No hay reintentos automaticos ni webhooks de entrega: una interrupcion o tiempo de espera puede dejar el resultado incierto y debe revisarse antes de reenviar.

## Comandos

```powershell
npm install
npm run build
npm test
npm start
npm run create:admin
```

`npm start` inicia el servidor mediante `index.js`; `/health` proporciona un chequeo basico.