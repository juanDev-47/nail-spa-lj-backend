const { test } = require("node:test");
const assert = require("node:assert/strict");
const prisma = {
  servicio: { findUnique() {} },
  usuario: { findUnique() {}, findFirst() {} },
  disponibilidadTrabajador: { findUnique() {} },
  cita: { create() {} },
  $queryRaw() {},
};
const configPath = require.resolve("../src/config/prisma.ts");
require(configPath);
require.cache[configPath].exports = { __esModule: true, default: prisma };
const { crearCita } = require("../src/controllers/cita.controller.ts");

function respuesta() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("crea la cita antes de notificar y mantiene la reserva cuando falla Meta", async (t) => {
  const tokenAnterior = process.env.WHATSAPP_ACCESS_TOKEN;
  const imagenAnterior = process.env.WHATSAPP_IMAGE_URL;
  process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  process.env.WHATSAPP_IMAGE_URL = "https://example.test/logo.jpeg";
  t.after(() => {
    if (tokenAnterior === undefined) delete process.env.WHATSAPP_ACCESS_TOKEN;
    else process.env.WHATSAPP_ACCESS_TOKEN = tokenAnterior;
    if (imagenAnterior === undefined) delete process.env.WHATSAPP_IMAGE_URL;
    else process.env.WHATSAPP_IMAGE_URL = imagenAnterior;
  });
  t.mock.method(console, "error", () => {});
  t.mock.method(prisma.servicio, "findUnique", async () => ({ id: 1, activo: true, nombre: "Pedicure", duracion_minutos: 30 }));
  t.mock.method(prisma.usuario, "findUnique", async () => ({ rol: "TRABAJADOR" }));
  t.mock.method(prisma.disponibilidadTrabajador, "findUnique", async () => ({
    hora_inicio: new Date("1970-01-01T08:00:00Z"),
    hora_fin: new Date("1970-01-01T18:00:00Z"),
  }));
  t.mock.method(prisma, "$queryRaw", async () => [{ count: 0n }]);
  t.mock.method(prisma.usuario, "findFirst", async () => ({ id: "cliente-1" }));
  let guardada = false;
  t.mock.method(prisma.cita, "create", async ({ data }) => {
    guardada = true;
    assert.ok(data.consentimiento_whatsapp instanceof Date);
    return { id: "cita-1", fecha_hora_inicio: data.fecha_hora_inicio, fecha_hora_fin: data.fecha_hora_fin, fecha_creacion: new Date() };
  });
  let peticiones = 0;
  const fetchMock = t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(guardada, true);
    peticiones++;
    const body = JSON.parse(options.body);
    assert.equal(body.to, "573001234567");
    assert.deepEqual(body.template.components[1].parameters.map((item) => item.text),
      ["Ana", "Pedicure", "2026-12-01", "10:00"]);
    return new Response("", { status: 503 });
  });
  const body = {
    servicioId: 1, trabajadorId: "trabajadora-1", fechaHoraInicio: "2026-12-01T15:00:00.000Z",
    clienteNombreAnonimo: "Ana", clienteTelefonoAnonimo: "3001234567", consentimientoWhatsapp: true,
  };
  const res = respuesta();
  await crearCita({ body }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id, "cita-1");
  assert.equal(res.body.confirmacionWhatsapp, "no_confirmada");
  assert.equal(peticiones, 1);

  fetchMock.mock.mockImplementation(async () => {
    assert.equal(guardada, true);
    peticiones++;
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), { status: 200 });
  });
  guardada = false;
  const aceptada = respuesta();
  await crearCita({ body }, aceptada);
  assert.equal(aceptada.statusCode, 201);
  assert.equal(aceptada.body.confirmacionWhatsapp, "aceptada");
  assert.equal(peticiones, 2);

  const sinConsentimiento = respuesta();
  await crearCita({ body: { ...body, consentimientoWhatsapp: false } }, sinConsentimiento);
  assert.equal(sinConsentimiento.statusCode, 400);
  assert.equal(peticiones, 2);

  const telefonoInvalido = respuesta();
  await crearCita({ body: { ...body, clienteTelefonoAnonimo: "123" } }, telefonoInvalido);
  assert.equal(telefonoInvalido.statusCode, 400);
  assert.equal(peticiones, 2);

  prisma.cita.create.mock.mockImplementation(async () => { throw new Error("Error de base de datos"); });
  await assert.rejects(crearCita({ body }, respuesta()), /Error de base de datos/);
  assert.equal(peticiones, 2);
});
