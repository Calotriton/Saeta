# Saeta · Forja de flechas tradicionales

Web estática (ES/EN, modo día/noche) que guía a un arquero novato para fabricar sus propias flechas de arquería tradicional:

- **Constructor en 8 pasos**: arco → material → astil → punta → culatín → emplumado → acabados → resumen.
- **Cálculos**: apertura (medida o estimada por envergadura/altura), potencia real a tu apertura, longitud de corte (apertura + 1"), spine recomendado (madera en libras, carbono por número, aluminio Easton, fibra de vidrio), peso de punta (reglas del manual del club), peso total, GPP, FOC y velocidad estimada.
- **Visualización** 2D (SVG) en tiempo real y 3D (three.js, se carga al pulsar "3D").
- **Lista de la compra** con enlaces a 32 tiendas europeas verificadas, **guía de fabricación** por material, **glosario** y tablas del manual.
- Configuración compartible por enlace, imprimible y exportable a JSON. Sin cookies ni rastreo (solo `localStorage` para recordar idioma, tema y la última flecha).

- **Mi carcaj**: galería de flechas guardadas, tiendas favoritas, país preferido y datos de arquero por defecto. Todo se guarda en el navegador (sin cuentas); se puede exportar/importar una copia en JSON.

## Publicación

Web: **https://calotriton.github.io/Saeta/** (GitHub Pages desde la rama `main`, carpeta raíz).
Para activarla: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.

No hace falta compilar nada: es HTML, CSS y JavaScript plano. También funciona abriendo `index.html` directamente.

## Estructura

```
index.html            portada (generada)
constructor.html      constructor (generada)
carcaj.html           mi carcaj (generada)
guia.html             guía + tutorial 3D (generada)
tiendas.html          tiendas (generada)
glosario.html         glosario (generada)
acerca.html           acerca de (generada)
src/layout.html       plantilla común: cabecera, menú, pie, scripts
src/pages/*.html      contenido de cada página
tools/build-pages.js  genera las páginas HTML desde src/
js/tutorial3d.js      tutorial 3D paso a paso (madera)
css/styles.css        estilos (tokens de tema día/noche)
js/i18n.js            textos de la interfaz ES/EN
js/catalog.js         catálogo curado de componentes y compatibilidades
js/calc.js            motor de cálculo (spine, pesos, FOC, velocidad)
js/viz2d.js           renderizador SVG de la flecha
js/viz3d.js           visor 3D (three.js desde unpkg, carga diferida)
js/app.js             estado, asistente, guía, tiendas, glosario
js/data/*.js          datos generados desde research/*.json
research/             investigación de los agentes (JSON + resúmenes con fuentes)
assets/               logo pixel art y favicons
tools/build-data.js   regenera js/data/*.js desde research/*.json
tools/logo.py         genera el logo pixel art (requiere Pillow)
Documentos/           manual del club (solo en local; excluido del repo por .gitignore)
```

### Editar páginas

Las páginas `*.html` de la raíz se generan: edita `src/layout.html` (común) o `src/pages/*.html` y ejecuta:

```bash
node tools/build-pages.js
```

### Actualizar datos

Edita los JSON de `research/` (tiendas, componentes, arcos, proceso) y ejecuta:

```bash
node tools/build-data.js
```

## Fuentes y avisos

- Reglas de cálculo del manual del *Curs de Tecnificació Bàsic* del Club Vall-Llobera Terra d’Arquers (longitud = apertura + 1", peso mínimo 8–9 gr/lb, punta ≈ peso ÷ 3 madera / ÷ 2,5 carbono, tablas del Anexo I), más tablas de 3Rivers y Easton. Detalle y enlaces en `research/*.md`.
- Todos los resultados son **estimaciones**: haz siempre una prueba de *bare shaft* antes de fabricar una docena.
- Saeta no tiene relación comercial con ninguna tienda.
