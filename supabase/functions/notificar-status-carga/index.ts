// Edge Function: notificar-status-carga
// Envia email para a empresa quando o status da carga muda

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatusConfig {
  emoji: string;
  titulo: string;
  mensagem: string;
  cor: string;
  corFundo: string;
  icone: string;
}

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'aguardando':
      return {
        emoji: '📋',
        titulo: 'Nova carga registrada para sua empresa!',
        mensagem: 'Uma nova carga foi cadastrada no sistema e está aguardando o motorista iniciar o transporte. Assim que ele autorizar a localização, você será notificado sobre o início da viagem.',
        cor: '#2563EB',
        corFundo: '#EFF6FF',
        icone: '🆕',
      };
    case 'em_transito':
      return {
        emoji: '🚚',
        titulo: 'Sua carga está a caminho!',
        mensagem: 'O motorista já iniciou o transporte da sua carga. Você pode acompanhar o progresso em tempo real pelo nosso sistema.',
        cor: '#2563EB',
        corFundo: '#EFF6FF',
        icone: '🛣️',
      };
    case 'entregue':
      return {
        emoji: '✅',
        titulo: 'Carga entregue com sucesso!',
        mensagem: 'Sua carga chegou ao destino! Agradecemos pela confiança no nosso serviço de transporte.',
        cor: '#16A34A',
        corFundo: '#F0FDF4',
        icone: '📦',
      };
    case 'atrasado':
      return {
        emoji: '⏰',
        titulo: 'Atenção: possível atraso na entrega',
        mensagem: 'Identificamos que o motorista está um pouco atrasado em relação ao prazo previsto. Estamos monitorando a situação e faremos o possível para minimizar o impacto.',
        cor: '#DC2626',
        corFundo: '#FEF2F2',
        icone: '🔔',
      };
    case 'adiantado':
      return {
        emoji: '🚀',
        titulo: 'Ótima notícia! Entrega adiantada!',
        mensagem: 'O motorista está à frente do cronograma! Sua carga deve chegar antes do prazo previsto. Que eficiência!',
        cor: '#7C3AED',
        corFundo: '#F5F3FF',
        icone: '⚡',
      };
    case 'no_prazo':
      return {
        emoji: '👍',
        titulo: 'Tudo certo! Entrega dentro do prazo',
        mensagem: 'Sua carga está seguindo conforme o planejado e deve chegar dentro do prazo estipulado.',
        cor: '#059669',
        corFundo: '#ECFDF5',
        icone: '✔️',
      };
    default:
      return {
        emoji: '📋',
        titulo: 'Atualização da sua carga',
        mensagem: `O status da sua carga foi atualizado para: ${status}.`,
        cor: '#6B7280',
        corFundo: '#F9FAFB',
        icone: '📝',
      };
  }
}

function gerarEmailHTML(
  config: StatusConfig,
  notaFiscal: string,
  origemCidade: string,
  origemUf: string,
  destinoCidade: string,
  destinoUf: string,
  motoristaNome: string | null,
  razaoSocial: string,
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
        .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
        .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: ${config.cor}; color: white; padding: 32px 24px; text-align: center; }
        .header-emoji { font-size: 48px; margin-bottom: 12px; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .body { padding: 32px 24px; }
        .greeting { font-size: 16px; color: #374151; margin-bottom: 20px; }
        .status-box { background: ${config.corFundo}; border-left: 4px solid ${config.cor}; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
        .status-box p { margin: 0; color: #374151; font-size: 15px; }
        .info-grid { display: table; width: 100%; border-collapse: separate; border-spacing: 0 8px; margin-bottom: 24px; }
        .info-row { display: table-row; }
        .info-label { display: table-cell; padding: 8px 12px; background: #f9fafb; border-radius: 6px 0 0 6px; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 120px; }
        .info-value { display: table-cell; padding: 8px 12px; background: #f9fafb; border-radius: 0 6px 6px 0; font-size: 14px; color: #111827; font-weight: 500; }
        .route { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
        .route-point { display: flex; align-items: center; gap: 12px; }
        .route-dot-blue { width: 12px; height: 12px; background: #3b82f6; border-radius: 50%; flex-shrink: 0; }
        .route-dot-red { width: 12px; height: 12px; background: #ef4444; border-radius: 50%; flex-shrink: 0; }
        .route-line { width: 2px; height: 20px; background: #d1d5db; margin-left: 5px; }
        .route-text { font-size: 15px; font-weight: 600; color: #1f2937; }
        .footer { background: #061735; color: white; padding: 24px; text-align: center; }
        .footer p { margin: 4px 0; font-size: 12px; opacity: 0.8; }
        .footer .brand { font-size: 18px; font-weight: 900; font-style: italic; margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="card">
          <div class="header">
            <div class="header-emoji">${config.emoji}</div>
            <h1>${config.titulo}</h1>
          </div>
          
          <div class="body">
            <p class="greeting">Olá, <strong>${razaoSocial}</strong>!</p>
            
            <div class="status-box">
              <p>${config.icone} ${config.mensagem}</p>
            </div>

            <div class="route">
              <div class="route-point">
                <div class="route-dot-blue"></div>
                <span class="route-text">${origemCidade}/${origemUf}</span>
              </div>
              <div class="route-line"></div>
              <div class="route-point">
                <div class="route-dot-red"></div>
                <span class="route-text">${destinoCidade}/${destinoUf}</span>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-row">
                <div class="info-label">Nota Fiscal</div>
                <div class="info-value">${notaFiscal}</div>
              </div>
              ${motoristaNome ? `
              <div class="info-row">
                <div class="info-label">Motorista</div>
                <div class="info-value">${motoristaNome}</div>
              </div>
              ` : ''}
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="https://rastreamentobrat.com.br/" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">Acessar o Sistema</a>
              <p style="font-size: 13px; color: #9ca3af; margin-top: 12px;">
                Acesse o sistema para mais detalhes sobre sua carga.
              </p>
            </div>
          </div>

          <div class="footer">
            <div class="brand">BRATCARGAS</div>
            <p>Sistema de Rastreamento de Cargas</p>
            <p>&copy; 2025 BratCargas - Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getSubjectLine(status: string, notaFiscal: string): string {
  switch (status) {
    case 'aguardando':
      return `📋 Carga NF ${notaFiscal} - Nova carga registrada!`;
    case 'em_transito':
      return `🚚 Carga NF ${notaFiscal} - A caminho do destino!`;
    case 'entregue':
      return `✅ Carga NF ${notaFiscal} - Entregue com sucesso!`;
    case 'atrasado':
      return `⏰ Carga NF ${notaFiscal} - Alerta de atraso`;
    case 'adiantado':
      return `🚀 Carga NF ${notaFiscal} - Entrega adiantada!`;
    case 'no_prazo':
      return `👍 Carga NF ${notaFiscal} - Dentro do prazo`;
    default:
      return `📋 Carga NF ${notaFiscal} - Atualização de status`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { carga_id, status } = await req.json();

    if (!carga_id || !status) {
      return new Response(
        JSON.stringify({ error: "carga_id e status são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar dados da carga + empresa
    const { data: carga, error: cargaError } = await supabaseAdmin
      .from("cargas")
      .select("id, nota_fiscal, origem_cidade, origem_uf, destino_cidade, destino_uf, motorista_nome, embarcador_id")
      .eq("id", carga_id)
      .single();

    if (cargaError || !carga) {
      return new Response(
        JSON.stringify({ error: "Carga não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar email da empresa
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from("embarcadores")
      .select("razao_social, email_contato")
      .eq("id", carga.embarcador_id)
      .single();

    if (empresaError || !empresa || !empresa.email_contato) {
      return new Response(
        JSON.stringify({ error: "Empresa ou email não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = getStatusConfig(status);
    const subject = getSubjectLine(status, carga.nota_fiscal);
    const html = gerarEmailHTML(
      config,
      carga.nota_fiscal,
      carga.origem_cidade,
      carga.origem_uf,
      carga.destino_cidade,
      carga.destino_uf,
      carga.motorista_nome,
      empresa.razao_social,
    );

    // Enviar email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BratCargas <operacional@rastreamentobrat.com.br>',
        to: [empresa.email_contato],
        subject: subject,
        html: html,
      }),
    });

    const emailBody = await emailResponse.text();
    console.log('[NOTIF] Email enviado para:', empresa.email_contato, 'status:', emailResponse.status, 'body:', emailBody);

    return new Response(
      JSON.stringify({
        success: emailResponse.ok,
        emailEnviado: emailResponse.ok,
        destinatario: empresa.email_contato,
        status: status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[NOTIF] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
