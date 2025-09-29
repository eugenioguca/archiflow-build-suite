# Planning v2 Module

Módulo de planeación de presupuestos completamente aislado del sistema principal.

## Estado Actual: Phases 0-3 Completadas ✅

### Phase 0: Scaffolding & Isolation ✅
- Feature flag: `PLANNING_V2_ENABLED` en `config/featureFlag.ts`
- Nuevas tablas: `planning_budgets`, `planning_partidas`, `planning_conceptos`, etc.
- Adaptadores read-only para: Projects, Clients, TU dimensions
- Rutas: `/planning-v2` y `/planning-v2/budgets/:id`
- Navegación condicional en sidebar con badge "Beta"

### Phase 1: Data Model & Formula Engine ✅
- Motor de fórmulas por claves de campo (no por columnas)
- Tipos de dominio en `domain/types.ts`
- Validadores Zod con mensajes en español
- Servicios CRUD en `services/budgetService.ts`
- Utilidades monetarias con Decimal.js (6 decimales storage, 2 display)
- Fórmulas por defecto: cantidad, pu, total_real, total

### Phase 2: Catalog Grid UI ✅
- Grid virtualizado estilo Excel
- Agrupación por Partidas con secciones colapsables
- Edición inline de campos input
- Celdas calculadas con fondo distintivo y candado
- Selector WBS con navegación breadcrumb
- Filtro "Ocultar en cero" con contador de filas ocultas
- Gestor de columnas para agregar/eliminar campos
- Selección múltiple y acciones masivas
- Atajos de teclado (Ctrl+D, Alt+↑/↓, Ctrl+K, etc.)

### Phase 3: Summary, Taxes, Versions & Snapshots ✅
- **Tab Resumen**: Tabla por partida con subtotales, IVA configurable, retenciones opcionales
- **Sistema de Versiones**: Estados draft → published → closed
- **Snapshots Inmutables**: Al publicar se crea snapshot con datos congelados
- **Comparación de Versiones**: Diffs por partida, deltas monetarios, estado de cambios
- **Cálculo de Impuestos**: IVA (switch + tasa), Retenciones (opcional)
- Todo en español (es-MX)

## Estructura de Archivos

```
src/modules/planning_v2/
├── config/
│   └── featureFlag.ts          # PLANNING_V2_ENABLED
├── adapters/                    # Read-only adapters
│   ├── projects.ts
│   ├── clients.ts
│   └── tu.ts                    # TU dimensions (Dept, Mayor, Partida, Sub)
├── domain/
│   └── types.ts                 # Core domain types
├── types/
│   └── index.ts                 # Database types
├── engine/
│   └── formulaEngine.ts         # Field-key formula engine
├── services/
│   ├── budgetService.ts         # CRUD operations
│   └── snapshotService.ts       # Versions & snapshots
├── validators/
│   └── schemas.ts               # Zod schemas (Spanish errors)
├── utils/
│   └── monetary.ts              # Decimal.js utils
├── hooks/
│   ├── useCatalogGrid.ts        # Grid state & operations
│   └── useKeyboardShortcuts.ts  # Keyboard navigation
├── components/
│   ├── catalog/
│   │   ├── CatalogGrid.tsx      # Main grid component
│   │   ├── WBSSelector.tsx      # Breadcrumb WBS picker
│   │   └── ColumnManager.tsx    # Column configuration
│   ├── summary/
│   │   └── Summary.tsx          # Financial summary with taxes
│   └── versions/
│       └── VersionsComparison.tsx # Snapshot comparison
├── pages/
│   ├── PlanningV2Index.tsx      # Budget list
│   └── BudgetDetail.tsx         # Budget detail with tabs
├── index.ts                     # Module exports
└── README.md                    # This file
```

## Tablas de Base de Datos

### planning_budgets
Presupuestos principales con estado (draft/published/closed).

### planning_partidas
Grupos de conceptos (colapsables en UI).

### planning_conceptos
Items individuales con campos calculados y WBS.

### planning_budget_snapshots (Phase 3) ✅
Snapshots inmutables creados al publicar versiones.
- `snapshot_data`: Estado completo congelado
- `totals`: Totales precalculados (subtotal, IVA, retenciones, gran total)
- `version_number`: Número incremental de versión

### planning_templates
Templates de campos dinámicos.

### planning_template_fields
Definición de campos (input/computed) con fórmulas.

### planning_wbs_codes
Códigos WBS jerárquicos (Departamento → Mayor → Partida → Subpartida).

### planning_price_observations
Observaciones de precios por WBS, proveedor, región.

## Motor de Fórmulas

### Características
- Resolución topológica de dependencias
- Detección de ciclos con mensajes en español
- Funciones: SUM, AVG, MIN, MAX, COUNT con predicados
- Precisión: Decimal.js (6 decimales storage, 2 display)

### Fórmulas Predeterminadas
```typescript
cantidad = cantidad_real * (1 + desperdicio_pct)
pu = precio_real * (1 + honorarios_pct)
total_real = precio_real * cantidad_real
total = pu * cantidad
```

### Agregaciones
```typescript
subtotal_partida = SUM(concepto.total WHERE sumable && active)
grand_total = SUM(partida.subtotal_partida WHERE active)
```

## Sistema de Versiones & Snapshots

### Estados del Presupuesto
1. **draft** (Borrador): Editable, no tiene snapshot
2. **published** (Publicado): Snapshot creado, editable pero genera nueva versión
3. **closed** (Cerrado): Bloqueado, solo lectura

### Publicar Versión
Al publicar:
1. Se crea snapshot inmutable con:
   - Datos completos del presupuesto
   - Totales precalculados (subtotal, IVA, retenciones, gran total)
   - Configuración fiscal (tasas de impuestos)
   - Número de versión incremental
2. No se modifica ninguna tabla externa (TU, proyectos, etc.)
3. El presupuesto cambia a estado `published`

### Comparación de Versiones
- Selecciona 2 snapshots para comparar
- Muestra delta en gran total (monto y porcentaje)
- Lista cambios por partida:
  - ✅ **Nueva**: Partida agregada
  - ❌ **Eliminada**: Partida removida
  - 📝 **Modificada**: Cambio en subtotal
  - ⚪ **Sin cambios**: Igual en ambas versiones
- Resalta diferencias con colores

## Formato de Datos

- **Moneda**: MXN ($ prefix, separador miles: `,`, decimal: `.`)
- **Fechas**: DD/MM/YYYY (es-MX)
- **Números**: 6 decimales en BD, 2 en UI (configurable)
- **Porcentajes**: Almacenado como decimal (0.16 = 16%)

## RLS (Row Level Security)

Todas las tablas Planning v2 tienen RLS habilitado:
- `admin` y `employee` roles: acceso completo
- Validación via `profiles.role`

## Próximas Fases

### Phase 4: Export & Templates
- Exportación PDF/Excel con logo y columnas configurables
- Templates de presupuesto reutilizables
- Copiar presupuesto entre proyectos

### Phase 5: Advanced Features
- Análisis de sensibilidad
- Curvas de aprendizaje
- Machine learning para predicción de precios

## Principios de Diseño

1. **Aislamiento Total**: No modifica módulos existentes ni TU
2. **Idioma**: Todo en español (es-MX)
3. **Formato Regional**: México (MXN, DD/MM/YYYY)
4. **Feature Flag**: Oculto cuando `PLANNING_V2_ENABLED = false`
5. **Adaptadores Read-Only**: Solo lectura de datos externos
6. **Precisión Decimal**: Decimal.js para cálculos monetarios
7. **Snapshots Inmutables**: Versiones congeladas, no se modifican
8. **No escritura a TU**: Nunca escribe en tablas de Transacciones Unificadas

## Testing

### Unit Tests
- Motor de fórmulas: dependencias, ciclos, precisión
- Servicios: CRUD operations
- Utilidades: formato monetario, validaciones
- Snapshots: integridad de datos congelados

### Integration Tests
- E2E: Crear presupuesto → agregar partidas/conceptos → totales correctos
- Snapshots: reproducción exacta de totales
- Comparación de versiones: cálculo correcto de deltas
- Cálculo de impuestos: IVA y retenciones

### Acceptance Criteria (Cumplidos)
- ✅ Feature flag funcional
- ✅ Rutas accesibles solo cuando flag=true
- ✅ Sin modificación de tablas existentes
- ✅ Motor de fórmulas con detección de ciclos
- ✅ Grid virtualizado con 10k+ filas
- ✅ WBS selector con breadcrumb
- ✅ Gestor de columnas persistente
- ✅ Cálculo de impuestos (IVA, retenciones)
- ✅ Publicación con snapshot inmutable
- ✅ Comparación de versiones con diffs
- ✅ Todo en español (es-MX)

---

**Última actualización**: Phase 3 - 29 de septiembre de 2025  
**Estado**: ✅ Beta (Phases 0-3 completadas)
