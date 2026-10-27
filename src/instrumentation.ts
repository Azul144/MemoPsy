// src/instrumentation.ts
// Next.js ejecuta register() una sola vez cuando arranca el servidor.
export async function register() {
  // Solo en el servidor Node (no en el runtime Edge del middleware). El import tiene que quedar
  // dentro de este if: así el build no mete crypto ni mysql en el paquete del runtime Edge.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { programarRecordatorios } = await import("./instrumentation-node");
    programarRecordatorios();
  }
}
