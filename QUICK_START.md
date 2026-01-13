# ⚡ QUICK REFERENCE - Línea de Comandos

## 🚀 Startup (Primero lo primero)

```bash
# Terminal 1: Backend
cd /ruta/a/backend
npm start

# Terminal 2: Frontend
cd /ruta/a/frontend
npm run dev
```

---

## 🔍 Testing

### Test 1: ¿Backend responde?
```bash
# En cualquier terminal
curl http://localhost:3000/api/areas
# Esperado: [{"id":1,"nombre":"..."}]
```

### Test 2: ¿Frontend en Vite?
```
Abre navegador: http://localhost:5173
```

### Test 3: ¿Logs en Console?
```
F12 → Console → busca "🔄 Fetching"
```

---

## 🐛 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Cannot GET /api/areas" | Backend no tiene endpoint, revisar routes |
| "Failed to fetch" | Backend no está corriendo en puerto 3000 |
| "Unexpected token '<'" | Backend retorna HTML (error 500) |
| "CORS error" | Proxy no activo, recarga frontend |
| "No content found" | BD vacía o IDs inválidos |

---

## 📊 Verificación Rápida

```bash
# ¿Qué puerto usa frontend?
netstat -tuln | grep 5173

# ¿Qué puerto usa backend?
netstat -tuln | grep 3000

# ¿Está corriendo Node.js?
ps aux | grep node

# ¿Está corriendo npm?
ps aux | grep npm
```

---

## 🎯 Lo Más Importante

1. **Backend en puerto 3000:**
   ```bash
   npm start
   ```

2. **Frontend en puerto 5173:**
   ```bash
   npm run dev
   ```

3. **F12 → Console:**
   - Ver 🔄 Fetching ← significa que intenta conectar
   - Ver ✅ Loaded ← significa ÉXITO
   - Ver ❌ Error ← hay problema, revisar logs

4. **Si no funciona:**
   - Copia los logs exactos de Console
   - Copia el Response de Network (F12 → Network)
   - Verifica puerto con `netstat` o `lsof`

---

## 📝 Código Key para Copiar

### Validación Simple
```typescript
if (!response.ok) throw new Error(`HTTP ${response.status}`);
const data = await response.json();
```

### Validación Completa
```typescript
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const contentType = response.headers.get('content-type');
if (!contentType?.includes('application/json')) {
  throw new Error(`Invalid content type: ${contentType}`);
}

const data = await response.json();
```

### Try-Catch-Fallback
```typescript
try {
  // fetch + validación
  setData(realData);
} catch (error) {
  console.error('❌', error);
  setData(FALLBACK_DATA);
}
```

---

## 🔧 Cambios de Configuración

### Si backend en otro puerto
**File:** `vite.config.ts`
```typescript
target: 'http://localhost:4000', // cambiar aquí
```

### Si quieres rutas absolutas
**File:** `DashboardScreen.tsx` y `SubjectContentScreen.tsx`
```typescript
const API_BASE_URL = 'http://localhost:3000/api';
```

---

## 📋 Checklist Final

- [ ] Backend corre en 3000
- [ ] Frontend corre en 5173
- [ ] Console muestra logs
- [ ] Network muestra 200 OK
- [ ] Response es JSON válido
- [ ] UI muestra datos o fallback
- [ ] Error visible si falla
- [ ] Sin errores en Console (excepto figma image)

**Listo cuando:** Todos los checkboxes ✅

---

## 🎓 Si Algo Falla Todavía

Proporciona:
1. Logs exactos de Console (F12)
2. Response de Network (F12 → Network)
3. Resultado de `curl http://localhost:3000/api/areas`
4. Qué puerto ves en "Local:" cuando inicia Vite

