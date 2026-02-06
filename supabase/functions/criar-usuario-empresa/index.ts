// supabase/functions/criar-usuario-empresa/index.ts
// Edge Function para criar usuário de empresa e enviar email com credenciais

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function gerarSenhaAleatoria(tamanho = 10): string {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return senha;
}

async function enviarEmailCredenciais(
  email: string,
  senha: string,
  razaoSocial: string,
  resendApiKey: string
): Promise<boolean> {
  try {
    console.log('[EMAIL] Tentando enviar email para:', email, 'com key:', resendApiKey?.substring(0, 8) + '...');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BratCargas <operacional@rastreamentobrat.com.br>',
        to: [email],
        subject: 'Bem-vindo ao BratCargas - Suas credenciais de acesso',
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
                <h2>Ola, ${razaoSocial}!</h2>
                <p>Sua empresa foi cadastrada com sucesso no sistema BratCargas.<br>Abaixo estao suas credenciais de acesso:</p>
                
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
                
                <div class="warning">
                  <strong>Importante:</strong>
                  <ul>
                    <li>Esta e sua senha de acesso ao sistema. Guarde-a em local seguro.</li>
                    <li>Voce pode alterar sua senha a qualquer momento nas configuracoes do sistema.</li>
                    <li>Nao compartilhe suas credenciais com terceiros.</li>
                    <li>Em caso de duvidas, entre em contato com a cooperativa.</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>Este e um e-mail automatico. Por favor, nao responda.</p>
                <p>© ${new Date().getFullYear()} BratCargas - Todos os direitos reservados</p>
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const razaoSocial = body.razaoSocial || body.razao_social;
    const cnpj = body.cnpj;
    const emailContato = body.emailContato || body.email_contato;
    const telefone = body.telefone;

    if (!razaoSocial || !cnpj || !emailContato) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatorios: razao_social, cnpj, email_contato" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: empresaExistente } = await supabaseAdmin
      .from("embarcadores")
      .select("id")
      .eq("cnpj", cnpj)
      .single();

    if (empresaExistente) {
      return new Response(
        JSON.stringify({ error: "Ja existe uma empresa cadastrada com este CNPJ" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: usuarioExistente } = await supabaseAdmin
      .from("usuarios_embarcadores")
      .select("id")
      .eq("email", emailContato)
      .single();

    if (usuarioExistente) {
      return new Response(
        JSON.stringify({ error: "Ja existe um usuario cadastrado com este email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senhaGerada = gerarSenhaAleatoria(10);

    let authUserId: string;

    // Tentar criar usuario no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailContato,
      password: senhaGerada,
      email_confirm: true,
      user_metadata: { tipo: 'embarcador', razao_social: razaoSocial },
    });

    if (authError) {
      // Se o email ja existe no Auth (empresa foi excluida mas auth ficou),
      // deletar o usuario antigo e criar um novo
      if (authError.message?.includes('already been registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData?.users?.find((u: any) => u.email === emailContato);
        if (existingUser) {
          // Limpar vinculo antigo se existir
          await supabaseAdmin.from("usuarios_embarcadores").delete().eq("user_id", existingUser.id);
          // Deletar usuario antigo do Auth
          await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
          // Criar novo usuario com nova senha
          const { data: newAuthData, error: newAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: emailContato,
            password: senhaGerada,
            email_confirm: true,
            user_metadata: { tipo: 'embarcador', razao_social: razaoSocial },
          });
          if (newAuthError || !newAuthData?.user) {
            return new Response(
              JSON.stringify({ error: `Erro ao recriar usuario: ${newAuthError?.message || 'Erro desconhecido'}` }),
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

    const { data: embarcador, error: embarcadorError } = await supabaseAdmin
      .from("embarcadores")
      .insert({
        razao_social: razaoSocial,
        cnpj: cnpj,
        email_contato: emailContato,
        telefone: telefone || null,
      })
      .select()
      .single();

    if (embarcadorError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return new Response(
        JSON.stringify({ error: `Erro ao criar empresa: ${embarcadorError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: vinculoError } = await supabaseAdmin
      .from("usuarios_embarcadores")
      .insert({
        user_id: authUserId,
        embarcador_id: embarcador.id,
        nome: razaoSocial,
        email: emailContato,
        ativo: true,
      });

    if (vinculoError) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      await supabaseAdmin.from("embarcadores").delete().eq("id", embarcador.id);
      return new Response(
        JSON.stringify({ error: `Erro ao vincular usuario: ${vinculoError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailEnviado = false;
    console.log('[EDGE] RESEND_API_KEY presente?', !!resendApiKey, resendApiKey ? resendApiKey.substring(0, 8) + '...' : 'VAZIO');
    if (resendApiKey) {
      emailEnviado = await enviarEmailCredenciais(emailContato, senhaGerada, razaoSocial, resendApiKey);
      console.log('[EDGE] emailEnviado:', emailEnviado);
    } else {
      console.log('[EDGE] RESEND_API_KEY nao configurada, pulando envio de email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Empresa e usuario criados com sucesso",
        embarcador: embarcador,
        usuario: { id: authUserId, email: emailContato },
        senhaGerada: senhaGerada,
        emailEnviado: emailEnviado,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Erro interno: ${(error as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
