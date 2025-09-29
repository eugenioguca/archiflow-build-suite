# Planning v2 Module - Fase 0: Scaffolding

## Descripción General

Planning v2 es un nuevo módulo de planeación completamente aislado del resto de la aplicación. Este módulo proporciona un sistema moderno y escalable para la gestión de presupuestos de construcción.

## Estado: Fase 0 - Scaffolding (COMPLETADO)

La Fase 0 establece la base del módulo con:
- ✅ Tablas de base de datos aisladas
- ✅ Feature flag para control de acceso
- ✅ Adaptadores de solo lectura
- ✅ Estructura de rutas y componentes base
- ✅ Integración con navegación

## Feature Flag

El módulo está controlado por el flag `PLANNING_V2_ENABLED` ubicado en:
```
src/modules/planning_v2/config/featureFlag.ts
```

**Por defecto: ACTIVADO (`true`)**

Para deshabilitar el módulo, cambiar a `false`:
```typescript
export const PLANNING_V2_ENABLED = false;
```

## Estructura de Directorios

```
src/modules/planning_v2/
├── config/
│   └── featureFlag.ts          # Feature flag control
├── adapters/
│   ├── projects.ts              # Adaptador read-only para proyectos
│   ├── clients.ts               # Adaptador read-only para clientes
│   └── tu.ts                    # Adaptador read-only para TU dimensions
├── pages/
│   ├── PlanningV2Index.tsx      # Página principal - lista de presupuestos
│   └── BudgetDetail.tsx         # Detalle de presupuesto con tabs
├── types/
│   └── index.ts                 # Type definitions
├── index.ts                     # Module exports
└── README.md                    # Esta documentación
```

## Tablas de Base de Datos

Todas las tablas tienen el prefijo `planning_` para evitar conflictos:

### Tablas Principales

1. **planning_budgets**
   - Presupuestos principales
   - Relacionados con client_projects y clients
   - Estados: draft, published, closed

2. **planning_partidas**
   - Secciones/divisiones del presupuesto
   - Agrupaciones de conceptos

3. **planning_conceptos**
   - Líneas de detalle del presupuesto
   - Incluye cantidades, precios, totales
   - Referencia opcional a WBS codes

4. **planning_templates**
   - Plantillas de estructura de presupuesto
   - Versionadas

5. **planning_template_fields**
   - Definiciones de campos de las plantillas
   - Tipos: input o computed
   - Fórmulas para campos calculados

6. **planning_wbs_codes**
   - Catálogo WBS (Work Breakdown Structure)
   - Vincula con dimensiones TU
   - Código primario: departamento-mayor-partida-subpartida

7. **planning_price_observations**
   - Observaciones históricas de precios
   - Fuentes: budget o tu
   - Por región, proyecto, proveedor

## Adaptadores Read-Only

Los adaptadores proporcionan acceso seguro a datos existentes sin permitir mutaciones:

### projectsAdapter
```typescript
import { projectsAdapter } from '@/modules/planning_v2/adapters/projects';

// Obtener proyecto por ID
const project = await projectsAdapter.getById(projectId);

// Obtener todos los proyectos
const projects = await projectsAdapter.getAll();
```

### clientsAdapter
```typescript
import { clientsAdapter } from '@/modules/planning_v2/adapters/clients';

// Obtener cliente por ID
const client = await clientsAdapter.getById(clientId);

// Obtener todos los clientes
const clients = await clientsAdapter.getAll();
```

### tuAdapter
```typescript
import { tuAdapter } from '@/modules/planning_v2/adapters/tu';

// Obtener todas las dimensiones
const dimensions = await tuAdapter.getDimensions();

// Obtener departamentos
const departamentos = await tuAdapter.getDepartamentos();

// Obtener mayores de un departamento
const mayores = await tuAdapter.getMayores('construccion');

// Obtener partidas de un mayor
const partidas = await tuAdapter.getPartidas(mayorId);

// Obtener subpartidas
const subpartidas = await tuAdapter.getSubpartidas(partidaId);
```

## Rutas

Con el feature flag activado, las siguientes rutas están disponibles:

- `/planning-v2` - Lista de presupuestos (índice)
- `/planning-v2/budgets/:id` - Detalle de presupuesto con tabs

## Navegación

El módulo aparece en la navegación lateral (AppSidebar) con:
- Icono: Rocket (🚀)
- Título: "Planeación v2 (Beta)"
- Badge: "Beta" (naranja)
- Visible solo si `PLANNING_V2_ENABLED = true`

## Idioma

**TODO EL CONTENIDO ES EN ESPAÑOL (es-MX)**

- Etiquetas de UI
- Mensajes de error
- Estados vacíos
- Tooltips
- Documentación en código

## Formato de Datos

- **Moneda**: MXN con símbolo $
- **Decimales**: 2 posiciones con separador .
- **Miles**: Separador ,
- **Fechas**: DD/MM/YYYY

## Seguridad (RLS)

Todas las tablas tienen Row Level Security habilitado.

**Políticas actuales:**
- Empleados y admins: Acceso completo (SELECT, INSERT, UPDATE, DELETE)
- Otros roles: Sin acceso

## Próximos Pasos (Fases Futuras)

### Fase 1: CRUD Básico
- Crear nuevo presupuesto
- Editar presupuesto existente
- Gestión de partidas
- Gestión de conceptos
- Cálculos automáticos

### Fase 2: Plantillas
- Sistema de plantillas
- Campos configurables
- Fórmulas personalizadas

### Fase 3: Integración WBS/TU
- Vinculación con dimensiones TU
- Observaciones de precios
- Sincronización bidireccional

### Fase 4: Exportación
- PDF personalizable
- Excel con formato
- Reportes consolidados

## Notas de Desarrollo

### Restricciones Importantes
1. ❌ NO modificar tablas existentes
2. ❌ NO modificar módulos existentes (Planning v1, TU, etc.)
3. ❌ NO crear dependencias bidireccionales
4. ✅ Solo lectura de datos existentes mediante adaptadores
5. ✅ Escritura solo en tablas `planning_*`

### Testing
Para probar el módulo:

1. Verificar feature flag activado
2. Login como admin o employee
3. Navegar a /planning-v2
4. Verificar:
   - Lista vacía con estado inicial
   - Navegación a detalle (ruta dinámica)
   - Tabs en vista de detalle
   - Todos los textos en español

### Desactivar Módulo
Para ocultar completamente el módulo:

```typescript
// src/modules/planning_v2/config/featureFlag.ts
export const PLANNING_V2_ENABLED = false;
```

Esto eliminará:
- Rutas del enrutador
- Entrada en navegación lateral
- Acceso a todas las páginas

## Equipo de Desarrollo

Este módulo fue desarrollado siguiendo arquitectura modular y mejores prácticas de React/TypeScript.

Para dudas o mejoras, consultar con el equipo de arquitectura.

---

**Última actualización**: Fase 0 - 29 de septiembre de 2025
**Estado**: ✅ Producción (con feature flag)
