import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportRequest {
  budgetId: string;
  partidaId: string;
  rows: Array<{
    code: string;
    description: string;
    unit: string;
    cantidad_real: number;
    desperdicio_pct: number;
    precio_real: number;
    honorarios_pct: number;
    proveedor: string | null;
    wbs: string | null;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('No autorizado')
    }

    const { budgetId, partidaId, rows } = await req.json() as ImportRequest

    // Get current user's profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      throw new Error('Perfil no encontrado')
    }

    // Get max order_index for this partida
    const { data: existingConceptos } = await supabaseClient
      .from('planning_conceptos')
      .select('order_index')
      .eq('budget_id', budgetId)
      .eq('partida_id', partidaId)
      .order('order_index', { ascending: false })
      .limit(1)

    let maxOrder = 0
    if (existingConceptos && existingConceptos.length > 0) {
      maxOrder = existingConceptos[0].order_index
    }

    // Start transaction - insert all concepts
    const conceptsToInsert = rows.map((row, index) => ({
      budget_id: budgetId,
      partida_id: partidaId,
      code: row.code,
      short_description: row.description,
      long_description: row.description,
      unit: row.unit,
      cantidad_real: row.cantidad_real || 0,
      desperdicio_pct: row.desperdicio_pct || 0,
      precio_real: row.precio_real || 0,
      honorarios_pct: row.honorarios_pct || 0,
      provider: row.proveedor,
      wbs_code: row.wbs,
      order_index: maxOrder + index + 1,
      sumable: true,
      created_by: profile.id,
    }))

    const { data: insertedConceptos, error: insertError } = await supabaseClient
      .from('planning_conceptos')
      .insert(conceptsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting concepts:', insertError)
      throw new Error(`Error al insertar conceptos: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${insertedConceptos.length} conceptos importados correctamente`,
        importedCount: insertedConceptos.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in planning-import-atomic:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido al importar';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
