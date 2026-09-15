-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CLIENTE', 'TRABAJADOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "nombre" VARCHAR(100) NOT NULL,
    "correo" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(20),
    "rol" "user_role" NOT NULL DEFAULT 'CLIENTE',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "duracion_minutos" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disponibilidad_trabajadores" (
    "id" SERIAL NOT NULL,
    "trabajador_id" UUID NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_inicio" TIME NOT NULL,
    "hora_fin" TIME NOT NULL,

    CONSTRAINT "disponibilidad_trabajadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citas" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "cliente_id" UUID,
    "cliente_nombre_anonimo" VARCHAR(100),
    "cliente_telefono_anonimo" VARCHAR(20),
    "cliente_correo_anonimo" VARCHAR(100),
    "trabajador_id" UUID NOT NULL,
    "servicio_id" INTEGER NOT NULL,
    "fecha_hora_inicio" TIMESTAMPTZ NOT NULL,
    "fecha_hora_fin" TIMESTAMPTZ NOT NULL,
    "estado" "appointment_status" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidad_trabajadores_trabajador_id_dia_semana_key" ON "disponibilidad_trabajadores"("trabajador_id", "dia_semana");

-- CreateIndex
CREATE INDEX "idx_citas_rango" ON "citas"("trabajador_id", "fecha_hora_inicio", "fecha_hora_fin");

-- AddForeignKey
ALTER TABLE "disponibilidad_trabajadores" ADD CONSTRAINT "disponibilidad_trabajadores_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_trabajador_id_fkey" FOREIGN KEY ("trabajador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citas" ADD CONSTRAINT "citas_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "servicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
