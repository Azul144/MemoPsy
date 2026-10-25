// Franja de cifras debajo de la portada: lo que mostró el relevamiento con profesionales
const cifras = [
  { valor: "+20", texto: "profesionales consultados en Formosa" },
  { valor: "100%", texto: "registraba las sesiones en papel" },
  { valor: "0", texto: "usaba un sistema centralizado" },
  { valor: "75%", texto: "prefiere una plataforma web" },
];

export default function Cifras() {
  return (
    <section className="px-6 pb-20">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-10 rounded-[2rem] border border-foreground/10 bg-card/60 px-6 py-10 md:grid-cols-4 md:divide-x md:divide-foreground/10">
        {cifras.map((c) => (
          <div key={c.texto} className="px-4 text-center">
            <p className="titulo text-4xl text-dorado sm:text-5xl">{c.valor}</p>
            <p className="mx-auto mt-2 max-w-[12rem] text-sm leading-snug text-crema/75">{c.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
