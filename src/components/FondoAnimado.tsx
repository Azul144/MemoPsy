// src/components/FondoAnimado.tsx
// Manchas de luz (dorada, verde y salvia) que se mueven muy despacio detrás del contenido.
// Se coloca dentro de un contenedor con "relative" y "overflow-hidden".
export default function FondoAnimado({ intensidad = "normal" }: { intensidad?: "suave" | "normal" }) {
  const opacidad = intensidad === "suave" ? "opacity-60" : "opacity-100";
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${opacidad}`}>
      <div className="mancha absolute -top-32 right-[-10%] h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-3xl" />
      <div
        className="mancha absolute bottom-[-20%] left-[-10%] h-[30rem] w-[30rem] rounded-full bg-[var(--luz-fondo)] blur-3xl"
        style={{ animationDelay: "-8s", animationDuration: "26s" }}
      />
      <div
        className="mancha absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-salvia/10 blur-3xl"
        style={{ animationDelay: "-15s", animationDuration: "30s" }}
      />
    </div>
  );
}
