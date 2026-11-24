import { comoFechaBogota, horaBogota } from "../utils/date.util";

const PHONE_NUMBER_ID = "1302733656257756";
const TEMPLATE_NAME = "confirmacion_citas_siemprelindaslj";

export function telefonoColombiano(valor: unknown): string | null {
  if (typeof valor !== "string" || !/^\+?[\d\s()-]+$/.test(valor.trim())) return null;
  const numero = valor.replace(/[\s()-]/g, "");
  const nacional = numero.startsWith("+57") ? numero.slice(3) : numero.startsWith("57") ? numero.slice(2) : numero;
  return /^3\d{9}$/.test(nacional) ? `57${nacional}` : null;
}

export async function enviarConfirmacionWhatsapp(datos: {
  telefono: string;
  nombre: string;
  servicio: string;
  inicio: Date;
}): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const imagen = process.env.WHATSAPP_IMAGE_URL?.trim();
  if (!token || token === "NOT_CONFIGURED" || !imagen || !/^https:\/\//i.test(imagen)) {
    throw new Error("Falta configurar el token o la URL HTTPS de la imagen de WhatsApp");
  }

  const fecha = comoFechaBogota(datos.inicio).toISOString().slice(0, 10);
  const response = await fetch(`https://graph.facebook.com/v27.0/${PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(6000),
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: datos.telefono,
      type: "template",
      template: {
        name: TEMPLATE_NAME,
        language: { code: "es_CO" },
        components: [
          { type: "header", parameters: [{ type: "image", image: { link: imagen } }] },
          {
            type: "body",
            parameters: [datos.nombre, datos.servicio, fecha, horaBogota(datos.inicio)]
              .map((text) => ({ type: "text", text: text.replace(/\s+/g, " ").trim() })),
          },
        ],
      },
    }),
  });
  if (!response.ok) throw new Error(`Meta rechazó la solicitud (HTTP ${response.status})`);
  const resultado: unknown = await response.json();
  if (
    typeof resultado !== "object" || resultado === null ||
    !("messages" in resultado) || !Array.isArray(resultado.messages) ||
    typeof resultado.messages[0]?.id !== "string" || !resultado.messages[0].id
  ) {
    throw new Error("Meta no confirmó la aceptación de la solicitud");
  }
}
