# Guía de Tests - Planning V2

Este proyecto incluye tests unitarios (Vitest + React Testing Library) y tests E2E (Playwright) para el módulo Planning V2.

## 🧪 Tests Unitarios (RTL)

### Ejecutar tests unitarios

```bash
# Ejecutar todos los tests
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con UI
npm run test:ui

# Ejecutar tests con coverage
npm run test:coverage
```

### Estructura de tests unitarios

```
src/modules/planning_v2/components/
└── catalog/
    └── __tests__/
        └── NewSubpartidaFromTUDialog.test.tsx
```

### Tests implementados

#### `NewSubpartidaFromTUDialog.test.tsx`

Valida que el diálogo "Agregar Subpartida" funciona correctamente:

- ✅ Renderiza el diálogo cuando está abierto
- ✅ Muestra alerta cuando no hay `tu_partida_id`
- ✅ Renderiza el combobox de subpartidas con opciones
- ✅ Dispara `onValueChange` con el ID correcto
- ✅ Renderiza el combobox de proveedores con opciones reales
- ✅ Muestra valores por defecto de honorarios y desperdicio
- ✅ Muestra botones de cancelar y agregar concepto

## 🎭 Tests E2E (Playwright)

### Ejecutar tests E2E

```bash
# Instalar navegadores de Playwright (primera vez)
npx playwright install

# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar tests E2E en modo UI
npm run test:e2e:ui

# Ejecutar tests E2E con debug
npm run test:e2e:debug

# Ver reporte HTML de tests
npx playwright show-report
```

### Estructura de tests E2E

```
e2e/
└── planning-v2-catalogo.spec.ts
```

### Tests E2E implementados

#### `planning-v2-catalogo.spec.ts`

Valida el flujo completo del módulo Catálogo:

1. **Crear presupuesto con 2 Mayores TU**
   - Crea un nuevo presupuesto
   - Agrega 2 Mayores del catálogo TU
   - Verifica que se guardan correctamente

2. **Ver 2 headers en vista Catálogo**
   - Navega a la vista Catálogo
   - Verifica que hay 2 headers de grupo (uno por Mayor)

3. **Crear Partida bajo Mayor A**
   - Crea una nueva Partida bajo el primer Mayor
   - Verifica que aparece en la tabla

4. **Agregar Subpartida**
   - Agrega una Subpartida a la Partida creada
   - Llena los campos requeridos (unidad, cantidad, precio)
   - Selecciona un proveedor del combobox
   - Verifica que la Subpartida aparece en la tabla

5. **Verificar dropdown de proveedores**
   - Abre el combobox de proveedores
   - Verifica que muestra proveedores reales
   - Verifica que los dropdowns tienen background opaco (no transparentes)
   - Verifica que tienen z-index alto

## 📝 Agregar scripts en package.json

Por favor agregar manualmente estos scripts en `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

## 🎯 Objetivo de los tests

Estos tests previenen regresiones en:

- **Dropdowns transparentes**: Verifica que los combobox tienen background opaco y z-index alto
- **Agrupación correcta**: Valida que las Partidas se agrupan bajo sus Mayores correspondientes
- **Selección de catálogo**: Asegura que se pueden seleccionar Subpartidas y Proveedores del catálogo TU
- **Persistencia de datos**: Verifica que los datos se guardan correctamente en la base de datos

## 🔧 Configuración

Los archivos de configuración son:

- `vitest.config.ts` - Configuración de Vitest
- `playwright.config.ts` - Configuración de Playwright
- `src/test/setup.ts` - Setup global para tests unitarios

## 📚 Recursos

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
