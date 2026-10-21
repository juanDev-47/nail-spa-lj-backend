-- Los clientes se registran sin correo; el administrador lo completa despues.
ALTER TABLE "usuarios" ALTER COLUMN "correo" DROP NOT NULL;
