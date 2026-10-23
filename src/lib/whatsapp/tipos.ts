// src/lib/whatsapp/tipos.ts
// Datos del recordatorio que se manda por WhatsApp. Cada proveedor (Meta o Twilio) los arma a su manera.
// Solo con quién, cuándo y la modalidad: nunca contenido clínico.

export interface RecordatorioWhatsapp {
  para: string; // celular en formato 5493704123456
  psicologo: string;
  inicio: Date;
  modalidad: string; // "presencial", "remota"
  enlace: string | null; // enlace de videollamada, si es virtual
}

export class WhatsappError extends Error {
  constructor(public status: number) {
    super(`WhatsApp respondió con estado ${status}`);
  }
  // 4xx: el pedido está mal o el número no puede recibir (no tiene sentido reintentar)
  get definitivo() {
    return this.status >= 400 && this.status < 500 && this.status !== 429;
  }
}
