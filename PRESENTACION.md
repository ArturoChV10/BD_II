# 🎬 GUÍA PARA PRESENTAR Y PROBAR UNO A UNO

## ANTES DE EMPEZAR

Asegúrate que:
1. Docker Desktop está abierto
2. Git está instalado
3. Tienes el proyecto clonado

---

## PASO 1: Verificar que Tienes el Código

En PowerShell:

```powershell
cd C:\Users\Admin\Downloads\BD_II-main\BD_II-main
git pull origin main
```

Presiona Enter.

Deberías ver: `Already up to date` (significa que tienes lo último)

---

## PASO 2: Ver los Cambios que Subí

En la **misma** PowerShell:

```powershell
git log --oneline -3
```

Presiona Enter.

**Deberías ver:**
```
f8626ed Add quick guide for running from GitHub
26ad342 Configure Jest tests - enable npm test script
9c0d1ed Merge branch 'main'
```

Esto prueba que los cambios están en tu máquina.

---

## PASO 3: Ver QUÉ CAMBIÉ EXACTAMENTE

```powershell
git show 26ad342
```

Presiona Enter.

**Verás:**
```
commit 26ad342c50be9ebfa29f0c255b09960e4d08e934
Author: Test User
Date:   Fri Mar 27 20:05:44 2026 -0600

    Configure Jest tests - enable npm test script

diff --git a/restaurant-reservations/jest.config.js b/restaurant-reservations/jest.config.js
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/restaurant-reservations/jest.config.js
@@ -0,0 +1,5 @@
+module.exports = {
+  testEnvironment: 'node',
+  testMatch: ['**/tests/**/*.test.js'],
+  testPathIgnorePatterns: ['/node_modules/']
+};

diff --git a/restaurant-reservations/package.json b/restaurant-reservations/package.json
index fc2c32a..f4d0441 100644
--- a/restaurant-reservations/package.json
+++ b/restaurant-reservations/package.json
@@ -6,7 +6,7 @@
   "scripts": {
     "start": "node src/server.js",
     "dev": "nodemon src/server.js",
-    "test": "echo \"Error: no test specified\" && exit 1"
+    "test": "jest"
   },
```

Esto muestra exactamente qué cambié:
- ✅ Creé `jest.config.js`
- ✅ Cambié el script de test en `package.json`

---

## PASO 4: DEMO EN VIVO - Ejecuta los Tests

### ABRIR 2 POWERSHELLS NUEVAS

#### PowerShell #1: Iniciar la API

```powershell
cd C:\Users\Admin\Downloads\BD_II-main\BD_II-main\restaurant-reservations
docker compose up
```

Presiona Enter y espera.

**Verás:**
```
[+] Running 2/2
 ✔ Container bd_ii-api-1    Started
 ✔ Container bd_ii-db-1     Started
api  | Servidor corriendo en puerto 3000
```

✅ **La API está funcionando**

**NO CIERRES ESTA TERMINAL**

---

#### PowerShell #2: Ejecutar los Tests

```powershell
cd C:\Users\Admin\Downloads\BD_II-main\BD_II-main
docker build -f Dockerfile.test -t restaurant-api:tests .
```

Presiona Enter y espera 1-2 minutos.

Cuando termine, verás:
```
#12 DONE 8.9s
View build details: docker-desktop://dashboard/build/...
```

Luego ejecuta:

```powershell
docker run --rm restaurant-api:tests
```

Presiona Enter.

**Deberías ver esto (PERFECTO PARA PRESENTAR):**

```
PASS tests/auth.test.js (5.333 s)
  ✓ POST /auth/register crea un cliente correctamente
  ✓ POST /auth/register devuelve 400 si el email ya existe
  ✓ POST /auth/login devuelve 400 si faltan datos
  ✓ POST /auth/login devuelve 401 si la contraseña es incorrecta
  ✓ POST /auth/login devuelve token si las credenciales son correctas

PASS tests/menus.test.js (5.311 s)
  ✓ GET /menus devuelve la lista
  ✓ POST /menus devuelve 401 sin token
  ✓ POST /menus devuelve 403 si el usuario no es admin
  ✓ POST /menus crea menú si el admin pertenece al restaurante
  ✓ PUT /menus/:id devuelve 404 si el menú no existe
  ✓ DELETE /menus/:id devuelve 403 si el admin no pertenece al restaurante
  ✓ (más tests)

PASS tests/orders.test.js (5.426 s)
  ✓ POST /orders devuelve 400 si faltan datos
  ✓ POST /orders devuelve 404 si el restaurante no existe
  ✓ POST /orders devuelve 400 si un plato no existe
  ✓ POST /orders crea el pedido correctamente
  ✓ GET /orders/:id devuelve 404 si no existe
  ✓ GET /orders/:id devuelve 403 si no es dueño ni admin
  ✓ GET /orders/:id devuelve el pedido si es el dueño

PASS tests/reservations.test.js (5.351 s)
  ✓ POST /reservations devuelve 400 si faltan datos
  ✓ POST /reservations crea una reserva
  ✓ DELETE /reservations/:id devuelve 404 si no existe
  ✓ DELETE /reservations/:id devuelve 403 si no es dueño ni admin
  ✓ DELETE /reservations/:id cancela la reserva si es el dueño

PASS tests/restaurants.test.js (5.215 s)
  ✓ GET /restaurants lista restaurantes
  ✓ POST /restaurants devuelve 403 si no hay autorización
  ✓ POST /restaurants devuelve 409 si el nombre ya existe
  ✓ POST /restaurants crea restaurante con setup key

═════════════════════════════════════════════════════════════
Test Suites: 5 passed, 5 total
Tests:       27 passed, 27 total
Snapshots:   0 total
Time:        6.935 s
═════════════════════════════════════════════════════════════
```

✅ **TODOS LOS 27 TESTS PASANDO - PERFECTO PARA PRESENTAR**

---

## PASO 5: PROBAR LA API EN VIVO

En **otra PowerShell NUEVA**:

```powershell
curl http://localhost:3000/
```

O en PowerShell Windows:

```powershell
Invoke-WebRequest http://localhost:3000/ | Select-Object -Expand Content
```

Presiona Enter.

**Deberías ver:**
```json
{"message":"API de Restaura de Restaurantes"}
```

✅ **LA API RESPONDE CORRECTAMENTE**

---

## RESUMEN PARA PRESENTAR

Tienes 3 demostraciones:

### Demo 1: Git - Ver los cambios
```powershell
git show 26ad342
```
Muestra exactamente qué archivos cambiaron.

### Demo 2: API Funcionando
```powershell
curl http://localhost:3000/
```
Muestra que la API responde correctamente.

### Demo 3: Tests Pasando
```powershell
docker run --rm restaurant-api:tests
```
Muestra que todos 27 tests pasan.

---

## 🎬 ORDEN RECOMENDADO PARA PRESENTAR

1. **Primero:** Muestra el código cambió
   ```
   git show 26ad342
   ```

2. **Segundo:** Muestra la API funcionando
   ```
   Invoke-WebRequest http://localhost:3000/ | Select-Object -Expand Content
   ```

3. **Tercero:** Muestra los tests pasando
   ```
   docker run --rm restaurant-api:tests
   ```

---

## 📋 CHECKLIST ANTES DE PRESENTAR

- [ ] Docker Desktop está abierto
- [ ] Hice `git pull origin main`
- [ ] PowerShell #1: `docker compose up` (API corriendo)
- [ ] PowerShell #2: Vi los cambios con `git show 26ad342`
- [ ] PowerShell #3: Probé API con `curl localhost:3000/`
- [ ] PowerShell #4: Ejecuté tests con `docker run --rm restaurant-api:tests`
- [ ] Todos los 27 tests pasaron ✅

---

## 💡 TIPS PARA LA PRESENTACIÓN

1. **Mantén PowerShell #1 visible** - Muestra que la API está corriendo
2. **Ten los comandos listos** - Cópialos y pégalos, no los escribas
3. **Explica lo que ves** - "27 tests pasando", "API respondiendo"
4. **Si algo falla** - Muestra los logs: `docker compose logs -f`

---

**Eso es todo. Ejecuta uno a uno y verás que funciona perfecto.** ✅
