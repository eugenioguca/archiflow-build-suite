# Verificar y Corregir Content-Type de Manuales

## Problema
Si los PDFs se descargan en lugar de visualizarse en el navegador, el problema suele ser que el `content-type` del archivo en Storage no es `application/pdf`.

## Paso 1: Verificar Content-Type Actual

1. Ve al Dashboard de Supabase: https://supabase.com/dashboard/project/ycbflvptfgrjclzzlxci
2. En el menú lateral, ve a **Storage** → **operation-manuals**
3. Navega a la carpeta `manuals/`
4. Haz clic en cada archivo PDF (operacion.pdf y presentacion-corporativa.pdf)
5. En el panel de detalles a la derecha, revisa el campo **Content-Type**

**✅ Correcto:** `application/pdf`  
**❌ Incorrecto:** `application/octet-stream`, `binary/octet-stream`, o cualquier otro valor

## Paso 2: Corregir Content-Type (Si es necesario)

### Opción A: Re-subir archivo con Content-Type correcto

La forma más simple es re-subir el archivo con el content-type correcto:

```typescript
// Código de ejemplo para re-subir (solo si necesario, no incluir en producción)
const file = new File([pdfBlob], 'operacion.pdf', { 
  type: 'application/pdf' 
});

await supabase.storage
  .from('operation-manuals')
  .upload('manuals/operacion.pdf', file, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: true // Reemplaza el archivo existente
  });
```

### Opción B: Actualizar metadata (más avanzado)

Si prefieres no re-subir, puedes actualizar solo los metadatos usando la API de Supabase Storage.

## Paso 3: Verificar Funcionamiento

1. Una vez corregido el content-type, ve al Dashboard corporativo
2. Haz clic en el botón "Expandir" de cualquiera de los dos manuales
3. **Resultado esperado:** Se abre una nueva pestaña mostrando el PDF inline (sin descarga)
4. **Resultado incorrecto:** Se descarga el archivo en lugar de mostrarse

## Notas Importantes

- Los signed URLs funcionan **sin importar** si el bucket es público o privado
- El bucket `operation-manuals` está configurado como **privado** con políticas RLS
- Solo usuarios autenticados pueden generar signed URLs
- El `content-type` debe establecerse **al momento de subir el archivo**
- Los navegadores modernos respetan el `content-type` para decidir entre mostrar o descargar

## Archivos Afectados

Los archivos que deben tener `content-type: application/pdf`:

1. `manuals/operacion.pdf` (o el nombre real del archivo de operación)
2. `manuals/presentacion-corporativa.pdf` (o el nombre real del archivo de presentación)

Estos nombres pueden variar según cómo se subieron. Verifica en la tabla `operation_manuals` qué paths están registrados:

```sql
SELECT id, title, category, file_url 
FROM operation_manuals 
WHERE category IN ('manual_operacion', 'presentacion_corporativa')
ORDER BY created_at DESC;
```
