// supabase/functions/confirmar-entrega/index.ts
// NOVA-VULN-003: Edge Function dedicada para transições de status do motorista
// Substitui PATCH direto via anon key, validando token antes de atualizar
// Ações suportadas: "iniciar_transito" e "confirmar_entrega"

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://rastreamentobrat.com.br",
  "https://www.rastreamentobrat.com.br",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// Rate limiting helper (fail-closed)
async function checkRateLimit(supabaseAdmin: any, functionName: string, identifier: string, maxRequests: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
      p_function_name: functionName,
      p_identifier: identifier,
      p_max_requests: maxRequests,
      p_window_minutes: 60
    });
    if (error) { console.error('[RATE] Erro:', error.message); return false; }
    return data === true;
  } catch { return false; }
}

// Transições de status válidas para o motorista
const VALID_TRANSITIONS: Record<string, { from: string[]; updates: (cargaId: string) => Record<string, any> }> = {
  iniciar_transito: {
    from: ['aguardando'],
    updates: () => ({ status: 'em_transito' }),
  },
  confirmar_entrega: {
    from: ['em_transito'],
    updates: () => ({
      status: 'entregue',
      data_entrega_real: new Date().toISOString(),
      link_rastreamento: null,
    }),
  },
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Rate limiting (30 requests/hora por IP)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const allowed = await checkRateLimit(supabaseAdmin, 'confirmar-entrega', clientIp, 30);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Muitas requisições. Tente novamente mais tarde." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { carga_id, token, action } = await req.json();

    if (!carga_id || !token || !action) {
      return new Response(
        JSON.stringify({ error: "carga_id, token e action são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar action
    const transition = VALID_TRANSITIONS[action];
    if (!transition) {
      return new Response(
        JSON.stringify({ error: "Ação inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar que o token corresponde à carga e está ativo
    const { data: link, error: linkError } = await supabaseAdmin
      .from("links_rastreamento")
      .select("id, carga_id, ativo")
      .eq("carga_id", carga_id)
      .eq("token", token)
      .eq("ativo", true)
      .single();

    if (linkError || !link) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar status atual da carga
    const { data: carga, error: cargaError } = await supabaseAdmin
      .from("cargas")
      .select("id, status")
      .eq("id", carga_id)
      .single();

    if (cargaError || !carga) {
      return new Response(
        JSON.stringify({ error: "Carga não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!transition.from.includes(carga.status)) {
      return new Response(
        JSON.stringify({ error: `Transição inválida: carga está como '${carga.status}'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar carga usando service role (seguro)
    const updateData = transition.updates(carga_id);
    const { error: updateError } = await supabaseAdmin
      .from("cargas")
      .update(updateData)
      .eq("id", carga_id);

    if (updateError) {
      console.error('[ENTREGA] Erro ao atualizar carga:', updateError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se confirmou entrega, desativar o link de rastreamento
    if (action === 'confirmar_entrega') {
      await supabaseAdmin
        .from("links_rastreamento")
        .update({ ativo: false })
        .eq("id", link.id);
    }

    console.log(`[ENTREGA] Carga ${carga_id} action=${action} sucesso`);

    return new Response(
      JSON.stringify({ success: true, message: "Status atualizado com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[ENTREGA] Erro interno:', error);
    return new Response(
      JSON.stringify({ error: "Erro interno ao processar requisição" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
