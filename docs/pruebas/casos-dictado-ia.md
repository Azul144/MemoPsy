# Casos de prueba: dictado por voz y estructuración con IA

Tarjeta #10 del tablero. Requerimientos RF 2.2 (dictado) y RF 2.3 (estructuración con IA), apartado 8.8.1 del TIF.
Datos ficticios de la demo. Pantallas: Informes → Registrar nota (`/informes/registrar`) y Editar nota (`/informes/editar/[id]`).

Perfil por defecto: **Psicólogo** (`psicologa@memopsy.test`, Carla Benítez). Navegador por defecto: Chrome o Edge.

Estado: ✅ pasa · ❌ falla · ⏳ pendiente

## Dictado por voz (RF 2.2)

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-01 | Dictado con permiso | Registrar nota → Dictar → permitir el micrófono → hablar dos o tres frases → Detener dictado | Mientras se habla aparece "Escuchando..." con el texto parcial; cada frase reconocida se agrega al campo Contenido | Al hablar se vio "Escuchando..." con el texto parcial y cada frase se agregó al campo Contenido (24/10, Chrome) | ✅ |
| CP-02 | Detener el dictado | Con el dictado en curso, tocar Detener dictado | El botón vuelve a "Dictar", el indicador desaparece y el texto queda en el campo, editable a mano | El botón volvió a "Dictar", el indicador desapareció y el texto quedó en el campo, editable | ✅ |
| CP-03 | Dictado en una nota existente | Editar una nota con contenido → Dictar → hablar | El texto dictado se agrega al contenido existente, sin borrarlo | El texto dictado se agregó al final del contenido existente, sin borrarlo | ✅ |
| CP-04 | Permiso de micrófono denegado | Bloquear el micrófono desde el candado de la barra → Dictar | Aviso: "No se dio permiso para usar el micrófono…"; el campo se puede escribir a mano | Con el micrófono bloqueado apareció el aviso de permiso y se pudo escribir a mano | ✅ |
| CP-05 | Sin micrófono | Desactivar el micrófono en Windows (Configuración → Privacidad → Micrófono) → Dictar | Aviso: "No se encontró ningún micrófono conectado…" | Con el micrófono desactivado en Windows apareció el aviso de que no hay micrófono | ✅ |
| CP-06 | Sin conexión | Apagar el Wi-Fi → Dictar → hablar | Si el navegador puede reconocer la voz en el equipo, el dictado funciona igual; si no llega ningún texto en 10 segundos, se corta y avisa "No llega el texto dictado. Revisá la conexión a internet o escribí a mano." | 1.ª prueba (24/10): se quedaba en "Escuchando..." sin texto ni aviso → falla, corregida en DictadoVoz.tsx (corte a los 10 s). 2.ª prueba: Chrome reconoció la voz sin internet y escribió el texto. 3.ª prueba, sin internet y en silencio: avisó "No se escuchó nada…", sin quedarse colgado | ✅ |
| CP-07 | Silencio | Dictar y no hablar durante unos segundos | Aviso: "No se escuchó nada…"; el botón vuelve a "Dictar" | Avisó "No se escuchó nada. Volvé a tocar Dictar y hablá cerca del micrófono." y el botón volvió a "Dictar" (24/10, probado sin internet) | ✅ |
| CP-08 | Navegador sin soporte | Abrir Registrar nota en Firefox | No aparece el botón Dictar; se muestra "Este navegador no permite dictar por voz…" y la nota se puede escribir y guardar | En Firefox no aparece el botón Dictar; se muestra el aviso de navegador sin soporte y la nota se puede escribir | ✅ |

## Estructuración con IA (RF 2.3)

| ID | Caso | Pasos | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| CP-09 | Aviso de privacidad | Abrir Registrar nota | Debajo de "Ordenar con IA" se ve el aviso de que el texto se envía a Anthropic y de evitar datos que identifiquen al paciente (Ley 25.326) | Se muestra el aviso completo debajo del botón (24/10, Lucía Ferreyra) | ✅ |
| CP-10 | Botón sin texto | Contenido vacío | "Ordenar con IA" está deshabilitado | Con el contenido vacío el botón aparece deshabilitado | ✅ |
| CP-11 | Propuesta de la IA | Escribir o dictar un texto sin puntuación con motivo, observaciones y plan → Ordenar con IA | Se muestra "Ordenando..." y luego "Tu texto" y "Propuesta de la IA" lado a lado, con los apartados Motivo de consulta, Observaciones y Plan; el campo Contenido no cambia todavía | "Ordenando..." y luego los dos textos lado a lado; la propuesta trae Motivo de consulta, Observaciones y Plan, con puntuación y tildes corregidas y sin datos nuevos; el contenido no cambió | ✅ |
| CP-12 | Aceptar la propuesta | En CP-11, tocar Usar esta versión → guardar la nota | El contenido se reemplaza por la propuesta, se puede seguir editando y la nota se guarda | El contenido se reemplazó por la propuesta y la nota "Prueba CP-12 dictado e IA" se guardó (asociada a Camila Ruiz) | ✅ |
| CP-13 | Descartar la propuesta | En CP-11, tocar Descartar | La propuesta desaparece y el contenido queda como estaba | La propuesta desapareció y el contenido quedó igual al original | ✅ |
| CP-14 | La IA no inventa | Texto que no menciona ningún plan | La propuesta no tiene apartado Plan y no agrega diagnósticos ni datos que no estén en el texto | Con un texto sin plan, la API devolvió `plan` vacío y el texto final omitió ese apartado; no agregó diagnósticos | ✅ |
| CP-15 | Texto demasiado largo | Pedir la propuesta con más de 20.000 caracteres | Aviso: "El texto supera los 20000 caracteres." (HTTP 400) | HTTP 400 "El texto supera los 20000 caracteres." (también 400 "Falta el texto a estructurar." con texto vacío) | ✅ |
| CP-16 | IA sin configurar | Comentar `ANTHROPIC_API_KEY` en `.env.local` y reiniciar → Registrar nota | Botón deshabilitado y aviso "La IA no está configurada en este servidor…"; el dictado sigue funcionando | Sin la clave, "Ordenar con IA" quedó deshabilitado con el aviso "La IA no está configurada en este servidor…", y el dictado siguió funcionando (24/10) | ✅ |
| CP-17 | Sin sesión | `POST /api/informes/estructurar` sin iniciar sesión | La API rechaza el pedido (401/redirección al login) y no llama a la IA | HTTP 401 `{"error":"No autenticado"}` en GET y POST | ✅ |
| CP-18 | Perfil sin permiso | `POST /api/informes/estructurar` como Recepcionista (`recepcion@memopsy.test`) y como Paciente | HTTP 403; la IA no se llama | Paciente (Camila Ruiz): HTTP 403 "No tenés permiso para realizar esta acción."; Recepcionista: no puede usar el registro de notas ni la IA (24/10) | ✅ |
| CP-19 | Auditoría | Después de CP-11, entrar como Auditor (`auditor@memopsy.test`) → Registro de auditoría | Hay un registro del módulo Informes, acción ESTRUCTURAR_IA, con el usuario y la fecha, sin el texto de la nota | En la tabla `auditoria` quedó un registro por cada propuesta, con email, fecha e IP, sin texto clínico; en la pantalla Registro de auditoría (filtro Informes) se listan los eventos. La acción se mostraba como "ESTRUCTURAR_IA" → se cambió a "Nota ordenada con IA" | ✅ |
