// Historias clínicas de demostración (datos FICTICIOS), coherentes con las notas y los turnos de
// cargar-demo.mjs. Las usan cargar-demo.mjs (base nueva) y cargar-historias-demo.mjs (base ya cargada).
// Cada historia se asigna al psicólogo con el que el paciente tiene turnos, con fecha de admisión
// en su primer turno. Si ya tiene historia con ese psicólogo, no se toca.

export const HISTORIAS_DEMO = [
  {
    // Adulta: ansiedad e insomnio por estrés laboral (psicología clínica)
    dni: "40123456",
    estadoCivil: "Soltera, en pareja desde hace dos años",
    ocupacion: "Analista contable en un estudio privado",
    escolaridad: "Universitario completo (Contadora Pública)",
    convivencia: "Vive sola; su pareja se queda algunos días de la semana",
    contactoEmergencia: "Marta Ruiz (madre) · 370 4512345",
    derivadoPor: "Consulta espontánea, por recomendación de una compañera de trabajo",
    motivoConsulta:
      '"Vivo pensando en el trabajo, no puedo dormir y me cuesta frenar la cabeza." Consulta por ansiedad y dificultad para dormir desde hace unos tres meses.',
    historiaProblema:
      "Los síntomas comienzan hace tres meses, cuando el estudio incorpora clientes nuevos y le asignan el cierre de balances con plazos ajustados. Refiere preocupación constante por los vencimientos, tensión muscular, irritabilidad y dificultad para conciliar el sueño (tarda más de una hora en dormirse), con despertares a la madrugada pensando en pendientes. Los síntomas empeoran los domingos a la noche y mejoran en vacaciones. Intentó tomar té de tilo y usar el celular para distraerse antes de dormir, sin mejoría. No hubo ausencias laborales.",
    antecedentesPersonales:
      "Sin enfermedades clínicas de relevancia. No toma medicación. Consumo de café elevado (cuatro a cinco tazas diarias); alcohol social los fines de semana; niega otros consumos. Un tratamiento psicológico breve a los 19 años por ansiedad ante los exámenes, con buena evolución. Sin internaciones ni intentos de autolesión.",
    antecedentesFamiliares:
      "Padres separados desde sus 12 años; buen vínculo con ambos. Una hermana menor, estudiante. La madre tuvo un episodio de ansiedad tratado con psicoterapia. Sin otros antecedentes de salud mental en la familia.",
    examenMental:
      "Aspecto cuidado, acorde a la edad. Vigil, orientada en tiempo, espacio y persona. Atención y memoria conservadas. Pensamiento de curso acelerado por momentos, contenido centrado en preocupaciones laborales, sin ideas delirantes. Afecto ansioso, congruente con el discurso. Sin alteraciones de la sensopercepción. Juicio conservado, con buena conciencia de situación. Niega ideación de muerte o suicida: sin indicadores de riesgo.",
    evaluaciones:
      "Inventario de Ansiedad de Beck (BAI): 24 puntos, ansiedad moderada (primera entrevista). Índice de Calidad de Sueño de Pittsburgh (PSQI): 12 puntos, mala calidad de sueño. Registro semanal de situaciones de ansiedad.",
    impresionDiagnostica:
      "Cuadro compatible con trastorno de adaptación con predominio de ansiedad, reactivo a estrés laboral (CIE-10 F43.2), con insomnio de conciliación asociado. Se reevalúa a los tres meses.",
    planTratamiento:
      "Enfoque cognitivo-conductual. Frecuencia semanal, 50 minutos, presencial. Objetivos: 1) psicoeducación sobre ansiedad y estrés; 2) identificar y cuestionar pensamientos anticipatorios; 3) técnicas de respiración y relajación; 4) higiene del sueño y reducción de cafeína; 5) organización de tareas y límites con el horario laboral. Reevaluación con BAI y PSQI a las 12 sesiones.",
  },
  {
    // Niño: dificultades escolares y baja tolerancia a la frustración (infanto-juvenil)
    dni: "53444555",
    estadoCivil: "No corresponde (menor de edad)",
    ocupacion: "Alumno de 4.º grado",
    escolaridad: "Primario en curso, 4.º grado, Escuela N.º 12 (turno mañana)",
    convivencia: "Con su madre, su padre y una hermana de 5 años",
    contactoEmergencia: "Laura Gómez (madre, representante legal) · 370 4698765",
    derivadoPor: "Derivado por la escuela (docente de grado y equipo de orientación)",
    motivoConsulta:
      'La madre refiere: "Cada vez que tiene que hacer la tarea termina llorando o tirando las cosas." La escuela informa que no termina las actividades, se frustra ante los errores y tuvo dos peleas con compañeros este año.',
    historiaProblema:
      "Las dificultades se intensifican desde el comienzo de 4.º grado, con más tarea y una nueva docente. En casa presenta rabietas diarias a la hora de la tarea, que duran entre 20 y 40 minutos. En la escuela abandona las consignas cuando no le salen al primer intento y dice que es \"burro\". Los padres probaron sentarse con él y quitarle la tablet como penitencia, con resultados variables. No hubo cambios familiares importantes en el último año.",
    antecedentesPersonales:
      "Embarazo y parto sin complicaciones. Pautas madurativas dentro de lo esperable; habló a los 2 años. Jardín sin dificultades. Controles pediátricos al día; visión y audición evaluadas este año, normales. Sin medicación. Duerme bien, unas 10 horas. Sin tratamientos psicológicos previos.",
    antecedentesFamiliares:
      "Familia nuclear, padres casados, ambos trabajan (madre docente de nivel inicial, padre empleado de comercio). Buen vínculo entre los padres, que coinciden en la preocupación. El padre refiere que de chico \"le costaba la escuela\". Sin antecedentes de salud mental conocidos.",
    examenMental:
      "Niño de aspecto cuidado, acorde a la edad. Al principio inhibido; se vincula con facilidad a través del juego. Orientado. Atención sostenida durante unos 20 minutos en actividades de su interés, con mayor dispersión en tareas escolares. Lenguaje fluido y comprensible. Afecto ansioso ante situaciones de evaluación, con autocrítica marcada (\"no me sale nada\"). Tolera perder en el juego reglado al segundo intento. Sin indicadores de riesgo.",
    evaluaciones:
      "Hora de juego diagnóstica. Dibujo de la familia y test de la Persona bajo la lluvia. Entrevista con los padres y entrevista telefónica con la docente. Se solicita evaluación psicopedagógica para descartar dificultades específicas del aprendizaje.",
    impresionDiagnostica:
      "Dificultades en la regulación emocional ante la frustración, en el contexto de mayores exigencias escolares, con baja autoestima académica. Se descartan, a la espera de la evaluación psicopedagógica, dificultades específicas del aprendizaje. Sin diagnóstico formal por el momento.",
    planTratamiento:
      "Psicoterapia con abordaje lúdico y orientación a padres. Frecuencia semanal, 45 minutos, presencial; entrevista con los padres una vez por mes. Objetivos: 1) ampliar la tolerancia a la frustración a través del juego reglado; 2) fortalecer la autoestima y el reconocimiento del esfuerzo; 3) pautas a la familia: rutina fija para la tarea, pausas y elogio del esfuerzo; 4) articulación con la escuela y con la psicopedagoga.",
  },
  {
    // Adulto: duelo por ruptura de pareja (terapia cognitivo-conductual)
    dni: "38987654",
    estadoCivil: "Separado recientemente (convivió cinco años con su pareja)",
    ocupacion: "Técnico en mantenimiento en una empresa de servicios",
    escolaridad: "Secundario técnico completo",
    convivencia: "Vive solo desde hace dos meses",
    contactoEmergencia: "Martín Fernández (hermano) · 370 4223344",
    derivadoPor: "Derivado por su médico clínico, tras consultar por insomnio y cansancio",
    motivoConsulta:
      '"Desde que nos separamos no tengo ganas de nada, me encierro en casa." Consulta por tristeza y desgano a partir de la separación.',
    historiaProblema:
      "Hace dos meses terminó una relación de cinco años por decisión de su pareja. Desde entonces refiere tristeza la mayor parte del día, pérdida de interés por actividades que disfrutaba (fútbol con amigos, salir en bici), aislamiento y dificultad para dormir. Sigue yendo a trabajar, aunque con menos energía. Tiene pensamientos recurrentes sobre qué hizo mal en la relación. Bajó unos 3 kg por comer menos. No tuvo pensamientos de muerte.",
    antecedentesPersonales:
      "Sin enfermedades clínicas. No toma medicación; el médico clínico le indicó melatonina, que no empezó. Consumo de alcohol aumentado en el último mes (cerveza casi todas las noches). No fuma. Sin tratamientos psicológicos previos. A los 20 años vivió la muerte de su padre, que recuerda como \"muy dura\".",
    antecedentesFamiliares:
      "Padre fallecido por un infarto cuando él tenía 20 años. Madre viva, buen vínculo, vive en otra ciudad. Un hermano mayor con quien mantiene contacto frecuente. Sin antecedentes de salud mental conocidos.",
    examenMental:
      "Aspecto algo descuidado. Vigil, orientado. Atención y memoria conservadas. Pensamiento de curso enlentecido, con contenido centrado en la ruptura y autorreproches, sin ideas delirantes. Afecto aplanado, habla en voz baja. Sin alteraciones de la sensopercepción. Juicio conservado. Niega ideación de muerte o suicida; cuenta con red de apoyo (hermano y amigos). Riesgo actual bajo.",
    evaluaciones:
      "Inventario de Depresión de Beck (BDI-II): 22 puntos, depresión moderada (primera entrevista). Cuestionario AUDIT de consumo de alcohol: 9 puntos, consumo de riesgo.",
    impresionDiagnostica:
      "Duelo por ruptura de pareja con sintomatología depresiva moderada (CIE-10 F43.21, reacción depresiva prolongada, presuntivo), con aumento del consumo de alcohol a monitorear.",
    planTratamiento:
      "Terapia cognitivo-conductual, frecuencia semanal, 50 minutos, presencial. Objetivos: 1) activación conductual: retomar una actividad social y una física por semana; 2) trabajar los autorreproches y pensamientos rumiativos; 3) reducir el consumo de alcohol, con registro diario; 4) higiene del sueño; 5) elaborar el duelo y reforzar la red de apoyo. Seguimiento del riesgo en cada sesión. Reevaluación con BDI-II a las 8 sesiones.",
  },
]

// Inserta las historias que falten. "cifrar" es la misma función de cargar-demo.mjs.
export async function insertarHistoriasDemo(conexion, cifrar) {
  let cargadas = 0
  for (const h of HISTORIAS_DEMO) {
    const [[fila]] = await conexion.query(
      `SELECT pa.id AS pacienteId, s.psicologo_id AS psicologoId, DATE(MIN(s.fecha_hora_inicio)) AS admision
         FROM paciente pa
         JOIN persona pe ON pe.id = pa.persona_id
         JOIN paciente_tiene_sesion pts ON pts.paciente_id = pa.id
         JOIN sesion s ON s.id = pts.sesion_id
        WHERE pe.dni = ?
        GROUP BY pa.id, s.psicologo_id
        ORDER BY COUNT(*) DESC
        LIMIT 1`,
      [h.dni],
    )
    if (!fila) continue
    const [[existe]] = await conexion.query("SELECT id FROM historia_clinica WHERE paciente_id = ? AND psicologo_id = ?", [fila.pacienteId, fila.psicologoId])
    if (existe) continue

    const admision = fila.admision instanceof Date ? fila.admision.toISOString().slice(0, 10) : String(fila.admision).slice(0, 10)
    const textos = ["estadoCivil", "ocupacion", "escolaridad", "convivencia", "contactoEmergencia", "derivadoPor", "motivoConsulta",
      "historiaProblema", "antecedentesPersonales", "antecedentesFamiliares", "examenMental", "evaluaciones", "impresionDiagnostica", "planTratamiento"]
    const columnas = ["estado_civil", "ocupacion", "escolaridad", "convivencia", "contacto_emergencia", "derivado_por", "motivo_consulta",
      "historia_problema", "antecedentes_personales", "antecedentes_familiares", "examen_mental", "evaluaciones", "impresion_diagnostica", "plan_tratamiento"]
    await conexion.query(
      `INSERT INTO historia_clinica (paciente_id, psicologo_id, fecha_admision, ${columnas.join(", ")}, consentimiento_informado, fecha_consentimiento)
       VALUES (?, ?, ?, ${columnas.map(() => "?").join(", ")}, 1, ?)`,
      [fila.pacienteId, fila.psicologoId, admision, ...textos.map((t) => cifrar(h[t])), admision],
    )
    cargadas++
  }
  return cargadas
}
