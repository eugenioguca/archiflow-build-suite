# Planning v2 Module

Módulo de planeación de presupuestos completamente aislado del sistema principal.

## Navegación

El módulo es accesible desde el sidebar principal cuando está habilitado:

- **Etiqueta:** "Planeación v2 (Beta)" (Español)
- **Ícono:** Rocket (lucide-react)
- **Ruta:** `/planning-v2`
- **Badge:** "Beta" (naranja)
- **Visibilidad:** 
  - Requiere `PLANNING_V2_ENABLED = true`
  - Requiere rol `planning_v2.viewer` o superior
  - Estado activo se aplica a todas las rutas que inician con `/planning-v2`

## Estado Actual: Phases 0-8 Completadas ✅

### Phase 0: Scaffolding & Isolation ✅
- Feature flag: `PLANNING_V2_ENABLED` en `config/featureFlag.ts`
- Nuevas tablas: `planning_budgets`, `planning_partidas`, `planning_conceptos`, etc.
- Adaptadores read-only para: Projects, Clients, TU dimensions
- Rutas: `/planning-v2` y `/planning-v2/budgets/:id`
- Navegación condicional en sidebar con badge "Beta" y verificación de roles

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

### Phase 4: Read-Only TU Integration (Budget vs Actual) ✅
- **Conector TU Read-Only**: Mapea WBS codes a dimensiones TU (Dept → Mayor → Partida → Sub)
- **Budget vs Actual**: Vista comparativa con columnas "Ejercido (TU)" y "Variación"
- **Drill-down a TU**: Links clicables a transacciones unificadas (nueva pestaña)
- **Indicadores de Variación**: Verde (surplus), Rojo (déficit), con % y monto
- **Graceful Degradation**: Si TU no responde, Planning v2 sigue funcionando
- **Feature Flag**: `PLANNING_V2_TU_READONLY` para aislar integración
- Mensajes en español, sin escritura a TU

## Estructura de Archivos

```
src/modules/planning_v2/
├── config/
│   └── featureFlag.ts          # PLANNING_V2_ENABLED, PLANNING_V2_TU_READONLY
├── adapters/                    # Read-only adapters
│   ├── projects.ts
│   ├── clients.ts
│   ├── tu.ts                    # TU dimensions (Dept, Mayor, Partida, Sub)
│   └── tuActuals.ts             # TU actuals integration (Phase 4)
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

### Phase 4 Acceptance Criteria
- ✅ Conector TU read-only sin escritura
- ✅ Mapeo WBS → Dimensiones TU
- ✅ Vista Budget vs Actual en Summary
- ✅ Drill-down a transacciones TU
- ✅ Variación con indicadores de color
- ✅ Feature flag aislado
- ✅ Degradación elegante si TU falla
- ✅ Mensajes en español

---

## Phase 7: Templates & Tests

Editor de plantillas y sistema de pruebas para validación automática.

### Tablas DB
- `planning_templates` - Plantillas base
- `planning_template_fields` - Campos dinámicos por plantilla
- `planning_template_partidas` - Partidas base
- `planning_template_conceptos` - Conceptos base con valores default
- `planning_template_tests` - Tests con inputs/outputs esperados

### Servicios
- `templateService` - CRUD plantillas, calcular deltas, aplicar
- `templateTestService` - Ejecutar tests, validar resultados

### Hooks
- `useTemplate` - Gestión de plantillas
- `useTemplateTests` - Ejecución y validación de tests

### Componentes UI
- `TemplateList` - Lista de plantillas
- `TemplateApplyDialog` - Diálogo confirmación con deltas
- `TemplateTestRunner` - Ejecutor de pruebas con resultados

### Acceptance Criteria
✅ No mutación externa (TU/módulos existentes)
✅ Delta explícito antes de aplicar
✅ Tests requeridos en verde antes de publicar
✅ UI completa en español

---

## Phase 8: Permissions, Audit, Events ✅

Sistema de roles específicos, auditoría granular y webhooks con mensajes en español.

### Tablas DB

**Roles**
- `planning_v2_role` (ENUM) - viewer, editor, publisher
- `planning_v2_user_roles` - Asignaciones de roles con expiración

**Auditoría**
- `planning_v2_audit_log` - Registro detallado de cambios
  - Tracking por campo (cantidad_real, precio_real, wbs_code, fórmulas, descripción larga)
  - Quién, qué, cuándo con metadata completa
  - IP address, user agent, razón del cambio

**Eventos y Webhooks**
- `planning_v2_webhooks` - Configuración de webhooks
- `planning_v2_events` - Eventos disparados con payload

### Funciones DB

- `has_planning_v2_role(user_id, role)` - Verificar rol (SECURITY DEFINER)
- `log_planning_v2_change(...)` - Registrar cambio manualmente
- `trigger_planning_v2_event(...)` - Disparar evento con payload
- Triggers automáticos en `planning_conceptos` y `planning_template_fields`

### Edge Function

**planning-v2-webhooks**
- Envía eventos a webhooks configurados
- Soporte para HMAC signature (SHA-256)
- Headers: `X-Planning-V2-Event`, `X-Planning-V2-Signature`
- Logging detallado con contadores de éxito/fallo

### Servicios

**permissionsService**
- `checkUserRole(role)` - Verificar rol específico
- `getUserRoles(userId)` - Obtener roles de usuario
- `grantRole(userId, role, expiresAt?, notes?)` - Asignar rol
- `revokeRole(userId, role)` - Revocar rol
- `getAllUserRoles()` - Listar todas las asignaciones

**auditService**
- `getAuditLogs(filters)` - Consultar logs con filtros
- `getAuditLogsForRecord(table, id)` - Logs de un registro
- `getAuditLogsForBudget(budgetId)` - Logs de presupuesto
- `getRecentChanges(limit)` - Cambios recientes
- `getAuditSummary(budgetId?, dates?)` - Estadísticas de auditoría
- `logManualChange(...)` - Registrar cambio manual

**eventsService**
- `getWebhooks()` - Listar webhooks
- `createWebhook(config)` - Crear webhook
- `updateWebhook(id, updates)` - Actualizar webhook
- `deleteWebhook(id)` - Eliminar webhook
- `toggleWebhook(id, active)` - Activar/desactivar
- `getEvents(filters)` - Consultar eventos
- `triggerEvent(type, budgetId, payload)` - Disparar evento
- `triggerBudgetPublishedEvent(budgetId, snapshotId, totals)` - Helper para publicación
- `triggerBudgetExportedEvent(budgetId, format, data)` - Helper para exportación

### Hooks

**usePermissions()**
```typescript
const {
  isViewer,           // Boolean: tiene rol viewer
  isEditor,           // Boolean: tiene rol editor
  isPublisher,        // Boolean: tiene rol publisher
  allRoles,           // Lista de todas las asignaciones
  isLoadingPermissions,
  
  checkRole,          // Función: verificar rol específico
  grantRole,          // Asignar rol
  revokeRole,         // Revocar rol
  
  isGranting,
  isRevoking
} = usePermissions();
```

**useAudit(filters)**
```typescript
const {
  auditLogs,          // Array de logs
  auditSummary,       // Estadísticas
  isLoading,
  refetch
} = useAudit({
  budgetId,
  recordId,
  tableName,
  startDate,
  endDate,
  limit
});
```

**useWebhooks()**
```typescript
const {
  webhooks,           // Array de webhooks configurados
  isLoading,
  
  createWebhook,      // Crear webhook
  updateWebhook,      // Actualizar webhook
  deleteWebhook,      // Eliminar webhook
  toggleWebhook,      // Activar/desactivar
  
  isCreating,
  isUpdating,
  isDeleting
} = useWebhooks();
```

**useEvents(filters)**
```typescript
const { data: events } = useEvents({
  budgetId,
  eventType,
  startDate,
  endDate,
  limit
});
```

### Tipos de Eventos

- `planning_v2.budget.published` - Presupuesto publicado
  - Payload: budget_id, snapshot_id, totals, published_at
- `planning_v2.budget.exported` - Presupuesto exportado
  - Payload: budget_id, format (pdf/excel), exported_at, data

### Integración con Snapshots

Al publicar presupuesto (`snapshotService.createSnapshot`):
```typescript
// Disparar evento automáticamente
await eventsService.triggerBudgetPublishedEvent(
  budgetId,
  snapshot.id,
  {
    grand_total: computed.grand_total,
    partidas_count: partidas.length,
    conceptos_count: conceptos.length
  }
);
```

### Webhook Payload Example

```json
{
  "event_id": "uuid",
  "event_type": "planning_v2.budget.published",
  "budget_id": "uuid",
  "snapshot_id": "uuid",
  "triggered_at": "2025-09-29T19:54:10Z",
  "data": {
    "budget_id": "uuid",
    "snapshot_id": "uuid",
    "totals": {
      "grand_total": 1250000.50,
      "partidas_count": 12,
      "conceptos_count": 145
    },
    "published_at": "2025-09-29T19:54:10Z"
  }
}
```

### Acceptance Criteria

✅ **Feature flag**: Solo funciona con `PLANNING_V2_ENABLED = true`  
✅ **Sin mutación externa**: No modifica tablas fuera de Planning v2  
✅ **Roles específicos**: viewer, editor, publisher con función SECURITY DEFINER  
✅ **Auditoría granular**: Tracking automático en campos clave con triggers  
✅ **Eventos con prefijo**: Todos los eventos usan `planning_v2.*`  
✅ **Webhooks seguros**: HMAC signature opcional con SHA-256  
✅ **Mensajes en español**: Todos los errores, logs y UI en español

### Testing Checklist

- [ ] Verificar roles con has_planning_v2_role()
- [ ] Asignar/revocar roles con expiración
- [ ] Auditoría automática en UPDATE de conceptos
- [ ] Logs incluyen old_value y new_value
- [ ] Eventos se registran en planning_v2_events
- [ ] Webhooks se envían correctamente
- [ ] HMAC signature valida payload
- [ ] Edge function maneja errores gracefully
- [ ] Mensajes de error en español
- [ ] Feature flag desactiva funcionalidad

---

## Phase 5: Price Intelligence & Alerts ✅

### Overview
Sistema de inteligencia de precios con histórico automático y alertas para validación de presupuestos.

### Key Features
- **Captura Automática**: Observaciones de precios al publicar presupuestos
- **Estadísticas**: Mediana, P25, P75, último precio visto (ventana de 90 días)
- **Alertas Inteligentes**: 
  - ⚠️ Warning (>15% desviación): Revisión recomendada
  - 🚫 Error (>30% desviación): Justificación obligatoria
- **Normalización de Unidades**: Conversión entre unidades (ml↔m³, kg↔ton, etc.)
- **UX en Español**: Todos los mensajes y validaciones

### Database Schema

```sql
-- Observaciones de precios históricos
planning_price_observations:
  - wbs_code, unit, pu, currency
  - observation_date, provider, project_id, budget_id
  - source ('budget' | 'tu')
  - exchange_rate, pu_mxn (normalizado a MXN)
  - metadata (JSONB para datos adicionales)

-- Normalización de unidades
planning_unit_normalizations:
  - from_unit, to_unit, conversion_factor
  - Conversiones comunes: ml→m³, kg→ton, cm→m, etc.
```

### Flujo de Captura de Precios

1. **Al Publicar Presupuesto**:
   - Por cada concepto sumable con WBS code
   - Crear observación con: PU, unidad, proveedor, fecha
   - Normalizar a MXN (exchange_rate)

2. **Desde TU** (futuro):
   - Sincronización batch: `pu_real = total / cantidad`
   - Source='tu' para diferenciar origen

### Análisis Estadístico

- **Mediana (50th percentile)**: Precio recomendado baseline
- **P25/P75**: Rango intercuartil para análisis de varianza
- **Tamaño de Muestra**: Número de observaciones en ventana
- **Último Visto**: Observación más reciente con fecha

### Umbrales de Alerta

```typescript
const DEVIATION_WARNING_THRESHOLD = 15;  // 15% → Badge amarillo
const DEVIATION_ERROR_THRESHOLD = 30;    // 30% → Badge rojo + justificación
```

**Configurables** por organización según necesidades.

### Integración UI

#### 1. PriceReferenceChip
- **Ubicación**: Junto a campos `precio_real` y `pu`
- **Badge Colors**:
  - 🔵 Gris: Sin datos históricos
  - 🟢 Verde: Dentro de rango aceptable
  - 🟡 Amarillo: Warning (>15%)
  - 🔴 Rojo: Error (>30%)
- **Tooltip**: Estadísticas completas al hover

#### 2. PriceValidationDialog
- Aparece cuando desviación >30%
- Campo de justificación obligatorio
- Bloquea guardado hasta que se justifique

### Files

```
src/modules/planning_v2/
├── services/
│   └── priceIntelligenceService.ts    # Core: estadísticas, alertas, captura
├── hooks/
│   └── usePriceIntelligence.ts        # Hook para grid integration
├── components/catalog/
│   ├── PriceReferenceChip.tsx         # Badge con stats de precio
│   └── PriceValidationDialog.tsx      # Modal de justificación
└── services/
    └── snapshotService.ts              # Actualizado: crea observaciones al publicar
```

### Testing Checklist
- [ ] Observaciones creadas correctamente al publicar
- [ ] Cálculos estadísticos precisos (mediana, percentiles)
- [ ] Umbrales de alerta funcionan (15%, 30%)
- [ ] Justificación obligatoria para >30%
- [ ] Normalización de unidades activa
- [ ] Performance con gran volumen de histórico
- [ ] Mensajes y copy en español (es-MX)
- [ ] Manejo elegante sin datos históricos
- [ ] PriceReferenceChip se muestra correctamente
- [ ] Tooltip con estadísticas completas

### Mejoras Futuras
- **Edge Function** para sincronización batch desde TU
- **Conversión de Moneda** con tasas históricas
- **Tracking por Proveedor** para análisis específico
- **Estadísticas Granulares**: proyecto vs. globales
- **ML Predictions**: Predicción de precios futuros
- **Análisis de Tendencias**: Gráficas de evolución temporal

### Acceptance Criteria
- ✅ Tabla `planning_price_observations` con RLS
- ✅ Tabla `planning_unit_normalizations` poblada
- ✅ Función de estadísticas (mediana, P25, P75)
- ✅ Servicio de inteligencia de precios
- ✅ Hook `usePriceIntelligence` funcional
- ✅ Componente `PriceReferenceChip` con badges
- ✅ Diálogo de validación con justificación
- ✅ Captura automática en `publishBudget`
- ✅ Todo en español (es-MX)

---

**Última actualización**: Phase 5 - 29 de septiembre de 2025  
**Estado**: ✅ Beta (Phases 0-5 completadas)
