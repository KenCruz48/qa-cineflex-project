# Evidencias de ejecución

Fecha de validación: 15 de octubre de 2026. Entorno local Windows, Node.js 24.15.0, Chrome con Selenium WebDriver, SQLite en memoria.

| Verificación | Resultado local |
|---|---|
| Supertest | 2 escenarios de integración aprobados; incluyen 10 compras concurrentes con una venta y nueve conflictos |
| Postman / Newman | 7 peticiones, 22 aserciones, cero fallos |
| SLA de cartelera en Newman | 5 ms en la ejecución inicial; umbral exigido menor a 300 ms |
| Selenium / POM | 19 de 19 casos aprobados |
| Auditoría de dependencias de producción | 0 vulnerabilidades reportadas |

Las mediciones locales no son una garantía de tiempos en internet o en producción. Las pruebas de UI levantan datos nuevos y no alteran la base de la demo.
