const WHATSAPP_TOKEN = import.meta.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = import.meta.env.WHATSAPP_PHONE_NUMBER_ID;
const API_VERSION = "v21.0";

interface TemplateParameter {
  type: "text";
  text: string;
}

interface TemplateComponent {
  type: "body" | "header" | "button";
  parameters?: TemplateParameter[];
  sub_type?: string;
  index?: number;
}

export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components: TemplateComponent[]
) {
  const response = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      }),
    }
  );
  return response.json();
}

export async function sendBookingConfirmation(
  to: string,
  customerName: string,
  shopName: string,
  date: string,
  time: string
) {
  return sendTemplate(to, "booking_confirmation", "en", [
    {
      type: "body",
      parameters: [
        { type: "text", text: customerName },
        { type: "text", text: shopName },
        { type: "text", text: date },
        { type: "text", text: time },
      ],
    },
  ]);
}

export async function sendBookingReminder(
  to: string,
  customerName: string,
  shopName: string,
  date: string,
  time: string
) {
  return sendTemplate(to, "booking_reminder", "en", [
    {
      type: "body",
      parameters: [
        { type: "text", text: customerName },
        { type: "text", text: shopName },
        { type: "text", text: date },
        { type: "text", text: time },
      ],
    },
  ]);
}

export async function sendCancellationNotice(
  to: string,
  customerName: string,
  shopName: string,
  date: string,
  time: string,
  reason: string
) {
  return sendTemplate(to, "booking_cancelled", "en", [
    {
      type: "body",
      parameters: [
        { type: "text", text: customerName },
        { type: "text", text: shopName },
        { type: "text", text: date },
        { type: "text", text: time },
        { type: "text", text: reason },
      ],
    },
  ]);
}
