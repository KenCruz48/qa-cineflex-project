# CineFlex - QA en producción

**Video de sustentación (máximo 3 minutos): pendiente de grabación y enlace público por el equipo.**

[![CineFlex QA](https://github.com/KenCruz48/qa-cineflex-project/actions/workflows/qa-pipeline.yml/badge.svg)](https://github.com/KenCruz48/qa-cineflex-project/actions/workflows/qa-pipeline.yml)

Laboratorio completo de venta de entradas con frontend, API REST, SQLite y pruebas automatizadas. Funciona con código y bibliotecas, sin servicios ni dependencias de inteligencia artificial. El banco es un stub determinista: no procesa dinero real.

## Instalación y ejecución

Requisitos: Node.js **24 o posterior**, npm y Git. Para UI: Google Chrome instalado (Selenium Manager obtiene el driver; requiere internet la primera vez). Para carga: Java 17+ y Apache JMeter 5.6.3.

```sh
git clone https://github.com/KenCruz48/qa-cineflex-project.git
cd qa-cineflex-project
npm ci
npm start
```

Abrir **http://127.0.0.1:3000**. Express sirve frontend y API desde el mismo origen. No se necesita Live Server.

| Dato de prueba | Valor |
|---|---|
| Correo | `qa@cineflex.test` |
| Contraseña | `CineFlex2026!` |
| Tarjeta aprobada | `4111111111111111` |
| Tarjeta rechazada | `4000000000000002` |
| Bloqueo | 3 fallos, 60 segundos |
| JWT | 30 minutos, revocable con logout |

El arranque normal persiste tickets en `backend/cineflex.sqlite`, excluido de Git. Para una demo nueva se puede usar una base en memoria:

```powershell
# PowerShell
$env:DB_PATH=':memory:'
npm start
```

```sh
# Linux/macOS
DB_PATH=:memory: npm start
```

Variables opcionales: `PORT`, `DB_PATH`, `JWT_SECRET`. Sin `JWT_SECRET`, el proceso genera una clave aleatoria. Las sesiones se invalidan al reiniciar. El servidor escucha únicamente en loopback.

También se puede instalar y arrancar el backend de forma independiente con `cd backend`, `npm install`, `npm start` o `npm run dev` (nodemon). La instalación recomendada desde la raíz usa el lockfile reproducible.

## Arquitectura

```text
qa-cineflex-project/
├── README.md
├── estrategia_pruebas.pdf
├── backend/
│   ├── server.js           # Arranque y cierre
│   ├── app.js              # Express, Helmet, Morgan, JWT, SQLite
│   ├── paymentStub.js      # Contrato simulado del banco
│   └── package.json
├── frontend/
│   ├── index.html         # IDs y formularios accesibles
│   ├── styles.css
│   └── app.js
├── api_tests/
│   ├── CineFlex_API_Collection.json
│   └── CineFlex_Environment.json
├── ui_tests/
│   ├── pages/             # BasePage, LoginPage, CarteleraPage, ReservaPage
│   └── test_suite.js      # Todas las aserciones
├── tests/api.test.js      # Integridad, concurrencia y bloqueo
├── performance/
│   └── prueba_carga.jmx
├── docs/                  # Evidencias y guía de sustentación
└── .github/workflows/qa-pipeline.yml
```

El stub devuelve aprobado/rechazado. Un pago rechazado nunca crea el ticket; el precio se calcula en servidor. La restricción relacional `UNIQUE(movie_id, seat)` protege contra doble venta. No se almacenan tarjetas. Los importes son pesos colombianos enteros.

## API

Base: `/api/v1`. Excepto login y `/api/health`, se exige `Authorization: Bearer <token>`.

| Método | Ruta | Resultado |
|---|---|---|
| POST | `/auth/login` | JWT con credenciales de demo; 401 incorrectas, 423 bloqueo |
| GET | `/movies` | Catálogo de tres películas |
| GET | `/movies/:id/seats` | 18 asientos con estado de ocupación |
| POST | `/reservations` | `{movieId:1,seat:"A1",card:"4111111111111111"}`; 201 con ticket |
| POST | `/auth/logout` | 204 e invalidación del JWT |

Reservas: 400 datos inválidos, 402 tarjeta rechazada, 404 película inexistente y 409 asiento ocupado. Helmet configura cabeceras y Morgan registra método, ruta, estado y duración sin el cuerpo del pago. Se usa `Cache-Control: no-store`.

## Ejecutar pruebas

```sh
# No requiere servidor: usa bases aisladas
npm test

# Requiere npm start en otra terminal
npm run test:api

# Levanta su propia API con SQLite en memoria y datos nuevos
npm run test:ui
```

Para ver Chrome, ejecutar `$env:HEADLESS='false'` en PowerShell o `HEADLESS=false npm run test:ui` en Linux/macOS. `BASE_URL` permite apuntar Selenium a otro servidor: ese entorno debe tener A1 libre y no debe compartirse con una ejecución simultánea. Por defecto cada ejecución es aislada y repetible.

La colección de Postman importa el JWT dinámicamente, comprueba el SLA de cartelera inferior a 300 ms y valida rechazo bancario sin consumir inventario. Son **7 peticiones y 22 aserciones**. Importar ambos JSON en Postman y seleccionar el entorno CineFlex Local para ejecución manual.

Selenium ejecuta **19 casos secuenciales**: formulario, correo requerido, contraseña oculta, credenciales incorrectas, bloqueo al tercer fallo, login y título Cartelera, catálogo, filtro y restauración, apertura de reserva, pago deshabilitado sin asiento, selección, tarjeta falsa, compra E2E, asiento vendido, regreso, logout, Atrás y acceso directo sin sesión. Los Page Objects contienen acciones, lecturas y esperas; las aserciones están únicamente en la suite. Un fallo guarda captura en `reports/` y termina con código de error.

Supertest verifica controles de API, rechazo sin ocupar asiento, cálculo de precio, revocación, bloqueo y recuperación. Diez compras concurrentes del mismo asiento deben producir exactamente una venta y nueve conflictos.

## Rendimiento con JMeter

Abrir `performance/prueba_carga.jmx` en JMeter. El Thread Group configura **500 usuarios** y **ramp-up de 15 segundos**. Cada usuario inicia sesión, extrae su JWT y consulta `/api/v1/movies/1/seats` con Bearer. El plan incluye Summary Report y aserción HTTP 200 sobre asientos.

Ejecutar con el servidor activo:

```sh
jmeter -n -t performance/prueba_carga.jmx -l reports/carga.jtl -e -o reports/carga-html
```

Crear `reports/` antes de ejecutar. Cada ejecución debe usar nombres de salida nuevos o una carpeta de informe vacía. Parámetros opcionales: `-Jhost=127.0.0.1 -Jport=3000`.

La configuración de 500 hilos con peticiones breves no prueba que 500 conexiones estén activas exactamente al mismo tiempo. Para pruebas sostenidas hay que extender duración/iteraciones y medir concurrencia observada. Los resultados son de este mock en localhost y no certifican capacidad de producción.

Ver [evidencias y resultados](docs/resultados.md).

## Continuous Testing

GitHub Actions ejecuta con cada push y pull request: instalación `npm ci`, Supertest, arranque con healthcheck, Newman y Selenium. Un fallo marca el job `qa` como fallido y conserva diagnósticos.

**Para impedir merges con fallos:** en GitHub, Settings → Rules → Rulesets, crear una regla para `main`, exigir pull request y el status check `qa`. El YAML por sí solo no impide un merge manual o administrativo. No se ha modificado la política de protección del repositorio.

## Entrega y limitaciones

- [Estrategia de pruebas, Fase A](estrategia_pruebas.pdf): Top-Down, stub, requisitos, regresión y Selenium frente a Cypress.
- [Guía para video de 3 minutos](docs/sustentacion.md). El equipo debe grabarlo, publicarlo y colocar el enlace al inicio de este README.
- Credenciales de demo y sesiones/contadores en memoria: el sistema es un laboratorio. Una implantación real necesita contraseñas con hash, sesiones compartidas, TLS, rate limiting y gestión de cobros idempotentes.
- `npm audit --omit=dev` no reportó vulnerabilidades al validar la entrega. La auditoría completa reportó 22 alertas transitivas en herramientas de desarrollo (Newman/nodemon), incluida una crítica. `npm audit fix` no ofreció corrección compatible. No ejecutar colecciones de fuentes desconocidas; revisar actualizaciones antes de uso fuera de este laboratorio.
