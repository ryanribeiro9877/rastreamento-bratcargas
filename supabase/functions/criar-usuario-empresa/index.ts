// supabase/functions/criar-usuario-empresa/index.ts
// Edge Function para criar usuário de empresa e enviar email com credenciais

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CriarUsuarioRequest {
  razao_social: string;
  cnpj: string;
  email_contato: string;
  telefone?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

function gerarSenhaDefinitiva(tamanho: number = 16): string {
  // Gera uma senha forte e definitiva para o cliente
  const maiusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minusculas = 'abcdefghjkmnpqrstuvwxyz';
  const numeros = '23456789';
  const especiais = '!@#$%&*';
  
  // Garantir pelo menos um de cada tipo
  let senha = '';
  senha += maiusculas.charAt(Math.floor(Math.random() * maiusculas.length));
  senha += minusculas.charAt(Math.floor(Math.random() * minusculas.length));
  senha += numeros.charAt(Math.floor(Math.random() * numeros.length));
  senha += especiais.charAt(Math.floor(Math.random() * especiais.length));
  
  // Preencher o restante
  const todosCaracteres = maiusculas + minusculas + numeros + especiais;
  for (let i = senha.length; i < tamanho; i++) {
    senha += todosCaracteres.charAt(Math.floor(Math.random() * todosCaracteres.length));
  }
  
  // Embaralhar a senha
  return senha.split('').sort(() => Math.random() - 0.5).join('');
}

async function enviarEmailCredenciais(
  email: string,
  razaoSocial: string,
  senha: string,
  resendApiKey: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BratCargas <onboarding@resend.dev>',
        to: [email],
        subject: 'Bem-vindo ao Sistema BratCargas - Suas Credenciais de Acesso',
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
              .header h1 { font-family: 'Inter', sans-serif; font-weight: 900; font-style: italic; font-size: 32px; text-transform: uppercase; margin: 0; letter-spacing: 1px; }
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
                <h1>BRATCARGAS</h1>
                <p>Sistema de Rastreamento de Cargas</p>
              </div>
              <div class="content">
                <h2>Olá, ${razaoSocial}!</h2>
                <p>Sua empresa foi cadastrada com sucesso no sistema BratCargas.<br>Abaixo estão suas credenciais de acesso:</p>
                
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
                <p><a href="https://bratcargas.com.br/login" style="color: #2563eb;">https://bratcargas.com.br/login</a></p>
                
                <div class="warning">
                  <strong>⚠️ Importante:</strong>
                  <ul>
                    <li>Esta é sua senha de acesso ao sistema. Guarde-a em local seguro.</li>
                    <li>Você pode alterar sua senha a qualquer momento nas configurações do sistema.</li>
                    <li>Não compartilhe suas credenciais com terceiros.</li>
                    <li>Em caso de dúvidas, entre em contato com a cooperativa.</li>
                  </ul>
                </div>
              </div>
              <div class="footer">
                <p>Este é um e-mail automático. Por favor, não responda.</p>
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

    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Criar cliente Supabase com service role (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const dados: CriarUsuarioRequest = await req.json();

    // Validações
    if (!dados.razao_social || !dados.cnpj || !dados.email_contato) {
      return new Response(
        JSON.stringify({ error: "Dados obrigatórios não informados" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gerar senha definitiva única para o cliente
    const senhaDefinitiva = gerarSenhaDefinitiva(16);

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: dados.email_contato,
      password: senhaDefinitiva,
      email_confirm: true, // Confirmar email automaticamente
      user_metadata: {
        razao_social: dados.razao_social,
        tipo: 'embarcador',
      },
    });

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // 2. Criar empresa (embarcador)
    const { data: embarcadorData, error: embarcadorError } = await supabaseAdmin
      .from('embarcadores')
      .insert([{
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        email_contato: dados.email_contato,
        emails_alertas: [dados.email_contato],
        telefone: dados.telefone || null,
        ativo: true,
      }])
      .select()
      .single();

    if (embarcadorError) {
      // Se falhar, deletar o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      console.error('Erro ao criar embarcador:', embarcadorError);
      return new Response(
        JSON.stringify({ error: embarcadorError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Criar perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: userId,
        email: dados.email_contato,
        nome: dados.razao_social,
        tipo: 'embarcador',
        embarcador_id: embarcadorData.id,
      }]);

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Continuar mesmo com erro no perfil
    }

    // 4. Enviar email com credenciais
    let emailEnviado = false;
    if (resendApiKey) {
      emailEnviado = await enviarEmailCredenciais(
        dados.email_contato,
        dados.razao_social,
        senhaDefinitiva,
        resendApiKey
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Empresa e usuário criados com sucesso',
        embarcador_id: embarcadorData.id,
        user_id: userId,
        email_enviado: emailEnviado,
        // Retornar senha para exibição caso email não seja enviado
        senha: senhaDefinitiva,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
