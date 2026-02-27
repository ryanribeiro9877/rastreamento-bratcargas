// supabase/functions/criar-usuario-consulta/index.ts
// Edge Function para criar usuário de consulta (somente leitura) vinculado a uma empresa

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

function gerarSenhaAleatoria(tamanho = 10): string {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomValues = new Uint32Array(tamanho);
  crypto.getRandomValues(randomValues);
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += caracteres.charAt(randomValues[i] % caracteres.length);
  }
  return senha;
}

async function enviarEmailCredenciais(
  email: string,
  senha: string,
  nomeUsuario: string,
  razaoSocial: string,
  resendApiKey: string
): Promise<boolean> {
  try {
    console.log('[EMAIL] Enviando credenciais de consulta para:', email);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BratCargas <operacional@rastreamentobrat.com.br>',
        to: [email],
        subject: 'BratCargas - Acesso de Consulta',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <link href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@1,900&display=swap" rel="stylesheet">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #061735; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .header h1 { font-family: 'Inter', sans-serif; font-weight: 900; font-style: italic; font-size: 32px; margin: 0; letter-spacing: 1px; }
              .header p { margin: 5px 0 0 0; font-size: 14px; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-bottom: none; text-align: center; }
              .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center; }
              .credential-item { margin: 10px 0; }
              .credential-label { font-weight: bold; color: #6b7280; }
              .credential-value { font-size: 18px; color: #1f2937; font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block; }
              .info-box { background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: left; }
              .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: left; }
              .footer { text-align: center; padding: 15px 20px; color: #6b7280; font-size: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; }
              .footer p { margin: 3px 0; }
              .logo-container { background: #061735; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>BRATCargas</h1>
                <p>Sistema de Rastreamento de Cargas</p>
              </div>
              <div class="content">
                <h2>Ola, ${nomeUsuario}!</h2>
                <p>Voce recebeu acesso de <strong>consulta</strong> ao sistema BratCargas para a empresa <strong>${razaoSocial}</strong>.</p>
                
                <div class="credentials">
                  <div class="credential-item">
                    <div class="credential-label">E-mail de acesso:</div>
                    <div class="credential-value">${email}</div>
                  </div>
                  <div class="credential-item">
                    <div class="credential-label">Senha:</div>
                    <div class="credential-value">${senha}</div>
                  </div>
                </div>
                
                <p>Para acessar o sistema, utilize o link abaixo:</p>
                <p><a href="https://rastreamentobrat.com.br/" style="color: #2563eb;">https://rastreamentobrat.com.br/</a></p>
                
                <div class="info-box">
                  <strong>Sobre seu acesso:</strong>
                  <ul>
                    <li>Voce possui acesso de <strong>consulta</strong> (somente leitura).</li>
                    <li>Voce pode visualizar as cargas e acompanhar o rastreamento.</li>
                    <li>Para criar ou editar cargas, entre em contato com o gerente da empresa.</li>
                  </ul>
                </div>

                <div class="warning">
                  <strong>Importante:</strong>
                  <ul>
                    <li>Guarde sua senha em local seguro.</li>
                    <li>Voce pode alterar sua senha nas configuracoes do sistema.</li>
                    <li>Nao compartilhe suas credenciais com terceiros.</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>Este e um e-mail automatico. Por favor, nao responda.</p>
                <p>&copy; ${new Date().getFullYear()} BratCargas - Todos os direitos reservados</p>
              </div>
              <div class="logo-container">
                <img src="https://eytxgejxpsuotnbmvxao.supabase.co/storage/v1/object/public/assets/bratlogo%20principal.png" alt="BratCargas" width="120" style="width: 120px; height: auto; display: block; margin: 0 auto;" />
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });
    const responseBody = await response.text();
    console.log('[EMAIL] Resend response status:', response.status, 'body:', responseBody);
    return response.ok;
  } catch (error) {
    console.error('[EMAIL] Erro ao enviar email:', error);
    return false;
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Verificar autenticacao do chamador
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Nao autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verificar quem esta chamando (deve ser um gerente de empresa)
    const supabaseCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user: callerUser }, error: callerError } = await supabaseCaller.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Nao autorizado - usuario invalido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se o chamador e gerente de alguma empresa
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("usuarios_embarcadores")
      .select("id, embarcador_id, role, embarcador:embarcadores(razao_social)")
      .eq("user_id", callerUser.id)
      .eq("role", "gerente")
      .eq("ativo", true)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: "Apenas gerentes de empresa podem criar usuarios de consulta" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { email, nome } = body;

    if (!email || !nome) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatorios: email, nome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se ja existe usuario com este email na mesma empresa
    const { data: existente } = await supabaseAdmin
      .from("usuarios_embarcadores")
      .select("id")
      .eq("email", email)
      .eq("embarcador_id", callerProfile.embarcador_id)
      .single();

    if (existente) {
      return new Response(
        JSON.stringify({ error: "Ja existe um usuario com este email nesta empresa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senhaGerada = gerarSenhaAleatoria(10);
    let authUserId: string;

    // Criar usuario no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: senhaGerada,
      email_confirm: true,
      user_metadata: { tipo: 'embarcador', role: 'consulta', nome: nome },
    });

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        // Email ja existe no Auth - verificar se esta vinculado a outra empresa
        const { data: outroVinculo } = await supabaseAdmin
          .from("usuarios_embarcadores")
          .select("id, embarcador_id")
          .eq("email", email)
          .single();

        if (outroVinculo) {
          return new Response(
            JSON.stringify({ error: "Este email ja esta vinculado a outra empresa no sistema" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Usuario existe no Auth mas sem vinculo - buscar e reutilizar
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === email);
        if (existingUser) {
          // Deletar e recriar com nova senha
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
          const { data: newAuthData, error: newAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: senhaGerada,
            email_confirm: true,
            user_metadata: { tipo: 'embarcador', role: 'consulta', nome: nome },
          });
          if (newAuthError || !newAuthData?.user) {
            return new Response(
              JSON.stringify({ error: `Erro ao criar usuario: ${newAuthError?.message || 'Erro desconhecido'}` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          authUserId = newAuthData.user.id;
        } else {
          return new Response(
            JSON.stringify({ error: `Erro ao criar usuario: ${authError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuario: ${authError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      authUserId = authData.user.id;
    }

    // Criar vinculo na tabela usuarios_embarcadores com role 'consulta'
    const { error: vinculoError } = await supabaseAdmin
      .from("usuarios_embarcadores")
      .insert({
        user_id: authUserId,
        embarcador_id: callerProfile.embarcador_id,
        nome: nome,
        email: email,
        role: "consulta",
        ativo: true,
      });

    if (vinculoError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return new Response(
        JSON.stringify({ error: `Erro ao vincular usuario: ${vinculoError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enviar email com credenciais
    const razaoSocial = (callerProfile.embarcador as any)?.razao_social || 'Empresa';
    let emailEnviado = false;
    if (resendApiKey) {
      emailEnviado = await enviarEmailCredenciais(email, senhaGerada, nome, razaoSocial, resendApiKey);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Usuario de consulta criado com sucesso",
        usuario: { id: authUserId, email, nome, role: "consulta" },
        emailEnviado: emailEnviado,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[EDGE] Erro:', error);
    return new Response(
      JSON.stringify({ error: `Erro interno: ${(error as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
