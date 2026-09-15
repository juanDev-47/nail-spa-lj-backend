# Especificación Técnica del Sistema (SDD) - Spa de Uñas App
**Stack Tecnológico:** Angular (Frontend) | Node.js + Express + TypeScript (Backend) | PostgreSQL (Base de Datos)

## 1. Visión General del Sistema
Este sistema es una aplicación web responsiva (Mobile-First) para la gestión y reserva de citas en un Spa de Uñas. Cuenta con una Landing Page pública para clientes y un panel administrativo protegido para la gestión del negocio.

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
