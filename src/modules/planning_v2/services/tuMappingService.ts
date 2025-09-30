/**
 * Service for mapping template items to TU catalog
 */
import { tuAdapter } from '../adapters/tu';

export interface TUMappingResult {
  mapped: boolean;
  tuId?: string;
  tuCodigo?: string;
  tuNombre?: string;
  matchType?: 'codigo' | 'nombre' | 'none';
  reason?: string;
}

/**
 * Map partida code/name to TU Mayor
 */
export async function mapPartidaToMayor(
  partidaCodigo: string,
  partidaNombre: string,
  departamento: string = 'CONSTRUCCIÓN'
): Promise<TUMappingResult> {
  const mayores = await tuAdapter.getMayores(departamento);
  
  // Try exact code match first
  let match = mayores.find(m => 
    m.codigo.toLowerCase() === partidaCodigo.toLowerCase()
  );
  
  if (match) {
    return {
      mapped: true,
      tuId: match.id,
      tuCodigo: match.codigo,
      tuNombre: match.nombre,
      matchType: 'codigo'
    };
  }
  
  // Try fuzzy name match
  const normalizedName = partidaNombre.toLowerCase().trim();
  match = mayores.find(m => {
    const mayorName = m.nombre.toLowerCase().trim();
    return mayorName.includes(normalizedName) || normalizedName.includes(mayorName);
  });
  
  if (match) {
    return {
      mapped: true,
      tuId: match.id,
      tuCodigo: match.codigo,
      tuNombre: match.nombre,
      matchType: 'nombre'
    };
  }
  
  return {
    mapped: false,
    matchType: 'none',
    reason: `No se encontró Mayor en TU para: ${partidaCodigo} - ${partidaNombre}`
  };
}

/**
 * Map concepto code/description to TU Subpartida
 */
export async function mapConceptoToSubpartida(
  conceptoCodigo: string,
  conceptoDescripcion: string,
  mayorId?: string
): Promise<TUMappingResult> {
  // Get all subpartidas (or filter by mayor if available)
  const subpartidas = await tuAdapter.getSubpartidas();
  
  // Try exact code match
  let match = subpartidas.find(s => 
    s.codigo.toLowerCase() === conceptoCodigo.toLowerCase()
  );
  
  if (match) {
    return {
      mapped: true,
      tuId: match.id,
      tuCodigo: match.codigo,
      tuNombre: match.nombre,
      matchType: 'codigo'
    };
  }
  
  // Try fuzzy name match
  const normalizedDesc = conceptoDescripcion.toLowerCase().trim();
  match = subpartidas.find(s => {
    const subName = s.nombre.toLowerCase().trim();
    return subName.includes(normalizedDesc) || normalizedDesc.includes(subName);
  });
  
  if (match) {
    return {
      mapped: true,
      tuId: match.id,
      tuCodigo: match.codigo,
      tuNombre: match.nombre,
      matchType: 'nombre'
    };
  }
  
  return {
    mapped: false,
    matchType: 'none',
    reason: `No se encontró Subpartida en TU para: ${conceptoCodigo} - ${conceptoDescripcion}`
  };
}

/**
 * Batch map template data to TU
 */
export async function mapTemplateToTU(
  partidas: Array<{ code: string; name: string }>,
  conceptos: Array<{ partida_code: string; code: string; short_description: string }>,
  departamento: string = 'CONSTRUCCIÓN'
) {
  const partidaMappings = new Map<string, TUMappingResult>();
  const conceptoMappings = new Map<string, TUMappingResult>();
  const unmappedPartidas: string[] = [];
  const unmappedConceptos: string[] = [];
  
  // Map partidas
  for (const partida of partidas) {
    const result = await mapPartidaToMayor(partida.code, partida.name, departamento);
    partidaMappings.set(partida.code, result);
    
    if (!result.mapped) {
      unmappedPartidas.push(`${partida.code} - ${partida.name}`);
    }
  }
  
  // Map conceptos
  for (const concepto of conceptos) {
    const partidaMapping = partidaMappings.get(concepto.partida_code);
    const result = await mapConceptoToSubpartida(
      concepto.code,
      concepto.short_description,
      partidaMapping?.tuId
    );
    conceptoMappings.set(concepto.code, result);
    
    if (!result.mapped) {
      unmappedConceptos.push(`${concepto.code} - ${concepto.short_description}`);
    }
  }
  
  return {
    partidaMappings,
    conceptoMappings,
    unmappedPartidas,
    unmappedConceptos,
    stats: {
      totalPartidas: partidas.length,
      mappedPartidas: partidas.length - unmappedPartidas.length,
      totalConceptos: conceptos.length,
      mappedConceptos: conceptos.length - unmappedConceptos.length
    }
  };
}
