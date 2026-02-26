<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Trello Table Master Power-Up

Power-Up para Trello que, dentro de una tarjeta de control, muestra una tabla con sus tarjetas asociadas y permite guardar una nota por cada una.

## Ejecutar en local

**Requisitos previos:** Node.js


1. Instala dependencias:
   `npm install`
2. Configura `VITE_TRELLO_API_KEY` en `.env.local` con tu API key de Trello (https://trello.com/app-key)
3. Ejecuta la app:
   `npm run dev`

## Usar como Power-Up de Trello

1. Despliega la app en Vercel.
2. En Trello, abre el panel de administración de Power-Ups y crea/edita un Power-Up personalizado.
3. Configura la **Iframe Connector URL** en:
   `https://YOUR-VERCEL-DOMAIN.vercel.app/power-up.js`
4. En **Capabilities**, habilita al menos **Card Back Section**.
5. Añade el Power-Up a tu tablero.
6. Abre una tarjeta de control: el Power-Up renderiza la tabla en la sección trasera de la tarjeta.
7. Edita una nota por cada tarjeta asociada; las notas se cargan de nuevo cada vez que se abre la tarjeta.

## Notas importantes para Vercel

- Este proyecto funciona sin rutas Express para las funcionalidades runtime del Power-Up.
- `power-up.js` y el callback OAuth se sirven como archivos estáticos desde `public/`.
- Las notas se guardan en el almacenamiento compartido del Power-Up de Trello (`t.set`/`t.get`), con alcance por tarjeta de control.
- `vercel.json` incluye rewrites SPA hacia `index.html` para compatibilidad con rutas del cliente.
- La app es solo Power-Up; fuera de Trello muestra una pantalla informativa.
