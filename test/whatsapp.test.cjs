const { test } = require("node:test");
const assert = require("node:assert/strict");
const { enviarConfirmacionWhatsapp, telefonoColombiano } = require("../src/services/whatsapp.service.ts");

function configurarEntorno(t) {
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
}

test("normaliza celulares colombianos y rechaza entradas invalidas", () => {
  for (const numero of ["3045462351", "+57 304 546 2351", "573045462351"]) {
    assert.equal(telefonoColombiano(numero), "573045462351");
  }
  for (const numero of ["+1 3045462351", "304546235", "abc3045462351", "+5730454623519"]) {
    assert.equal(telefonoColombiano(numero), null);
  }
});

test("envia la plantilla con imagen y parametros en orden, usando hora de Bogota", async (t) => {
  configurarEntorno(t);
  let request;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ messages: [{ id: "wamid.test" }] }), { status: 200 });
  });
  await enviarConfirmacionWhatsapp({
    telefono: "573001234567",
    nombre: "Ana Maria",
    servicio: "Manicure",
    inicio: new Date("2026-12-01T04:30:00Z"),
  });
  assert.equal(request.url, "https://graph.facebook.com/v27.0/1302733656257756/messages");
  assert.equal(request.options.headers.Authorization, "Bearer test-token");
  const body = JSON.parse(request.options.body);
  assert.equal(body.to, "573001234567");
  assert.equal(body.template.name, "confirmacion_citas_siemprelindaslj");
  assert.equal(body.template.language.code, "es_CO");
  assert.deepEqual(body.template.components[0], {
    type: "header", parameters: [{ type: "image", image: { link: "https://example.test/logo.jpeg" } }],
  });
  assert.deepEqual(body.template.components[1].parameters.map((item) => item.text),
    ["Ana Maria", "Manicure", "2026-11-30", "23:30"]);
});

test("reporta fallos de Meta y respuestas sin aceptacion", async (t) => {
  configurarEntorno(t);
  const datos = { telefono: "573001234567", nombre: "Ana", servicio: "Manicure", inicio: new Date() };
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response("", { status: 401 }));
  await assert.rejects(enviarConfirmacionWhatsapp(datos), /HTTP 401/);
  fetchMock.mock.mockImplementation(async () => new Response("{}", { status: 200 }));
  await assert.rejects(enviarConfirmacionWhatsapp(datos), /no confirmó/);
});
