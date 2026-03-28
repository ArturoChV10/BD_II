# 🚀 COMO EJECUTAR TODO DESDE GITHUB

## Opción 1: Si YA Tienes la Carpeta BD_II (La Más Rápida)

Solo haz:

```powershell
cd C:\Users\Admin\Downloads\BD_II-main\BD_II-main
git pull origin main
```

Listo. Ya tienes los cambios.

---

## Opción 2: Si NO Tienes la Carpeta (Descargar desde GitHub)

### Paso 1: Ve a tu carpeta de Descargas

```powershell
cd C:\Users\Admin\Downloads
```

### Paso 2: Clona el repositorio

```powershell
git clone https://github.com/ArturoChV10/BD_II.git
```

Presiona Enter y espera.

### Paso 3: Ve a la carpeta

```powershell
cd BD_II
```

---

## AHORA: EJECUTA LA API

### Terminal 1: Inicia la API

```powershell
cd restaurant-reservations
docker compose up
```

Espera a ver: `Servidor corriendo en puerto 3000`

---

### Terminal 2: Prueba que funciona

```powershell
cd C:\Users\Admin\Downloads\BD_II-main\BD_II-main
Invoke-WebRequest http://localhost:3000/ | Select-Object -Expand Content
```

Deberías ver:
```json
{"message":"API de Reserva de Restaurantes"}
```

---

### Terminal 3: Ejecuta los Tests

```powershell
cd C:\Users\Admin\Downloads\BD_II-main\BD_II-main
docker build -f Dockerfile.test -t restaurant-api:tests .
docker run --rm restaurant-api:tests
```

Deberías ver:
```
✅ Test Suites: 5 passed, 5 total
✅ Tests: 27 passed, 27 total
```

---

## ¿Qué Comando Usar?

**SI ya tienes BD_II en Descargas:**
```powershell
git pull origin main
```

**SI no tienes nada:**
```powershell
git clone https://github.com/ArturoChV10/BD_II.git
```

Eso es todo.
