# @mikiguillamon/n8n-nodes-holded

Community node de n8n para trabajar con Holded.

## Qué incluye

- Autenticación por API key de Holded.
- Operaciones guiadas para recursos habituales:
  - Contacts
  - Products
  - Services
  - Documents
  - Payments
  - Projects
  - Tasks
  - Leads
  - Bookings
  - Accounting Accounts
- Operación `Custom API Request` para cubrir cualquier endpoint de Holded sin esperar a que exista una acción dedicada en el nodo.

## Enfoque

La API de Holded es amplia y cambia con el tiempo. Este paquete combina dos capas:

1. Operaciones guiadas para los flujos más frecuentes.
2. Una petición API personalizada para cubrir el resto de endpoints y casos avanzados.

Con esto el nodo es usable desde el primer momento y, a la vez, no se queda corto cuando Holded añade o ajusta endpoints.

## Credenciales

Holded autentica las peticiones enviando la API key en la cabecera `key`.

## Instalación en n8n

En una instancia self-hosted de n8n:

1. Ve a `Settings > Community Nodes`.
2. Selecciona `Install`.
3. Introduce el paquete `@mikiguillamon/n8n-nodes-holded`.
4. Acepta el aviso de instalación de código no verificado.
5. Reinicia n8n si tu despliegue lo requiere.

Después, busca el nodo `Holded` en el editor de workflows.

## Desarrollo local

```bash
npm install
npm run lint
npm run build
npm run dev
```

## Notas

- El nodo usa la URL base `https://api.holded.com`.
- Las operaciones de creación y actualización aceptan `Body JSON` para no limitar los campos que expone Holded en cada recurso.
- Para endpoints no modelados explícitamente, usa `Custom API Request`.
