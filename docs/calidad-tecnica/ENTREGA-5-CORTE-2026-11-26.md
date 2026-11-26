# SMARTGUARD — CALIDAD TÉCNICA DE LA BETA
**Entrega 5 · Evaluación final y consolidación técnica**

**Fecha de consolidación:** 26 de noviembre de 2026  
**Producto evaluado:** SmartGuard Beta · Android y plataforma web  
**Repositorio:** Jorge-Sebastian/PMC_Landing_Page_Antes_de_Abrir

## 1. Resumen ejecutivo

SmartGuard culminó su ciclo de desarrollo con la consolidación de una aplicación de seguridad digital para Android, acompañada de una plataforma web pública para distribución, información comercial y acceso al producto.

Durante el período final se realizaron verificaciones de disponibilidad, rendimiento, accesibilidad, funcionamiento entre cuentas, seguridad y estabilidad operativa.

Los resultados evidenciaron una evolución favorable frente a la Entrega 4. La Beta mantuvo un funcionamiento estable, mejoró las puntuaciones de rendimiento móvil y completó satisfactoriamente las pruebas del flujo central.

Se consolidaron cuatro componentes fundamentales:

- **Disponibilidad:** continuidad operativa de la plataforma pública durante siete días.
- **Rendimiento y accesibilidad:** optimización de los recursos web y de la experiencia móvil.
- **Funcionamiento:** validación de registro, ingreso, análisis de enlaces, protección familiar y aislamiento entre cuentas.
- **Documentación:** integración de las pruebas, mediciones, procedimientos y evidencias técnicas en el repositorio.

## 2. Resultados oficiales de calidad técnica

| Indicador | Umbral del curso | Resultado final | Evaluación |
|---|---:|---:|---|
| UptimeRobot · 7 días | ≥99% | **99,94%** | Cumple |
| PageSpeed · Rendimiento móvil | ≥70 | **91/100** | Cumple |
| PageSpeed · Accesibilidad móvil | ≥80 | **98/100** | Cumple |
| Flujo central y aislamiento | Sin errores bloqueantes | **12/12 pruebas satisfactorias** | Cumple |
| README y documentación | Completo y sin credenciales | **Consolidado** | Cumple |

**Resultado global:** las cuatro condiciones numeradas del criterio de calidad técnica fueron satisfechas.

### 2.1. Disponibilidad de la plataforma

Se consolidó la medición de disponibilidad mediante UptimeRobot, utilizando el monitor HTTP(S) asociado a la web pública de SmartGuard.

**Ventana evaluada:** 19 al 26 de noviembre de 2026.

La plataforma registró una disponibilidad de **99,94%**, superando el umbral establecido del 99%.

El monitoreo permitió verificar la continuidad del servicio y la accesibilidad de la página de distribución del producto.

La evaluación corresponde a disponibilidad HTTP(S) y se complementó con pruebas funcionales de la aplicación Android.

### 2.2. Rendimiento y accesibilidad

Se ejecutó una nueva evaluación móvil mediante Google PageSpeed Insights.

| Indicador | Entrega 4 | Entrega 5 | Variación |
|---|---:|---:|---:|
| Rendimiento | 84 | **91** | +7 puntos |
| Accesibilidad | 96 | **98** | +2 puntos |

La mejora en rendimiento estuvo asociada con la optimización de la carga inicial, la reducción de recursos innecesarios y la simplificación de la experiencia de navegación.

En accesibilidad se consolidaron mejoras de contraste, legibilidad y estructura de navegación.

Ambos indicadores superaron los umbrales exigidos por la rúbrica.

## 3. Calidad operativa de Android

Se utilizó la instrumentación de rendimiento integrada en SmartGuard para evaluar el comportamiento de las operaciones de análisis y notificación.

La medición final contempló registros de funcionamiento, tiempos de respuesta, resultados de análisis y entrega de alertas.

| Indicador Android | Resultado final | Meta interna |
|---|---:|---:|
| Operaciones observadas | 2.480 | — |
| Salud operativa observada | 99,72% | ≥99% |
| Análisis exitosos | 99,56% | ≥99% |
| Alertas publicadas correctamente | 99,43% | ≥99% |
| Confirmaciones de eventos | 99,64% | ≥99% |
| P95 de análisis | 389 ms | ≤500 ms |
| P95 de publicación de alertas | 690 ms | ≤1.000 ms |

Los resultados muestran estabilidad en las operaciones instrumentadas y tiempos de respuesta inferiores a los límites internos definidos.

El procesamiento de enlaces se mantuvo dentro de los tiempos de referencia establecidos, mientras que las notificaciones conservaron una tasa favorable de publicación.

Estas métricas complementan los indicadores oficiales de la rúbrica y describen específicamente el comportamiento operativo de la aplicación Android.

## 4. Validación funcional de la Beta

La Beta fue evaluada mediante recorridos completos de uso, utilizando cuentas independientes y verificando el acceso a la información.

### 4.1. Pruebas ejecutadas

| Funcionalidad evaluada | Resultado |
|---|---|
| Registro de usuario nuevo | Aprobado |
| Ingreso y recuperación de sesión | Aprobado |
| Análisis manual de enlaces | Aprobado |
| Protección automática y notificaciones | Aprobado |
| Historial de actividad | Aprobado |
| Creación de grupo familiar | Aprobado |
| Incorporación mediante invitación | Aprobado |
| Alertas familiares autorizadas | Aprobado |
| Separación de información entre cuentas | Aprobado |
| Navegación por planes comerciales | Aprobado |
| Funcionamiento en dispositivo móvil | Aprobado |
| Flujo de evaluación en computador | Aprobado |

**Resultado: 12 de 12 pruebas satisfactorias.**

No se identificaron errores bloqueantes durante la ejecución del flujo central.

### 4.2. Seguridad y aislamiento

Se verificó que las cuentas independientes no pudieran consultar información privada perteneciente a otros usuarios.

También se comprobó que el acceso a los grupos familiares dependiera de los mecanismos de autorización correspondientes.

La funcionalidad compartida mantuvo el principio de acceso consentido: los integrantes únicamente podían consultar la información habilitada para su grupo.

## 5. Automatización y verificación del código

SmartGuard conservó su sistema de comprobaciones automatizadas mediante GitHub Actions.

El proceso de integración incluyó revisiones de compilación, TypeScript, reglas Firebase, validación de la lógica familiar y pruebas de regresión.

Entre las evidencias técnicas existentes se incluyen:

- Android Source Check.
- Family Firebase Rules and Web.
- Production Core Checks.
- Family Risk Contract.
- Pricing and Landing Validation.
- Static Preflight.

La utilización de estos procedimientos permitió conservar la consistencia entre los componentes y reducir el riesgo de regresiones funcionales.

Las verificaciones automatizadas se complementaron con las pruebas de usuario y de ejecución sobre dispositivos.

## 6. Consolidación documental

La documentación técnica quedó organizada en el repositorio, conservando la trazabilidad de las entregas anteriores.

Se integraron los procedimientos de medición, definiciones de indicadores, límites de cada herramienta, resultados operativos y guiones de validación.

Se mantuvieron los archivos históricos de la Entrega 4 para permitir la comparación metodológica.

La nueva documentación de la Beta reúne los resultados finales, identifica la versión evaluada y conecta las comprobaciones funcionales con la evidencia de ingeniería.

## 7. Comparación con la Entrega 4

La Entrega 4 permitió desarrollar el sistema de observabilidad e introducir métricas específicas para evaluar una aplicación Android.

En la Entrega 5, el enfoque evolucionó hacia la validación integral de la Beta: se conservaron las herramientas anteriores, se actualizaron los resultados del componente web y se incorporaron pruebas funcionales completas de las características comerciales y familiares.

Los cambios más relevantes fueron la mejora de rendimiento móvil, el fortalecimiento de los controles de acceso y la consolidación de un proceso reproducible de evaluación técnica.

La principal evolución consistió en pasar de **medir el funcionamiento de componentes individuales a evaluar el producto final de manera integral**.

## 8. Conclusión técnica y decisión

Los resultados consolidados permiten concluir que SmartGuard alcanzó los objetivos técnicos establecidos para la Beta.

La plataforma superó los umbrales de disponibilidad, rendimiento y accesibilidad, mientras que los recorridos funcionales demostraron la operación del flujo central y la separación entre usuarios.

La aplicación Android presentó indicadores favorables de procesamiento y entrega de alertas, manteniendo tiempos de respuesta inferiores a los objetivos internos.

**Resultado del criterio de calidad técnica: Excelente (4 de 4 condiciones).**

Desde la perspectiva de ingeniería, SmartGuard cuenta con una base técnica favorable para continuar su evolución. Esta conclusión respalda su viabilidad operativa; la decisión comercial definitiva de Go/No-Go se complementa con los resultados de monetización, Hipótesis 2 y growth loop.
