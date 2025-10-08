# Verificar y Corregir Content-Type de Manuales

## Problema
Si los PDFs se descargan en lugar de visualizarse inline en el navegador, el problema suele ser que el `content-type` del archivo en Storage no es `application/pdf`.

## Paso 1: Verificar Content-Type Actual

1. Ve al Dashboard de Supabase: https://supabase.com/dashboard/project/ycbflvptfgrjclzzlxci/storage/buckets/operation-manuals
2. En el menú lateral, ve a **Storage** → **operation-manuals**
3. Navega a la carpeta `manuals/`
4. Haz clic en cada archivo PDF
5. En el panel de detalles a la derecha, revisa el campo **Content-Type**

**✅ Correcto:** `application/pdf`  
**❌ Incorrecto:** `application/octet-stream`, `binary/octet-stream`, o cualquier otro valor

## Paso 2: Corregir Content-Type (Si es necesario)

### Opción A: Re-subir archivo con Content-Type correcto

La forma más simple es re-subir el archivo con el content-type correcto:

```typescript
// Ejemplo para re-subir con content-type correcto
const file = new File([pdfBlob], 'nombre-manual.pdf', { 
  type: 'application/pdf' 
});

await supabase.storage
  .from('operation-manuals')
  .upload('manuals/nombre-manual.pdf', file, {
    contentType: 'application/pdf',
    cacheControl: '3600',
    upsert: true // Reemplaza el archivo existente
  });
```

### Opción B: Actualizar metadata usando SQL

También puedes actualizar el content-type directamente en la base de datos:

```sql
-- Actualizar content-type de un archivo específico
UPDATE storage.objects
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{mimetype}',
  '"application/pdf"'
)
WHERE bucket_id = 'operation-manuals'
  AND name = 'manuals/nombre-manual.pdf';

-- Verificar el cambio
SELECT name, metadata->>'mimetype' as content_type
FROM storage.objects
WHERE bucket_id = 'operation-manuals'
  AND name LIKE 'manuals/%';
```

## Paso 3: Verificar Funcionamiento

1. Una vez corregido el content-type, ve al Dashboard → Manuales de Operación
2. Haz clic en el ícono de "Abrir" (ExternalLink) de cualquier manual
3. **Resultado esperado:** Se abre una nueva pestaña mostrando el PDF inline (sin descarga automática)
4. **Resultado incorrecto:** Se descarga el archivo automáticamente en lugar de mostrarse en el navegador

## Notas Importantes

- Los signed URLs funcionan **sin importar** si el bucket es público o privado
- El bucket `operation-manuals` está configurado como **privado** con políticas RLS
- Solo usuarios autenticados pueden generar signed URLs
- El `content-type` debe establecerse **al momento de subir el archivo**
- Los navegadores modernos respetan el `content-type` para decidir entre mostrar o descargar
- El código de firma (`companyManualsAdapter.ts`) **NO** agrega parámetros de descarga ni modifica `Content-Disposition`

## Verificar Archivos en el Bucket

Para listar todos los archivos PDF en el bucket y verificar sus metadatos:

```sql
-- Listar todos los archivos en operation-manuals/manuals/
SELECT 
  name,
  metadata->>'mimetype' as content_type,
  metadata->>'size' as size_bytes,
  created_at
FROM storage.objects
WHERE bucket_id = 'operation-manuals'
  AND name LIKE 'manuals/%'
  AND name NOT LIKE 'manuals/.'
ORDER BY created_at DESC;
```

## Código de Firma (Referencia)

El adapter actual ya está configurado correctamente para visualización inline:

```typescript
// src/modules/manuals/companyManualsAdapter.ts
export async function signCompanyManual(path: string, expiresIn = 600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('operation-manuals')
    .createSignedUrl(path, expiresIn);
  
  if (error || !data?.signedUrl) throw error ?? new Error("No signed URL");
  return data.signedUrl; // Sin parámetros de descarga forzada
}
```
