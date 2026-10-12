# Lista manual: sitios legítimos en hosting gratuito (2026-10-11)

## Por qué existe esta lista

Tranco rankea por dominio registrable. Para plataformas de hosting gratuito
(`vercel.app`, `github.io`, etc.) eso casi siempre devuelve la plataforma
completa (`vercel.app` a secas), no los inquilinos individuales
(`miapp.vercel.app`) — y la plataforma en sí casi nunca entra al top 1
millón por su propio tráfico. Filtrar el top 1M de Tranco por sufijo
privado de la PSL dio **1 resultado real** sobre ~20 candidatos de
plataformas conocidas. No hay forma de resolver esto filtrando Tranco
distinto: hace falta otra fuente.

## Cómo se eligieron (antes de correr el detector, nunca después)

1. Se generaron candidatos de memoria/búsqueda por plataforma
   (`vercel.app`, `netlify.app`, `github.io`, `pages.dev`, `web.app`,
   `gitbook.io`, `herokuapp.com`, y `surge.sh` como variante adicional).
2. Cada candidato se visitó con el navegador **antes** de tocar el motor de
   detección, para confirmar que carga y es un sitio real (no un 404, no
   una página de "sitio no encontrado" de la plataforma).
3. Se descartó cualquier candidato que redirigiera a un dominio
   **distinto** del propio subdominio de la plataforma (por ejemplo
   `swr.vercel.app` redirige a `vercel.com/oss/swr`: no sirve para esta
   categoría, aunque sea un sitio real).
4. Se evitaron nombres que contuvieran una marca conocida en el
   subdominio (para no mezclar esta señal con la de imitación de marca).
5. Se buscó variedad: documentación, portafolios/plantillas, proyectos de
   código abierto, apps de demostración.

## Plataformas que NO dieron resultados verificables

- **`web.app` (Firebase Hosting):** todos los candidatos probados
  (proyectos con sufijos aleatorios típicos de Firebase) devolvieron
  "Site Not Found". Los IDs de proyecto de Firebase incluyen un sufijo
  aleatorio que no se puede adivinar de memoria, y no se encontró un
  directorio público de sitios de ejemplo.
- **`gitbook.io`:** la documentación publicada en GitBook se movió
  mayormente a dominios propios o a `app.gitbook.com/s/...`; el patrón
  `proyecto.gitbook.io` parece ser hoy sobre todo legado (y, según lo que
  reportó quien pidió este banco de datos, sigue siendo usado para
  páginas de phishing reales, como `metamaskuxlogen.gitbook.io` en el
  propio feed de OpenPhish — el patrón no murió, solo el uso legítimo
  visible de él).
- **`herokuapp.com`:** todos los candidatos probados devolvieron "No such
  app". Heroku eliminó su capa gratuita en noviembre de 2022; la mayoría
  de las apps gratuitas de esa época ya no existen.

Estos tres huecos son, en sí mismos, un hallazgo: los patrones de hosting
gratuito que hoy tienen más presencia de phishing activo (`gitbook.io`
confirmado en el propio feed) son también los que tienen menos presencia
legítima fácil de encontrar — justo lo opuesto de lo que convendría para
entrenar una señal equilibrada.

## ⚠️ Esto NO es una muestra representativa

- Es una lista elegida a mano de ~29 sitios, no una muestra aleatoria ni
  exhaustiva de "hosting gratuito legítimo en general".
- Está sesgada hacia proyectos de desarrollo web (demos de frameworks de
  JavaScript, plantillas), porque es lo que mejor se puede verificar desde
  una búsqueda de texto — probablemente sub-representa portafolios
  personales comunes, blogs reales de gente no técnica, y sitios en
  idiomas distintos del inglés.
- El tamaño (29, no cientos) significa que ninguna métrica calculada
  sobre esta categoría específica tiene significancia estadística fuerte
  — por eso el Paso 4 limita el peso máximo que puede aportar esta señal
  por sí sola.

## La lista (29 URLs, todas visitadas y confirmadas el 2026-10-11)

| URL | Plataforma | Categoría |
|---|---|---|
| https://pmc-landing-page-antes-de-abrir.vercel.app | vercel.app | este mismo proyecto |
| https://nextjs-commerce.vercel.app | vercel.app | demo app |
| https://react-photo-view.vercel.app | vercel.app | proyecto de código abierto |
| https://ai-sdk-preview-roundtrips.vercel.app | vercel.app | demo app |
| https://ai-sdk-preview-internal-knowledge-base.vercel.app | vercel.app | demo app |
| https://vercel-og-examples.vercel.app | vercel.app | demo app |
| https://next-forms.vercel.app | vercel.app | demo app |
| https://app-router.vercel.app | vercel.app | demo app |
| https://ai-sdk-preview-attachments.vercel.app | vercel.app | demo app |
| https://commerce-shopify.vercel.app | vercel.app | demo app |
| https://nextjs-blog-starter.vercel.app | vercel.app | plantilla/blog |
| https://pmndrs.github.io/zustand/ | github.io | documentación |
| https://remarkjs.github.io/react-markdown/ | github.io | proyecto de código abierto |
| https://nodejs.github.io/node-addon-examples/ | github.io | documentación |
| https://webpack.github.io/analyse/ | github.io | proyecto de código abierto |
| https://karma-runner.github.io/6.4/index.html | github.io | documentación |
| https://jgraph.github.io/drawio/ | github.io | proyecto de código abierto |
| https://videojs.github.io/video.js/ | github.io | proyecto de código abierto |
| https://tailwindcss.netlify.app | netlify.app | demo/ejercicio |
| https://react-tetris-game.netlify.app | netlify.app | demo app |
| https://markdown-to-pdf.netlify.app | netlify.app | demo app |
| https://kanbanboard-react.netlify.app | netlify.app | demo app |
| https://todo-app-react-redux.netlify.app | netlify.app | demo app |
| https://react-weather-app-demo.netlify.app | netlify.app | demo app |
| https://chartjs-react-demo.netlify.app | netlify.app | demo app |
| https://astro-docs.pages.dev | pages.dev | documentación |
| https://nuxt-content-docs.pages.dev | pages.dev | documentación |
| https://react-boilerplate.surge.sh | surge.sh | plantilla |
| https://redux-todomvc.surge.sh | surge.sh | demo app |

Nota sobre la URL del proyecto: la que se dio originalmente
(`pmc-landing-page-antes-de-abrir-ejnrww44k.vercel.app`) es un despliegue
de vista previa protegido con login de Vercel (no carga sin iniciar
sesión). Se usó en su lugar el alias estable de producción
(`pmc-landing-page-antes-de-abrir.vercel.app`), que sí es público.
