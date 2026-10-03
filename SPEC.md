# Especificación Técnica del Sistema (SDD) - Spa de Uñas App
**Stack Tecnológico:** Angular (Frontend) | Node.js + Express + TypeScript (Backend) | PostgreSQL (Base de Datos)

## 1. Visión General del Sistema
Este sistema es una aplicación web responsiva (Mobile-First) para la gestión y reserva de citas en un Spa de Uñas. Cuenta con una Landing Page pública para clientes y un panel administrativo protegido para la gestión del negocio.

# Especificacion tecnica actual - LJ Nail Spa

Este documento describe el comportamiento que existe en el repositorio, y distingue explicitamente las pantallas aun no conectadas. Para el recorrido general y el inventario completo de endpoints consulta [README.md](../README.md).

## 1. Estado y alcance

El workspace se compone de una aplicacion Angular, una API Node.js/Express con TypeScript y una base PostgreSQL gestionada mediante Prisma. La API ofrece reserva publica, registro/login y operaciones administrativas. Las vistas Angular ya existen, pero `src/ui/app/app.routes.ts` esta vacio: ninguna URL del frontend esta registrada y `adminGuard` aun no protege rutas.

## 2. Roles, autenticacion y autorizacion

- `CLIENTE`: puede registrarse y reservar publicamente. El flujo de reserva tambien puede crear o asociar una cuenta de cliente a partir de los datos enviados.
- `TRABAJADOR`: puede autenticarse en `POST /api/auth/login` y recibe un JWT, pero actualmente no tiene permisos en `/api/admin` ni una vista de panel habilitada.
- `ADMIN`: unico rol autorizado en todas las rutas `/api/admin`. El backend valida JWT Bearer y rol mediante `authMiddleware` y `checkRole(['ADMIN'])`.

El JWT contiene `id`, `correo` y `rol`; su expiracion predeterminada es `8h` y requiere `JWT_SECRET`. Las contrasenas se almacenan con hash bcrypt. El registro publico siempre crea rol `CLIENTE`; la cuenta administradora inicial se crea mediante el script `npm run create:admin`.

## 3. Frontend Angular

La aplicacion usa Angular standalone, Router, HttpClient y formularios reactivos. La organizacion actual separa `ui` (componentes), `infraestructure` (servicios HTTP/sesion) y `domain` (capa disponible para logica de dominio). Tailwind CSS esta instalado.

### Rutas de interfaz esperadas, no registradas

Los enlaces de las vistas indican las siguientes URLs objetivo. No deben considerarse accesibles hasta agregar las rutas a `src/ui/app/app.routes.ts`.

| URL esperada | Componente existente | Funcion |
| --- | --- | --- |
| `/` | Ninguno | Pagina publica/inicio; solo hay enlaces que apuntan a esta URL. |
| `/reservar` | `BookingComponent` | Seleccion de servicio, trabajadora, fecha y horario; captura de contacto y confirmacion. |
| `/admin/login` | `LoginComponent` | Inicio de sesion y persistencia local de la sesion si el rol es `ADMIN`. |
| `/admin/dashboard` | `DashboardComponent` | CRUD parcial de servicios, alta/edicion de trabajadoras y disponibilidad semanal. |
| `/admin/reservas` | `AppointmentsComponent` | Consulta de reservas y cambio de estado permitido. |
| `/admin/clientes` | `CustomersComponent` | Consulta y edicion de clientes registrados. |

`adminGuard` comprueba `SessionService.isAdmin()` y redirige al login, pero todavia no esta conectado al router. No hay lazy loading configurado. Los servicios Angular llaman a `http://localhost:3000`.

## 4. API y reglas

El servidor registra `/health`, `/api/auth`, `/api/admin` y `/api/citas`. Los metodos, parametros y respuestas principales estan enumerados en [README.md](../README.md#api-http-implementada).

Reglas de reserva implementadas:

1. El catalogo publica servicios activos y cuentas con rol `TRABAJADOR`.
2. La disponibilidad exige `servicioId`, `trabajadorId` y fecha `YYYY-MM-DD`; solo ofrece intervalos de inicio cada 20 minutos que quepan en el horario de trabajo y en la duracion del servicio.
3. Las fechas pasadas, horarios fuera de disponibilidad, solapamientos y citas que crucen el almuerzo 13:00-13:30 hora de Bogota se rechazan.
4. `fecha_hora_fin` se deriva de la duracion configurada del servicio. La cita comienza en estado `PENDIENTE`; estados finales permitidos por el endpoint administrativo: `COMPLETADA` o `CANCELADA`, solo desde pendiente.
5. Se usa el intervalo semiabierto para el cruce de citas y PostgreSQL `OVERLAPS` al crear, ignorando citas canceladas.
6. La agenda local usa hora de Bogota (UTC-5). `fechaHoraInicio` enviada al crear cita debe ser ISO 8601 UTC con sufijo `Z`; las respuestas incluyen timestamps UTC.

La confirmacion de la reserva es una respuesta de API, no se envia correo ni se describe aqui un servicio de notificaciones.

## 5. Persistencia de datos

La fuente de verdad es `nail-spa-lj-backend/prisma/schema.prisma` y sus migraciones en `nail-spa-lj-backend/prisma/migrations`; no se debe inicializar la base con el antiguo SQL de este SPEC. El datasource es PostgreSQL.

| Modelo Prisma | Tabla | Datos y relaciones principales |
| --- | --- | --- |
| `Usuario` | `usuarios` | UUID, nombre, correo unico, hash de contrasena, telefono opcional, fecha de nacimiento opcional, rol y fecha de creacion. Se relaciona con disponibilidad, citas como cliente y citas como trabajadora. |
| `Servicio` | `servicios` | ID incremental, nombre, descripcion, duracion en minutos, precio decimal, activo. |
| `DisponibilidadTrabajador` | `disponibilidad_trabajadores` | Trabajadora, dia de semana (0 domingo-6 sabado), hora inicio/fin; unicidad por trabajadora y dia. |
| `Cita` | `citas` | Cliente registrado opcional, datos de contacto capturados, trabajadora, servicio, inicio/fin con zona horaria, estado, notas y fecha de creacion. Indice por trabajadora e intervalo. |

Enums: `user_role` = `CLIENTE`, `TRABAJADOR`, `ADMIN`; `appointment_status` = `PENDIENTE`, `CONFIRMADA`, `COMPLETADA`, `CANCELADA`. El modelo admite `CONFIRMADA`, pero el flujo actual crea citas pendientes y no implementa confirmacion.

## 6. Configuracion operativa

Variables del backend: `DATABASE_URL` (conexion de aplicacion), `DIRECT_URL` (migraciones Prisma), `JWT_SECRET` (obligatoria para JWT), `JWT_EXPIRES_IN` (opcional, valor `8h`), `PORT` (opcional, valor `3000`), `FRONTEND_ORIGIN` (origen adicional permitido por CORS). Para `npm run create:admin`: `ADMIN_NOMBRE`, `ADMIN_CORREO`, `ADMIN_PASSWORD`.

Scripts actuales: frontend `npm start`, `npm run build`, `npm test`; backend `npm start`, `npm run build`, `npm run typecheck`, `npm run create:admin`. El script de prueba del backend aun no esta implementado.

## 7. Diferencias frente al diseno previo

- No hay landing page de inicio implementada/registrada ni rutas Angular activas.
- No existe flujo de reserva con seleccion explicita de servicio en `/` y luego `/reservar` separado en pagina; el componente de reserva contiene el recorrido por pasos.
- El acceso administrativo actual es exclusivo de `ADMIN`, no de `TRABAJADOR`.
- No hay CRUD de usuarios general, bloqueo manual de horarios, calendario por trabajador ni funcionalidad de “no asistio”.
- Las citas pueden tener estado `CONFIRMADA` en el enum, pero no existe una operacion que lo asigne.
- El esquema vigente agrega fecha de nacimiento a usuarios y las migraciones, no un SQL estatico, definen la evolucion de la base.
## 2. Arquitectura de Roles y Permisos (RBAC)
El sistema implementa Control de Acceso Basado en Roles (RBAC) mediante un middleware de autenticación en Node.js que valida tokens JWT con la estructura `id`, `email`, y `role`.

*   **CLIENTE:**
    *   Visualiza la landing page con servicios.
    *   Agenda citas interactivas según disponibilidad.
*   **TRABAJADOR:**
    *   Acceso al panel administrativo con permisos de lectura para ver su propio calendario de citas.
    *   Puede cambiar el estado de sus citas asignadas (ej. "Completada", "No asistió").
*   **ADMIN:**
    *   Acceso total al panel administrativo.
    *   Gestión de Usuarios (CRUD de trabajadores) y CRUD de Servicios.
    *   Bloqueo de horarios / gestión global del calendario.

## 3. Arquitectura Frontend (Angular)
El frontend debe estructurarse siguiendo las mejores prácticas de Angular, basado en clean architecture (domain, infraestructure, UI), utilizando componentes modulares y diseño responsivo con Tailwind CSS o Angular Material.

### Estructura de Rutas y Guards:
*   `/` (Público): Landing Page y catálogo de servicios.
*   `/reservar` (Público): Flujo secuencial de reserva por pasos (Stepper).
*   `/admin/login` (Público): Formulario de acceso para empleados.
*   `/admin/dashboard` (Privado): Protegido por un `AuthGuard` y `RoleGuard`. Carga de forma perezosa (Lazy Loading).

### El Módulo de Reserva (Flujo por Pasos):
*   **Paso 1:** Selección de Servicio mediante tarjetas responsivas.
*   **Paso 2:** Calendario interactivo. Al seleccionar un día, se realiza una petición HTTP al backend para traer los bloques de horas disponibles basados en el servicio y la manicurista.
*   **Paso 3:** Formulario reactivo (`FormBuilder`) para capturar Nombre, Teléfono y Correo del cliente.
*   **Paso 4:** Pantalla de éxito con el resumen de la cita.

---

## 4. Esquema de Base de Datos (PostgreSQL)
Usa este script SQL exacto para inicializar la base de datos en PostgreSQL:

```sql
-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('CLIENTE', 'TRABAJADOR', 'ADMIN');
CREATE TYPE appointment_status AS ENUM ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA');

-- 1. Tabla de Usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    rol user_role DEFAULT 'CLIENTE',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Servicios
CREATE TABLE servicios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    duracion_minutos INT NOT NULL, -- Ej: 45, 60, 90
    precio DECIMAL(10, 2) NOT NULL,
    activo BOOLEAN DEFAULT TRUE
);

-- 3. Tabla de Disponibilidad Laboral
CREATE TABLE disponibilidad_trabajadores (
    id SERIAL PRIMARY KEY,
    trabajador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0 (Domingo) a 6 (Sábado)
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    UNIQUE(trabajador_id, dia_semana)
);

-- 4. Tabla de Citas
CREATE TABLE citas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    cliente_nombre_anonimo VARCHAR(100),
    cliente_telefono_anonimo VARCHAR(20),
    cliente_correo_anonimo VARCHAR(100),
    trabajador_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    servicio_id INT REFERENCES servicios(id) ON DELETE RESTRICT,
    fecha_hora_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_hora_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    estado appointment_status DEFAULT 'PENDIENTE',
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas de disponibilidad
CREATE INDEX idx_citas_rango ON citas (trabajador_id, fecha_hora_inicio, fecha_hora_fin);
```

---

## 5. Lógica de Negocio y Reglas Críticas (Para Node.js)
El backend en Node.js/TypeScript debe implementar las siguientes validaciones rigurosas:

1.  **Prevención de Solapamiento (Overbooking):** Antes de insertar una cita en la base de datos, se debe validar que el trabajador no tenga otra cita asignada en ese rango. La consulta SQL de validación debe verificar:
    ```sql
    SELECT COUNT(*) FROM citas 
    WHERE trabajador_id = \$1 
      AND estado != 'CANCELADA'
      AND (fecha_hora_inicio, fecha_hora_fin) OVERLAPS (\$2, \$3);
    ```
2.  **Cálculo de Finalización:** El backend debe consultar los `duracion_minutos` del servicio en la BD y calcular automáticamente la `fecha_hora_fin` sumando ese intervalo a la `fecha_hora_inicio` recibida.
3.  **Seguridad y Middleware RBAC:** Crear un middleware `checkRole(['ADMIN', 'TRABAJADOR'])` que intercepte las rutas de `/api/admin`. El CRUD de servicios y empleados debe estar restringido exclusivamente a `ADMIN`.
