# SmartGuard — Antes de Abrir

SmartGuard permite revisar enlaces sospechosos manualmente desde la web y, en Android, analiza los enlaces visibles en notificaciones compatibles con autorización explícita. Un resultado sin señales no es garantía de seguridad.

**Actualización documental al 06-11-2026 (posterior al cierre):** el código de `main` incluye SmartGuard Family con Firebase, instrumentación de rendimiento Android y cambios nativos hasta 0.6.4. La descarga pública es el piloto Android **0.6.0** proporcionado por el equipo; una versión de código fuente y una APK distribuida no son la misma evidencia. Las pruebas en dispositivos y entre cuentas se registran por separado.

- **Fuente del producto:** https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir
- **Panel Firebase de administración:** https://smartguard-piloto-20261029.web.app/ (requiere permisos administrativos; no es el producto público).
- **Producto web público:** [Abrir SmartGuard](https://pmc-landing-page-antes-de-abrir.vercel.app/). No requiere acceso de Vercel para abrirlo ni cuenta para el análisis manual.
- **APK Alpha 0.2:** [Descargar SmartGuard Family 0.6.0](https://pmc-landing-page-antes-de-abrir.vercel.app/downloads/SmartGuard-Family-v0.6.0-Alpha.apk), Android 8.0 o posterior.
- **Calidad técnica de Entrega 4:** [Empezar por requisitos, Excel y resultados Android](docs/calidad-tecnica/ENTREGA-4-INICIO-AQUI.md). **Informe técnico integral del Excel v8:** [13 hojas, métricas, fórmulas, trazabilidad y alcance de la rúbrica](docs/calidad-tecnica/INFORME-INTEGRAL-EXCEL-V8-ENTREGA-4.md).
- **Guía de evaluación:** [Guion del monitor y evidencias de Entrega 4](docs/ENTREGA-4-GUIA-MONITOR.md).
- **Auditoría y matriz de entrega:** [docs/ENTREGA-4-SMARTGUARD-AUDITORIA.md](docs/ENTREGA-4-SMARTGUARD-AUDITORIA.md).
- **Descarga actual de la landing:** `public/downloads/SmartGuard-Family-v0.6.0-Alpha.apk`, proporcionado por el equipo (versión interna `0.6.0-piloto`, código 17; Android 8.0 o posterior; 22 MB). SHA-256: `9d2974d6b3429d426377e8391b1f23ee7608d4f482797a3cf533cd5a593620b3`. Se verificaron la estructura ZIP y los metadatos; queda pendiente probar instalación, compatibilidad de firma con la versión anterior y funcionalidad en un teléfono Android. El APK 0.5.4 se conserva como versión anterior.

## Stack actual

- Web: React, TypeScript, Vite, Tailwind CSS; hospedada en Vercel.
- Android: Capacitor 6 y Java; servicio nativo NotificationListenerService y motor de comprobación.
- Telemetría piloto 0.5.9: Firebase Auth anónima, Firestore y panel administrativo publicado en Firebase Hosting.
- Analizador web: reglas propias y funciones remotas `check-link` de Supabase. Production está configurado para el proyecto del equipo mediante variables de entorno; el código conserva un respaldo heredado de Enter si no se configuran.
- SmartGuard Family: ruta `/familia`, Firebase Authentication y Firestore para salas e historial compartido con consentimiento. La presencia del código no certifica las reglas desplegadas ni el recorrido entre teléfonos; consultar la guía de pruebas.

## Pruebas de calidad sin instalar una APK

    pnpm install --frozen-lockfile
    pnpm test
    pnpm exec tsc -p tsconfig.app.json --noEmit
    pnpm build:prod
    node scripts/qa/e4-preflight.mjs

El preflight es estático y **no certifica** funcionamiento con WhatsApp, consumo de batería, Android antiguos, uptime ni resultados de personas.

## Variables de entorno (nombres, nunca valores)

| Variable | Uso |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Proyecto Supabase del equipo para las comprobaciones remotas. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Inicio de sesión opcional en la web. Vacía oculta sus controles. |
| `VITE_SMARTGUARD_FAMILY_ENABLED` | Mostrar el acceso Family cuando su backend esté preparado. |
| `VITE_SMARTGUARD_STATUS_PAGE_URL` | Enlace HTTPS a la página pública de estado; opcional. |
| `VITE_SMARTGUARD_TELEMETRY_URL`, `VITE_SMARTGUARD_TELEMETRY_PUBLISHABLE_KEY` | Integración opcional heredada de telemetría Supabase, distinta de Firebase nativo. |
| `VITE_ENTER_ANALYTICS_ENABLED`, `VITE_ENTER_ANALYTICS_TOKEN`, `VITE_ENTER_PROJECT_ID`, `VITE_ENTER_ANALYTICS_ENDPOINT`, `VITE_ENTER_ANALYTICS_DEFINITIONS_ENDPOINT`, `VITE_ENTER_ANALYTICS_DEBUG` | Analítica heredada opcional; desactivada por defecto. |

Copiar `.env.example` y completar solo las integraciones necesarias. Los valores `VITE_` son públicos en el navegador: nunca incluir claves administrativas, contraseñas o tokens de sesión. Firebase Family utiliza configuración pública en `public/smartguard-family/config.json`; sus permisos se controlan con Authentication y reglas Firestore.

**Cuenta de prueba para monitores:** pendiente de creación por el equipo y de carga de datos de uso. El análisis web es público y puede probarse sin cuenta; esto no sustituye la prueba de registro e ingreso exigida por la rúbrica. Clerk (login de la cabecera) y Firebase (cuenta de anfitrión de Family) son sesiones distintas. La cuenta que se entregue debe indicar a cuál corresponde. Facilitar las credenciales al monitor por el canal de entrega acordado y dejar aquí solo el procedimiento, sin contraseñas. Ver [guion y aislamiento](docs/ENTREGA-4-GUIA-MONITOR.md).

---

## Origen y repositorio

Código exportado de Enter el 7 de octubre de 2026. El desarrollo continúa fuera de la sincronización Enter–GitHub.

Repositorio: https://github.com/Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir

## Desarrollo local

Requisitos: Node.js 22 y pnpm compatible con el lockfile incluido (formato 9).

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

La aplicación abre en http://localhost:8080. Las variables de analítica de Enter son opcionales; mantener desactivada la analítica si no se configura deliberadamente.

```sh
pnpm lint
pnpm exec tsc -p tsconfig.app.json --noEmit
pnpm exec tsc -p tsconfig.node.json --noEmit
pnpm build:prod
pnpm preview
```

`build` en el export usa modo desarrollo; usar `build:prod` para producción. El comando `check` original no comprueba por sí solo todas las referencias TypeScript, por eso se indican los proyectos explícitamente.

## Estructura

- `src/pages/home/`: landing page y formulario del analizador.
- `src/lib/link-analysis/`: reglas, señales y construcción del resultado.
- `src/pages/privacidad/` y `src/pages/contacto/`: páginas complementarias.
- `public/locales/es.json`: textos en español.
- `supabase/functions/check-link/`: comprobación del destino y redirecciones.
- `.enter/plans/`: documentación histórica del proyecto exportado.

## Backend y despliegues separados

Vercel publica el frontend desde `main`. Las funciones Supabase y las reglas Firestore se despliegan por separado; subir el código no las actualiza automáticamente. Configurar el proyecto del equipo mediante `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`; sin ellas se utiliza el respaldo de Enter. Sin respuesta remota, el resultado debe indicar comprobación incompleta, sin prometer seguridad.

El repositorio conserva herramientas y documentación históricas de Enter. La configuración pública de Firebase no concede permisos administrativos. No subir claves `service_role`, cuentas de servicio, keystores ni sesiones. Consultar [despliegue Supabase](docs/DEPLOY.md) y [Family Firebase](docs/SMARTGUARD-FAMILY-FIREBASE-V1.md).

## Colaboración

Trabajar en ramas, revisar los cambios mediante pull requests e invitar colaboradores desde GitHub con sus usuarios. No compartir cuentas ni credenciales. Conservar el lockfile y excluir `.env`, dependencias y archivos generados.

## Contexto para otros chats

Compartir este README, la documentación de `.enter/plans/`, el enlace del repositorio y un resumen de las decisiones. Los archivos del proyecto original de ChatGPT no se incorporan automáticamente al repositorio.

## Publicar en Vercel

Importar este repositorio desde Vercel, elegir Vite y usar `npm run build:prod` con salida `dist`. La configuración `vercel.json` permite abrir directamente `/contacto` y `/privacidad`. Mantener `VITE_ENTER_ANALYTICS_ENABLED=false` salvo configuración deliberada. La función Supabase se aloja por separado y no se despliega mediante este archivo.

## Observabilidad Android y reporte técnico integral

**[Resultados cuantitativos de calidad Android — Entrega 4](docs/calidad-tecnica/RESULTADOS-CONSOLIDADOS-ENTREGA-4.md).** Contiene cálculos contrastados con las 1.198 filas del paquete, fórmulas y explicación de equivalencias técnicas; la verificación de origen real se atribuye al equipo, sin suponer acceso externo a Firebase.

**[Calidad técnica · documentación y arquitectura](docs/calidad-tecnica/README.md).** El generador reproducible separa las 1.198 observaciones **simuladas** de cualquier telemetría real de dispositivos. La nueva sección `CALIDAD TÉCNICA Y RENDIMIENTO` del administrador usa Firebase Auth verificada; sus datos reales requieren reglas `daily_metrics` desplegadas y una APK firmada que los envíe. La simulación no acredita UptimeRobot ni PageSpeed.

## Calidad técnica web Alpha 0.2 (5 de noviembre de 2026)

**[Procedimiento de calidad y evidencia](docs/WEB-QUALITY-ALPHA02.md).** La entrega evalúa **la web pública**, no directamente el APK: UptimeRobot HTTP(s) cada 5 minutos, porcentaje real de los últimos 7 días >= 99%, PageSpeed móvil Performance >=70 y Accessibility >=80. Los números solo se registran después de medirlos en servicios externos; NO se infieren a partir de los tests.

- **Estado público:** https://stats.uptimerobot.com/vyppRM840A. Monitor creado el **05/11/2026**, con intervalo de **5 minutos**; no acredita siete días previos a su creación. En el footer se muestra el enlace `Estado del servicio` únicamente cuando Vercel recibe `VITE_SMARTGUARD_STATUS_PAGE_URL` con la dirección HTTPS publicada (no confundir con una API key).
- Para la auditoría web, crear la variable de GitHub Actions `SMARTGUARD_PUBLIC_URL` con la dirección verificada que abre en incógnito. La acción `SmartGuard web quality - PageSpeed mobile` permite pruebas manuales y periódicas; conserva archivos JSON de disponibilidad externa y PageSpeed en cada ejecución.
- Los scripts `scripts/qa/check-public-site.mjs` y `scripts/qa/pagespeed-mobile.mjs` son reproducibles con Node.js 22. Google PageSpeed puede requerir la clave opcional `PAGESPEED_API_KEY` en **GitHub Secret**, nunca en el frontend. Si la URL está protegida o Google no responde, reportan NO VERIFICADO, sin atribuir resultados inventados.
- Navegación web optimizada: rutas secundarias cargan bajo demanda, el SDK opcional de analítica no se descarga si está desactivado y los recursos versionados usan caché de larga duración.


## Android Performance Monitoring 0.6.1
La APK incluye una pantalla de métricas locales persistentes con promedio y p95 (últimas 64 mediciones). El SDK `firebase-perf` solo transmite trazas cuando se ha registrado la aplicación Android `co.antesdeabrir.piloto` en el proyecto Firebase existente con su propio `android/app/google-services.json` y el usuario activa consentimiento separado. La configuración web de Firebase no sirve para una app Android. Consulta [docs/SMARTGUARD-ANDROID-PERFORMANCE-V061.md](docs/SMARTGUARD-ANDROID-PERFORMANCE-V061.md).

## Medición web y alcance del piloto Android

El [informe PageSpeed móvil del 05/11/2026](https://pagespeed.web.dev/analysis/https-pmc-landing-page-antes-de-abrir-vercel-app/rk6l31oauk?form_factor=mobile) registró **84/100 en rendimiento** y **96/100 en accesibilidad** sobre la portada pública sin sesión, bajo condiciones de laboratorio. No evalúa el rendimiento nativo del APK ni la exactitud del detector. La disponibilidad HTTP medida por UptimeRobot tampoco certifica el flujo completo de análisis ni la entrega de notificaciones Android.

El Alpha 0.2 entregado se enlazó como APK Android 0.6.0. Sus tiempos de apertura y análisis, permisos y funcionamiento en segundo plano requieren pruebas del teléfono e instrumentación nativa. Las demostraciones con datos simulados no sustituyen mediciones reales. Esta actualización documental no modifica el Excel entregado ni acredita retroactivamente pruebas o monitoreo.

## Android 0.6.2 — simulación de siete días y consentimiento pendiente

[Guía y límites de la demo](docs/SMARTGUARD-ANDROID-METRICAS-SIMULADAS-V062.md). El panel Android permite ver datos **reales** del teléfono o una muestra de **siete días inventados** rotulada de forma permanente como SIMULADA. Los datos ficticios no se guardan en los contadores reales ni se envían a Firebase y **no acreditan siete días de uptime**. La preferencia de compartir métricas se puede marcar sin configuración Firebase Android, pero el envío queda **inactivo** hasta registrar la app Android y pulsar nuevamente la activación.

---

<!-- INICIO: DOCUMENTACION-TECNICA-INTEGRADA -->

## Documentación técnica integrada — Entrega 4 · Alpha 0.2

Esta sección contiene **el texto íntegro** de las explicaciones técnicas de SmartGuard dentro del propio README: informe del Excel v8, justificación de las mediciones Android, resultados consolidados y guía de lectura de la Entrega 4. Los archivos originales siguen disponibles en `docs/calidad-tecnica/` como respaldo editable y para conservar el historial. **Se respetan las declaraciones de fuente y las limitaciones registradas**, separando las metas internas Android de la acreditación oficial de la web.

> **Orden de consulta:** informe integral v8 (más reciente) → justificación Android → resultados históricos del paquete inicial → guía de inicio. En caso de contradicción temporal entre textos, priorizar la revisión v8 para el contenido del libro; las fuentes originales y los informes oficiales conservan autoridad sobre sus propias mediciones.


---

## SmartGuard — Informe técnico integral de medición (Excel v8)

**Entrega 4 · Alpha 0.2 · SmartGuard web + SmartGuard Android**

> **Base del informe:** archivo entregado por el equipo `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL(8).xlsx` (13 hojas). El equipo identifica este libro como su consolidado original de mediciones. Las cifras de este informe se contrastan con las 1.198 filas que contiene. Esta comprobación aritmética no constituye, por sí misma, verificación independiente de una exportación autenticada de Firebase: el archivo fuente citado, `SmartGuard_1198_CORREGIDO_EXCEL_ES.csv`, no está incluido en el material recibido para esta revisión.

### 1. Resumen para el evaluador

SmartGuard combina una **web pública** para consultar enlaces y una **APK Android** para analizar señales y emitir alertas. Por las diferencias arquitectónicas entre una web y una APK, se emplearon dos conjuntos de instrumentos:

- **Android:** resultados por evento, éxito de análisis, salud operativa observada, publicación de alertas, confirmaciones y distribución de latencias.
- **Web:** UptimeRobot para disponibilidad HTTP(S), PageSpeed Insights/Lighthouse para rendimiento y accesibilidad móvil y pruebas funcionales con dos cuentas para autenticación/aislamiento.

En el **conjunto del Excel**, los seis objetivos internos Android se cumplen. **No se convierte automáticamente ese resultado en un 4/4 oficial**: cada criterio de la rúbrica tiene un instrumento y una prueba propios.

### 2. Identificación, período y procedencia declarada

| Dato | Valor identificado en el libro |
| --- | --- |
| Registros individuales | 1.198 |
| Identificadores de instalación | 6 (`SG-SIM-01` a `SG-SIM-06`) |
| Inicio de ventana declarado | 2026-10-29 16:00, Bogotá |
| Fin de ventana declarado | 2026-11-05 16:00, Bogotá |
| Fuente declarada | Firebase, registros numéricos |
| Archivo fuente nombrado | `SmartGuard_1198_CORREGIDO_EXCEL_ES.csv` |
| SHA-256 **declarado para ese CSV**, no calculado aquí | `7ab26aecf2223ca27fb7809f65cd84252fdde5e4d2f6c3a14a1ff4bfca06fe5a` |
| Libro de análisis | `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL(8).xlsx` |

Los identificadores de eventos conservan prefijos `SIM-` y las instalaciones `SG-SIM-`. Se documentan literalmente, sin rebautizarlos ni tomar los prefijos como prueba concluyente de autenticidad o falta de ella. La hoja `10_TRAZABILIDAD` contiene a la vez una declaración de origen Firebase y la advertencia «Fuente original no certifica capturas Android ni uso de servicios externos»; por ello la procedencia se presenta como **declaración del equipo pendiente de contraste con exportación primaria**. Si el equipo conserva esa exportación, puede corroborarse por hash y correspondencia evento por evento. Los registros con contenidos privados (SMS, enlaces personales, tokens, datos familiares) no se deben publicar.

### 3. Resultados Android: definiciones, cálculos y umbrales

| Indicador | Cálculo con la muestra | Valor | Objetivo interno | Evaluación |
| --- | --- | ---: | ---: | --- |
| Salud operativa observada | 1.188 eventos saludables / 1.198 eventos instrumentados | **99,17 %** | ≥99 % | Cumple |
| Análisis exitosos | 1.187 análisis correctos / 1.198 intentos | **99,08 %** | ≥99 % | Cumple |
| Alertas publicadas | 523 alertas OK / 527 alertas requeridas | **99,24 %** | ≥99 % | Cumple |
| Confirmaciones de eventos | 1.187 confirmaciones / 1.198 eventos | **99,08 %** | ≥99 % | Cumple |
| Latencia de análisis P95 | Percentil 95 de 1.187 muestras de duración | **437 ms** | ≤500 ms | Cumple |
| Latencia de alerta P95 | Percentil 95 de 523 muestras elegibles | **783 ms** | ≤1.000 ms | Cumple |

Las alertas requeridas se identifican en eventos **naranja o rojo**: 326 naranjas + 201 rojos = **527 elegibles**. Los otros **671** eventos son verdes. La ausencia de alerta para riesgo verde no debe contabilizarse como error.

**Agregación:** cada porcentaje general se calcula con `SUM(éxitos)/SUM(elegibles)`, no promediando tasas individuales de los seis dispositivos. Los percentiles globales se calculan sobre **muestras individuales** mediante la regla de rango más cercano `P95 = SMALL(muestras, ROUNDUP(N*0.95, 0))`. No se promedian percentiles parciales por instalación.

#### Distribución temporal y por instalación

Los seis identificadores acumulan respectivamente **200, 200, 200, 200, 199 y 199 observaciones**, total **1.198**. La hoja `08_HISTORICO_7D` presenta cortes calendarios entre el **29 de octubre** y el **5 de noviembre**, con extremos de ventana parciales. Una tabla de eventos repartidos en fechas **no implica** monitorización HTTP continua ni disponibilidad en los intervalos sin eventos.

#### Latencias y lectura operativa

| Serie | Muestras | P50 | P90 | P95 | P99 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Análisis | 1.187 | 270 ms | 405 ms | **437 ms** | 537 ms |
| Alerta | 523 | 576 ms | 743 ms | **783 ms** | 881 ms |

**Interpretación:** el P95 de análisis de 437 ms significa que aproximadamente el 95 % de las duraciones válidas registradas no supera ese valor. El P95 de alerta de 783 ms describe el tiempo instrumentado para emitir las alertas elegibles. No demuestra, por sí mismo, cuánto tarda un usuario en ver el aviso en cualquier fabricante Android ni mide un flujo completo bajo todas las condiciones de red/batería.

El libro presenta un índice Android propio cercano a **99,31/100**; es un **índice interno ponderado**, definido en `09_METODOLOGIA`, **no** una puntuación de Google PageSpeed ni un estándar externo. La cadena `"6/6"` en `00_VEREDICTO!D5` es texto fijo: la evaluación reproducible de cada indicador reside en `00_VEREDICTO!F9:F14`.

### 4. Método y recorrido de cada dato

1. **Captura y origen declarado:** la hoja `10_TRAZABILIDAD` identifica Firebase y un CSV de origen; su correspondencia técnica con una exportación externa debe conservarse como evidencia de procedencia.
2. **Filas individuales:** `01_REGISTROS` contiene ID del evento, hora Bogotá, ID de instalación, versión Android, nivel de riesgo, indicadores de éxito y duraciones válidas.
3. **Sumatorias:** `02_SUMATORIAS` realiza recuentos y sumas por instalación y acumulados, con los denominadores respectivos.
4. **Comparación:** `03_COMPARATIVA` muestra diferencias entre instalaciones sin sustituir datos de base.
5. **Histórico:** `08_HISTORICO_7D` agrega registros por día, sin inferir disponibilidad fuera de las observaciones.
6. **Percentiles:** `12_AUX_LATENCIAS` organiza muestras para las funciones de percentil.
7. **Objetivos y fórmula:** `09_METODOLOGIA` enumera seis umbrales, pesos, operaciones y reglas de interpretación.
8. **Síntesis:** `00_VEREDICTO` muestra índice, estados y lectura general.
9. **Correspondencia:** `04_RUBRICA_OFICIAL` y `05_EQUIVALENCIAS_ANDROID` describen criterios web y alcance Android, que deben leerse por separado.
10. **Pruebas funcionales complementarias:** `06_PRUEBAS_E2E` y `07_ACCESIBILIDAD` proporcionan plantillas de verificación; los campos de resultados observados no pueden sustituirse por tasas de telemetría.

### 5. Inventario de las trece hojas

| Hoja | Función | Lectura responsable |
| --- | --- | --- |
| `00_VEREDICTO` | Síntesis, índice propio, estados | El índice es interno; contrastar cualquier 4/4 con la matriz de evidencia |
| `01_REGISTROS` | 1.198 eventos individuales | Base de cálculo; conservar identificadores y no publicar datos sensibles |
| `02_SUMATORIAS` | Contadores/ratios/percentiles por instalación | Denominadores correctos y agregado ponderado |
| `03_COMPARATIVA` | Comparación entre instalaciones | Comparación descriptiva de la muestra |
| `04_RUBRICA_OFICIAL` | Cinco subcondiciones agrupadas en cuatro criterios | Celdas `C7:C9` contienen descripciones Android, no cifras oficiales de PSI/UptimeRobot; `D7:D11` marca `CUMPLE` sin corroborarlo en todos los casos |
| `05_EQUIVALENCIAS_ANDROID` | Diferencias web vs Android | Declara expresamente que no hay conversión automática |
| `06_PRUEBAS_E2E` | Diez pasos de cuentas A/B en móvil/PC | Resultados observados y enlaces sin diligenciar en la copia recibida; `D18=PENDIENTE` |
| `07_ACCESIBILIDAD` | TalkBack, etiquetas, contraste, foco, escala | Las casillas de estado/evidencia están vacías en la copia; su `A2` afirma incorrectamente que representa un score PageSpeed |
| `08_HISTORICO_7D` | Cortes diarios | No equivale a uptime medido por UptimeRobot |
| `09_METODOLOGIA` | Definiciones, reglas y umbrales | Seis objetivos internos propios y reglas de cálculo |
| `10_TRAZABILIDAD` | Fuente declarada, CSV, hash y fechas | Origen afirmado por el equipo, no validado externamente en este análisis |
| `11_CATALOGO_30` | Catálogo de posibles indicadores | No son treinta métricas automáticamente calculadas |
| `12_AUX_LATENCIAS` | Vectores auxiliares de latencias | Alimentan cuantiles sin mezclar valores no aplicables |

### 6. Relación con la rúbrica: cinco subcondiciones, cuatro criterios agregados

| Subcondición | Umbral / exigencia | Evidencia identificada | Qué se puede afirmar |
| --- | --- | --- | --- |
| **UptimeRobot / disponibilidad** | ≥99 % últimos siete días | Página de estado: https://stats.uptimerobot.com/vyppRM840A ; README documenta monitor creado el 05/11 | La URL permite revisar el monitor; el **99,17 % Android** no demuestra uptime HTTP de los siete días anteriores |
| **PageSpeed / Performance** | ≥70 móvil | Existe informe oficial de la portada de fecha 05/11 enlazado en README, que reporta **84/100** | Evidencia web puntual para la URL evaluada; **437 ms P95 Android** no es PageSpeed |
| **PageSpeed / Accessibility** | ≥80 móvil | El mismo informe oficial enlazado en README reporta **96/100** | Evidencia web puntual; la revisión TalkBack nativa requiere acta propia |
| **Flujo E2E entre cuentas** | Registro, ingreso, aislamiento y navegación en dispositivos correspondientes | Libro tiene diez pasos diseñados, pero `06_PRUEBAS_E2E!F7:H16` está sin ejecución registrada | **Pendiente de documentar ejecución**, aun si el equipo ya realizó pruebas |
| **README completo** | Instalación, ejecución, arquitectura, seguridad, pruebas y evidencia | README raíz y documentación técnica del repositorio | Documentación presente; revisar enlaces y criterios de entrega |

**Informe oficial PageSpeed móvil (referenciado en README):** https://pagespeed.web.dev/analysis/https-pmc-landing-page-antes-de-abrir-vercel-app/rk6l31oauk?form_factor=mobile

La matriz `04_RUBRICA_OFICIAL` del libro recibido muestra **`4/4 VERIFICADOS`**, pero sus resultados `C7:C9` describen mediciones Android y la hoja E2E está pendiente. **Esa etiqueta es una declaración del libro, no una conclusión probada por la evidencia incluida**. Para sustentar 4/4 se necesita vincular cada resultado a su medición específica, con fecha/URL y acta E2E.

### 7. Fundamento técnico de la instrumentación alternativa para Android

**UptimeRobot:** requiere un servicio HTTP(S) direccionable desde Internet. Una APK puede ejecutarse localmente y depender del permiso Notification Listener, del sistema operativo, de restricciones de batería y de conectividad. Sus eventos saludables miden **fracción de acciones observadas con resultado favorable**, no tiempo continuo de respuesta HTTP. Para la web sí corresponde emplear UptimeRobot con una ventana efectiva de siete días.

**PageSpeed Insights:** ejecuta Lighthouse sobre una página web, con métricas y auditorías específicas del navegador. La latencia del detector y el tiempo de publicación de alerta en Android son indicadores objetivos **de finalidad relacionada con el rendimiento**, pero sus unidades y metodologías son distintas. No hay función válida para transformar milisegundos de la APK en puntos Lighthouse. La accesibilidad Android requiere TalkBack/Accessibility Scanner, no solo latencias.

**Firebase/confirmaciones:** el ACK registrado indica el éxito observado de la operación instrumentada de confirmación. No acredita por sí solo entrega de todos los SMS, recepción de cada notificación ni continuidad de conectividad; esas propiedades demandan pruebas adicionales.

Por ello, el diseño de medición **es defendible como instrumentación complementaria adaptada al componente nativo**, siempre que se distinga de las herramientas oficiales de la web.

### 8. Documentos y código relacionado

- [Inicio de calidad técnica — Entrega 4](docs/calidad-tecnica/ENTREGA-4-INICIO-AQUI.md)
- [Resultados numéricos consolidados](docs/calidad-tecnica/RESULTADOS-CONSOLIDADOS-ENTREGA-4.md)
- [Justificación técnica Android](docs/calidad-tecnica/JUSTIFICACION-TECNICA-ENTREGA-4-ANDROID.md)
- [Calidad web y PageSpeed](docs/WEB-QUALITY-ALPHA02.md)
- [README raíz](README.md)
- [Índice del directorio y precauciones de generación](docs/calidad-tecnica/README.md)

**Declaración de integridad:** este documento no cambia el Excel, no altera datos ni registros, no reconstruye una exportación de Firebase inexistente y no deduce un resultado oficial web a partir de observaciones Android.



---

## SmartGuard — Justificación técnica de calidad para Entrega 4 (Alpha 0.2)

> **Complemento actualizado:** [Informe técnico integral del Excel v8](docs/calidad-tecnica/INFORME-INTEGRAL-EXCEL-V8-ENTREGA-4.md), incluyendo evidencia de PageSpeed que consta en el README y alcance de la evaluación oficial. Esta guía conserva el marco conceptual general.


### Alcance de la evaluación

Se presenta la metodología de observabilidad de SmartGuard Android, su relación con los criterios de calidad técnica de la Entrega 4 y la separación entre las mediciones nativas y los resultados oficiales de servicios web.

**Producto evaluado:** SmartGuard dispone de una interfaz web pública y de una aplicación Android. La detección de enlaces en notificaciones y las alertas locales dependen de componentes nativos Android; otras funciones dependen de conectividad y servicios remotos. Por tanto, se presentan **dos niveles diferentes de medición**, sin atribuir resultados de una plataforma a la otra.

### 1. Requisito de la rúbrica frente a arquitectura móvil

| Requisito | Qué evalúa literalmente | Qué ocurre con la APK | Cómo se documenta en SmartGuard |
| --- | --- | --- | --- |
| UptimeRobot: disponibilidad ≥99 % últimos 7 días | Respuesta del **servicio web** publicado, desde una red externa | Una APK instalada no expone necesariamente un endpoint HTTP(S) que UptimeRobot pueda consultar. Su servicio de notificaciones puede estar detenido por permisos, batería o el sistema operativo. | **Web:** página de estado de UptimeRobot y ventana efectiva. **Android:** cobertura de observaciones, salud operativa y resultados de acciones instrumentadas. Son evidencias distintas. |
| PageSpeed móvil: rendimiento ≥70 | Puntuación Lighthouse/PSI de la **página web móvil** | No puede ejecutarse PSI sobre un APK como si fuera una URL web. | **Web:** informe oficial de PageSpeed móvil. **Android:** tiempo de análisis, tiempo de alerta y percentiles calculados desde eventos. |
| PageSpeed móvil: accesibilidad ≥80 | Auditoría automática de accesibilidad de **página web** | La interfaz Android requiere criterios y pruebas nativos (lector de pantalla, tamaños táctiles, contraste, etiquetas). | **Web:** puntaje oficial PSI. **Android:** evidencias de pruebas de accesibilidad nativa, si existen. Las latencias no miden accesibilidad. |
| E2E con dos cuentas | Registro, ingreso, aislamiento y recorrido sin errores | Aplica a flujos compartidos/Family independientemente de la plataforma. | Prueba reproducible en cuentas distintas, móvil y PC, con evidencia funcional; no se sustituye con una tabla de latencias. |

La evaluación se organiza por superficie tecnológica: disponibilidad y experiencia de la web pública mediante herramientas web, y operación nativa Android mediante instrumentación de eventos y latencias. Las métricas de ambas superficies mantienen unidades y alcances diferentes.

### 2. Instrumentación diseñada para medir el funcionamiento de Android

El repositorio contiene componentes de instrumentación como `NativePerformance`, `FirebaseBackgroundTelemetry`, el servicio nativo de notificaciones y un esquema de agregación `devices/{firebaseUid}/daily_metrics/{yyyy-mm-dd}` documentado en [calidad técnica](docs/calidad-tecnica/README.md). Su existencia en el código **no demuestra por sí sola** que una APK específica y firmada haya enviado datos de producción; ese punto debe acreditarse con registros.

Se contemplan los siguientes indicadores:

| Indicador Android | Definición operativa | Interpretación válida y límite |
| --- | --- | --- |
| Salud operativa observada | Acciones con señal de servicio correcto / acciones instrumentadas | Éxito **en eventos observados**; no es uptime continuo del sistema operativo ni de un endpoint. |
| Análisis exitosos | Análisis concluidos correctamente / intentos instrumentados | Fiabilidad de la función de clasificación en la muestra. |
| Alertas publicadas | Alertas generadas correctamente / alertas requeridas conforme a la política de riesgo | Fiabilidad de la notificación; debe definirse el universo de alertas exigibles. |
| Confirmaciones Firebase | Confirmaciones registradas / eventos que requieren confirmación | Mide sincronización observada, no garantiza recepción en todo estado de conectividad. |
| Latencia de análisis | Diferencia entre inicio y fin del procesamiento, en ms | Mide velocidad de análisis en eventos instrumentados. |
| Latencia de alerta | Diferencia entre detección y publicación de alerta, en ms | Mide retraso de notificación bajo las condiciones instrumentadas. |
| P50/P90/P95/P99 | Percentiles calculados sobre las muestras elegibles individuales | No promediar percentiles por dispositivo para construir un percentil global. |

Los indicadores de error, latencia y éxito son útiles para estudiar la experiencia real de una APK; no se convierten por ello en puntuaciones de PageSpeed ni en la disponibilidad oficial de UptimeRobot.

### 3. Tabla consolidada y método de cálculo

El paquete de trabajo `SMARTGUARD_CALIDAD_ENTREGABLES(1).zip` incluye `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx` con una tabla de **1.198 observaciones agrupadas en seis identificadores de instalación**, sumatorias, comparativas, histórico, metodología y matriz frente a la rúbrica. El período declarado es del 29 de octubre al 5 de noviembre de 2026.

La tabla se estructura en capas:

1. **Registro individual:** identificador, fecha, instalación, resultado de servicio, resultado de análisis, alerta, confirmación y latencias.
2. **Agregación por instalación:** número de observaciones, numeradores y denominadores de éxito, percentiles de las latencias.
3. **Agregación total:** suma de numeradores y denominadores; los porcentajes globales son cocientes entre esas sumas, nunca promedio simple de porcentajes de instalaciones.
4. **Comparación y umbrales:** diferencias entre instalaciones y criterios adoptados para monitorear calidad operativa.
5. **Correspondencia con la rúbrica:** relación documentada entre las pruebas oficiales de la web, los atributos Android evaluados y la evidencia específica requerida para cada criterio.

**Alcance de los resultados:** la tabla contiene 1.198 observaciones y seis identificadores de instalación. Sus métricas agregadas pueden revisarse y recalcularse a partir de las filas incluidas. El equipo señala que las observaciones corresponden a mediciones reales; para documentar esa procedencia de manera verificable es necesario enlazar la exportación primaria de Firebase/Android o el CSV original con su registro de captura. Hasta contar con esa fuente, este documento distingue resultados tabulados de telemetría de producción verificada.

#### Cómo acreditar que los resultados son mediciones reales

Adjuntar o referenciar una exportación primaria con identificadores seudonimizados, marca temporal, versión de APK, tipo de evento y valores originales; explicar el mecanismo de recolección y consentimiento; ejecutar el cálculo reproducible; y comprobar que los totales del Excel coinciden con las fuentes. No subir números de teléfono, contenido de SMS, enlaces privados, tokens ni identificadores personales.

### 4. Qué cubre la página web

La web pública se ofrece en https://pmc-landing-page-antes-de-abrir.vercel.app/ .

- **UptimeRobot**: página de estado https://stats.uptimerobot.com/vyppRM840A . El README documenta que el monitor fue creado el **5 de noviembre de 2026**; no puede demostrar retrospectivamente los siete días anteriores a esa fecha. Para cualquier período evaluado se requiere porcentaje real y duración efectiva de la observación.
- **PageSpeed móvil**: generar un reporte oficial de la URL exacta de la pantalla evaluada, y registrar sus valores de rendimiento y accesibilidad. El código dispone de procedimientos y una acción documentados en [WEB-QUALITY-ALPHA02](docs/WEB-QUALITY-ALPHA02.md); no se deben atribuir puntuaciones sin ese reporte.
- **Cuentas y flujos**: probar el registro, inicio de sesión y aislamiento de datos con cuentas distintas. Las pruebas de instrumentación no sustituyen esta validación.

### 5. Fundamentación de la estrategia de medición

SmartGuard combina una interfaz web con una aplicación Android cuyo proceso central incluye recepción de eventos de notificaciones, análisis de enlaces y publicación de alertas. La calidad de este flujo depende tanto del procesamiento local como de la conectividad y la sincronización con los servicios remotos.

Para caracterizar la operación nativa se definieron indicadores de salud operativa observada, análisis completados, alertas publicadas, confirmaciones de sincronización y distribución de latencias. Los datos se organizan por observación individual, instalación y agregado general, con denominadores explícitos y percentiles calculados sobre las muestras elegibles.

La metodología permite evaluar de forma cuantitativa la fiabilidad de las operaciones instrumentadas y los tiempos de respuesta en Android. En paralelo, los componentes web se evalúan mediante verificaciones HTTP(S) y PageSpeed Insights. Esta separación evita equiparar una tasa de éxito por evento con disponibilidad continua, o una latencia en milisegundos con una puntuación Lighthouse.

Los resultados numéricos y las definiciones de cada métrica se presentan en [Resultados consolidados de calidad técnica](docs/calidad-tecnica/RESULTADOS-CONSOLIDADOS-ENTREGA-4.md).

### 6. Cobertura de evidencia técnica

| Afirmación | Soporte encontrado | Estado |
| --- | --- | --- |
| Existe instrumentación Android en código fuente | Componentes y documentación del repositorio | Soportado a nivel de código |
| Existe tabla de 1.198 filas y 6 instalaciones identificadas | Excel aportado en el paquete | Soportado como conjunto tabulado |
| Procedencia de las 1.198 filas como capturas reales | Pendiente aportar exportación primaria y correspondencia por evento | Sin verificación independiente |
| Se cuenta con siete días oficiales de UptimeRobot antes de la entrega | Monitor creado el 5/11 según README | No acreditado para los siete días anteriores |
| La web cumple PageSpeed móvil 70/80 | Falta reporte oficial con puntajes correspondientes | Pendiente |
| Se realizó una prueba E2E completa con dos cuentas | Falta registro funcional verificable del recorrido | Pendiente |

### 7. Documentos de referencia

- [Resultados consolidados y cálculos contrastados con el Excel y JSON](docs/calidad-tecnica/RESULTADOS-CONSOLIDADOS-ENTREGA-4.md)

- [README principal](README.md)
- [Calidad técnica y generación del reporte](docs/calidad-tecnica/README.md)
- [Calidad web Alpha 0.2](docs/WEB-QUALITY-ALPHA02.md)
- [Matriz de Entrega 4](docs/ENTREGA-4-SMARTGUARD-AUDITORIA.md)

**Regla de integridad:** los indicadores y sus fórmulas deben poder recalcularse a partir de los registros, y la procedencia de las mediciones debe sustentarse con las fuentes de captura. Las equivalencias propuestas para Android no sustituyen la evaluación web oficial.



---

## SmartGuard — Resultados consolidados y evaluación técnica (Entrega 4)

> **Actualización del libro:** la versión más reciente aportada por el equipo es `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL(8).xlsx`. Consulte [Informe técnico integral v8](docs/calidad-tecnica/INFORME-INTEGRAL-EXCEL-V8-ENTREGA-4.md) para la revisión actual, incluido el informe PageSpeed ya enlazado en README y las limitaciones de trazabilidad. El siguiente análisis conserva la descripción histórica del paquete inicial.


### 1. Alcance y fuentes de datos

El equipo de SmartGuard declara haber verificado la procedencia real de sus mediciones correspondientes al período **29 de octubre de 2026, 16:00 — 5 de noviembre de 2026, 16:00 (America/Bogota)**. Esta declaración corresponde al **equipo**, no a una comprobación independiente de acceso a Firebase o a los teléfonos realizada durante la elaboración de este documento.

Se examinaron las 1.198 filas de la hoja `01_REGISTROS` del archivo `SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx` aportado en el paquete `SMARTGUARD_CALIDAD_ENTREGABLES(1).zip`, y su JSON de resultados. Los cálculos y totales **sí se comprobaron contra las filas disponibles**; para acreditar independientemente el origen operativo todavía se necesita la exportación primaria indicada por el equipo.

La convención de identificadores usada por el paquete contiene prefijos históricos que aluden a simulación y las fuentes incluidas describen el escenario como sintético. No se borran ni transforman esos identificadores o declaraciones de los archivos originales sin trazabilidad que demuestre que se trata de etiquetas erróneas. Este documento muestra **resultados reproducidos del conjunto entregado** y registra por separado la declaración de verificación realizada por el equipo.

### 2. Resultados derivados de los registros del paquete

| Indicador | Numerador / denominador | Resultado | Meta interna | Evaluación interna |
| --- | ---: | ---: | ---: | --- |
| Salud operativa observada | 1.188 / 1.198 | **99,17 %** | ≥99 % | Cumple |
| Análisis exitosos | 1.187 / 1.198 | **99,08 %** | ≥99 % | Cumple |
| Alertas publicadas | 523 / 527 | **99,24 %** | ≥99 % | Cumple |
| Confirmaciones de eventos | 1.187 / 1.198 | **99,08 %** | ≥99 % | Cumple |

El denominador de alertas es 527, no 1.198: las alertas se contabilizan solo cuando el riesgo está clasificado como naranja o rojo. La muestra contiene 671 registros verdes, 326 naranjas y 201 rojos. Los porcentajes se calculan como **suma de éxitos / suma de intentos**, no promediando tasas de las seis instalaciones.

#### Latencias registradas

Percentiles de rango más cercano sobre las observaciones con un valor numérico en milisegundos:

| Latencia | Muestras | P50 | P90 | P95 | P99 | Meta interna P95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Análisis | 1.187 | 270 ms | 405 ms | **437 ms** | 537 ms | ≤500 ms |
| Alerta | 523 | 576 ms | 743 ms | **783 ms** | 881 ms | ≤1.000 ms |

No se interpretan los percentiles de forma independiente del número de muestras. Los P95 globales se obtienen de observaciones individuales; no son el promedio de P95 por instalación.

#### Distribución entre identificadores de instalación

| Identificador del conjunto recibido | Registros |
| --- | ---: |
| SG-SIM-01 | 200 |
| SG-SIM-02 | 200 |
| SG-SIM-03 | 200 |
| SG-SIM-04 | 200 |
| SG-SIM-05 | 199 |
| SG-SIM-06 | 199 |
| **Total** | **1.198** |

Los identificadores se reproducen literalmente como aparecen en los archivos aportados para permitir correspondencia exacta y evitar cambios silenciosos en la procedencia.

### 3. Validaciones ejecutadas sobre el paquete entregado

- **Integridad ZIP:** sin miembros corruptos según la comprobación CRC.
- **JSON:** lectura y análisis sintáctico correctos.
- **Excel:** apertura correcta y 13 hojas detectadas.
- **Unicidad:** 1.198 identificadores de evento diferentes.
- **Totales:** coinciden seis contadores independientes entre las filas del Excel y el JSON (registros, salud, análisis, alertas requeridas, alertas publicadas y ACK).
- **Marcas temporales:** primera y última marca dentro de la ventana declarada.
- **Valores binarios:** no se detectaron otros valores diferentes de 0 y 1 en los campos de éxito no vacíos.
- **Fórmulas:** 2.663 expresiones identificadas y ninguna celda con errores literales o fórmulas con texto `#REF!`, `#DIV/0!` o `#NAME?`. **No equivale a un recálculo universal de todas las fórmulas**.
- **Fuente original:** el JSON cita `SmartGuard_1198_CORREGIDO_EXCEL_ES.csv` con SHA-256 `7ab26aecf2223ca27fb7809f65cd84252fdde5e4d2f6c3a14a1ff4bfca06fe5a`, pero ese CSV no aparece dentro del ZIP recibido.

Las comprobaciones cubren el paquete disponible, no la totalidad de las ramas históricas del repositorio, las exportaciones autenticadas de Firebase ni una prueba física de la APK.

### 4. ¿Por qué Android se instrumentó de forma distinta?

**UptimeRobot** consulta endpoints HTTP(S) públicos desde una red externa. Una APK instalada funciona bajo las condiciones de Android, sus servicios en segundo plano, permisos y restricciones del fabricante; no existe necesariamente un endpoint público que permita medir su actividad. **La tasa de salud de 99,17 % solo describe eventos observados en el conjunto**, no demuestra 99,17 % de uptime continuo de la APK o de una URL.

**PageSpeed Insights móvil** evalúa páginas web por medio de Lighthouse, no el funcionamiento interno de componentes nativos Android. Los percentiles de análisis y alertas cuantifican duración de operaciones, pero no producen una puntuación Lighthouse ni acreditan accesibilidad. Para accesibilidad Android se requieren pruebas complementarias de la interfaz.

La aplicación **también posee una web pública**. Por ello, los umbrales literales de UptimeRobot (≥99 % en los últimos siete días) y PageSpeed móvil (Performance ≥70; Accessibility ≥80) deben evaluarse separadamente sobre las URLs apropiadas. Las métricas Android son **evidencia complementaria y una propuesta de equivalencia limitada al componente nativo**, cuya aceptación corresponde al docente.

### 5. Correspondencia con los criterios de calidad

| Elemento de la rúbrica | Evidencia disponible | Situación |
| --- | --- | --- |
| Calidad operativa nativa | Contadores y latencias reproducidos de la tabla | Resultados tabulares comprobados; procedencia declarada por el equipo |
| UptimeRobot ≥99 % / siete días | Página de estado web; README indica creación del monitor el 05/11 | No demuestra siete días anteriores a esa fecha |
| PageSpeed rendimiento móvil ≥70 | No se adjuntó informe oficial PSI de la URL evaluada | Falta informe con puntuación |
| PageSpeed accesibilidad móvil ≥80 | No se adjuntó informe oficial PSI de la URL evaluada | Falta informe con puntuación |
| Prueba E2E con dos cuentas | No consta evidencia reproducible en este paquete | Pendiente de comprobación funcional |
| README y explicación del método | Documentación técnica del repositorio | Documentado, sujeto a revisión editorial final |

### 6. Síntesis de resultados

La instrumentación de SmartGuard Android caracteriza la fiabilidad operativa a través de eventos instrumentados y tiempos de respuesta. En el conjunto consolidado de 1.198 observaciones se obtienen **99,17 %** de salud operativa observada, **99,08 %** de análisis exitosos, **99,24 %** de alertas publicadas y **99,08 %** de confirmaciones registradas. El percentil 95 de análisis es de **437 ms** y el de publicación de alertas, de **783 ms**.

Estos indicadores describen las operaciones observadas en la aplicación Android y permiten comparar resultados de las seis instalaciones identificadas. Su alcance es complementario a las verificaciones de disponibilidad y experiencia web realizadas con UptimeRobot y PageSpeed Insights; cada herramienta se utiliza para la superficie tecnológica que puede medir.

El equipo declara haber verificado el origen de sus mediciones. La correspondencia independiente con los registros primarios de captura se mantiene como elemento de trazabilidad documental.

### 7. Referencias de implementación

- [Justificación técnica Android](docs/calidad-tecnica/JUSTIFICACION-TECNICA-ENTREGA-4-ANDROID.md)
- [Procedimiento web y rúbrica](docs/WEB-QUALITY-ALPHA02.md)
- [Índice de calidad técnica](docs/calidad-tecnica/README.md)

**Integridad:** los valores de este documento son cálculos sobre el conjunto entregado. No se alteraron el APK, los registros originales, los scripts de generación ni las hojas de cálculo.



---

## SmartGuard | Evaluación de calidad técnica — Entrega 4

**Alpha 0.2 · Arquitectura web + aplicación Android**

**Lectura prioritaria (libro v8):** [Informe técnico integral de medición, evidencia y rúbrica](docs/calidad-tecnica/INFORME-INTEGRAL-EXCEL-V8-ENTREGA-4.md). Incluye la descripción individual de las 13 hojas y las diferencias entre el veredicto declarado en el Excel y la evidencia documentada.

### 1. Requisitos de calidad técnica

La Entrega 4 establece criterios de disponibilidad de siete días (UptimeRobot, **≥99 %**), rendimiento móvil (**≥70** en PageSpeed Insights), accesibilidad móvil (**≥80** en PageSpeed Insights) y un flujo de extremo a extremo comprobable entre dos cuentas. Para contrastarlos, SmartGuard distingue la operación de su **web pública** de la ejecución **nativa Android**: ambas tienen superficies de medición diferentes.

| Requisito de la rúbrica | Medición oficial | Medición de SmartGuard Android | Tratamiento |
| --- | --- | --- | --- |
| Disponibilidad ≥99 % durante siete días | Monitor HTTP(S) y página de estado UptimeRobot | Salud operativa de eventos instrumentados, con denominador explícito | Complementaria; no equivale al uptime continuo |
| Rendimiento móvil ≥70 | PageSpeed Insights móvil, puntuación Lighthouse de la web | Latencia de análisis y de alerta, cuantiles P50/P90/P95/P99 | Complementaria; no genera puntaje Lighthouse |
| Accesibilidad móvil ≥80 | PageSpeed Insights móvil de la web | Pruebas de accesibilidad Android (etiquetas, lector de pantalla, contraste, interacción) | Requiere evidencia específica de interfaz |
| Flujo E2E de dos cuentas | Registro, ingreso, aislamiento y flujo en web/móvil | Pruebas de SmartGuard Family con sesiones distintas | Se evalúa funcionalmente; no se infiere del Excel |

### 2. Instrumento de medición: libro Excel de calidad técnica

La consolidación se realizó en el libro **`SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx`**, elaborado para reunir el registro individual de cada operación, calcular los indicadores, comparar seis instalaciones y relacionar los resultados con los criterios de calidad.

**Acceso al libro:** la versión actual revisada fue suministrada por el equipo como **`SMARTGUARD_CALIDAD_TECNICA_INTEGRAL(8).xlsx`**; se distingue del paquete histórico **`SMARTGUARD_CALIDAD_ENTREGABLES(1).zip`**. Su copia binaria todavía debe publicarse como archivo descargable permanente en el repositorio; por ello no se presenta una URL de GitHub inexistente. La **[tabla resumen verificable dentro del repositorio](docs/calidad-tecnica/RESULTADOS-CONSOLIDADOS-ENTREGA-4.md)** y los **[indicadores exportables en CSV](docs/calidad-tecnica/RESULTADOS-RESUMEN-ENTREGA-4.csv)** están disponibles desde esta página.

#### Organización del Excel (13 hojas)

| Hoja | Qué aporta |
| --- | --- |
| `00_VEREDICTO` | Síntesis y lectura general de los criterios |
| `01_REGISTROS` | 1.198 filas con evento, fecha, instalación, resultados y latencias |
| `02_SUMATORIAS` | Totales, ratios y percentiles por instalación y globales |
| `03_COMPARATIVA` | Comparación de indicadores entre instalaciones |
| `04_RUBRICA_OFICIAL` | Criterios literales de la rúbrica y su estado |
| `05_EQUIVALENCIAS_ANDROID` | Diferencia entre evaluación web e indicadores Android |
| `06_PRUEBAS_E2E` | Registro de recorridos de extremo a extremo |
| `07_ACCESIBILIDAD` | Registro de comprobaciones de accesibilidad |
| `08_HISTORICO_7D` | Agrupación temporal de la ventana examinada |
| `09_METODOLOGIA` | Definiciones, reglas de cálculo y umbrales |
| `10_TRAZABILIDAD` | Referencias a las fuentes de las mediciones |
| `11_CATALOGO_30` | Catálogo de indicadores y criterios |
| `12_AUX_LATENCIAS` | Series auxiliares para calcular percentiles |

La tabla permite **reproducir los cálculos desde las 1.198 filas disponibles**. El equipo declara que verificó el origen real de las mediciones; la correspondencia independiente con exportaciones originales de captura se documenta separadamente. La trazabilidad de fórmulas y la procedencia operativa son verificaciones diferentes.

### 3. Resultados obtenidos de la tabla consolidada

Se examinaron **1.198 observaciones**, agrupadas en **seis identificadores de instalación**, dentro de la ventana declarada entre el **29 de octubre y el 5 de noviembre de 2026**.

| Indicador medido | Eventos favorables / elegibles | Resultado |
| --- | ---: | ---: |
| Salud operativa observada | 1.188 / 1.198 | **99,17 %** |
| Análisis exitosos | 1.187 / 1.198 | **99,08 %** |
| Alertas publicadas | 523 / 527 | **99,24 %** |
| Confirmaciones de eventos | 1.187 / 1.198 | **99,08 %** |

El número de alertas elegibles (**527**) corresponde a los eventos de riesgo naranja o rojo. Los porcentajes se calculan **sumando primero los numeradores y denominadores** por instalación; no son promedios simples de porcentajes.

| Distribución de latencias | P50 | P90 | P95 | P99 |
| --- | ---: | ---: | ---: | ---: |
| Análisis | 270 ms | 405 ms | **437 ms** | 537 ms |
| Publicación de alertas | 576 ms | 743 ms | **783 ms** | 881 ms |

Los percentiles se calculan con observaciones elegibles individuales y el método de rango más cercano. El P95 de análisis resulta inferior a la meta operativa interna de **500 ms**, y el P95 de alertas a la de **1.000 ms**.

### 4. Fundamentación de los indicadores nativos

UptimeRobot consulta externamente endpoints HTTP(S). El servicio de notificaciones de una APK no es un servidor web público: su ejecución está condicionada por permisos, estados de Android, restricciones de segundo plano y conectividad. Por ello, la tasa de salud operativa observada caracteriza los eventos medidos, **no el porcentaje de disponibilidad continua de la aplicación**.

PageSpeed Insights puntúa páginas web; no mide directamente la duración de los procesos del listener nativo Android. Las latencias de análisis y de alertas permiten caracterizar esa ejecución con unidades físicas (milisegundos), **sin convertirse en una puntuación PageSpeed**.

La web pública de SmartGuard se evalúa por separado con las herramientas oficiales; su evaluación está descrita en [Calidad web del Alpha 0.2](docs/WEB-QUALITY-ALPHA02.md). Los indicadores nativos amplían la evidencia de calidad para las funciones que esas herramientas web no observan.

### 5. Interpretación y límites de la evidencia

Los registros consolidados permiten comparar fiabilidad y tiempos de operación de la instrumentación Android en el conjunto suministrado. La página de estado web, los informes móviles de PageSpeed y las pruebas E2E corresponden a pruebas específicas con metodología propia y deben presentarse con sus enlaces y fechas de ejecución. **No se atribuyen a las métricas Android puntajes oficiales que no hayan sido medidos por la herramienta correspondiente.**

La captura y validación original de mediciones se atribuye al equipo; para auditoría externa de procedencia se requiere conservar o referenciar la exportación primaria y su correspondencia con los identificadores del Excel.

### 6. Documentación de apoyo

- [Resultados detallados, agregaciones y verificación interna](docs/calidad-tecnica/RESULTADOS-CONSOLIDADOS-ENTREGA-4.md)
- [Fundamentación técnica de la instrumentación Android](docs/calidad-tecnica/JUSTIFICACION-TECNICA-ENTREGA-4-ANDROID.md)
- [Guía de calidad web y herramientas oficiales](docs/WEB-QUALITY-ALPHA02.md)
- [Índice de calidad técnica](docs/calidad-tecnica/README.md)

*Los resultados anteriores se recalcularon a partir de los registros contenidos en el libro suministrado. No se ha alterado su contenido.*


<!-- FIN: DOCUMENTACION-TECNICA-INTEGRADA -->
