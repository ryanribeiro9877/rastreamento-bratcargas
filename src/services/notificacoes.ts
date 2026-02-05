// services/notificacoes.ts - Sistema de Alertas e Notificações por Email

import { supabase } from './supabase';
import type { Carga, Alerta, TipoAlerta } from '../types';

/**
 * Serviço de notificações por email
 * Usa Supabase Edge Functions para enviar emails
 */

class NotificacoesService {
  /**
   * Envia alerta de entrega para embarcador
   */
  async enviarAlertaEntrega(carga: Carga): Promise<void> {
    try {
      // Buscar embarcador para pegar emails
      const { data: embarcador, error: embarcadorError } = await supabase
        .from('embarcadores')
        .select('razao_social, email_contato, emails_alertas')
        .eq('id', carga.embarcador_id)
        .single();

      if (embarcadorError) throw embarcadorError;

      // Preparar lista de emails
      const emails = [embarcador.email_contato, ...(embarcador.emails_alertas || [])];

      // Criar registro de alerta
      const { data: alerta, error: alertaError } = await supabase
        .from('alertas')
        .insert([
          {
            carga_id: carga.id,
            tipo: 'entrega',
            destinatario: 'embarcador',
            emails_enviados: emails,
            mensagem: this.gerarMensagemEntrega(carga, embarcador.razao_social),
            enviado: false
          }
        ])
        .select()
        .single();

      if (alertaError) throw alertaError;

      // Enviar email via Edge Function
      await this.enviarEmail({
        para: emails,
        assunto: `✅ Carga Entregue - NF ${carga.nota_fiscal}`,
        html: this.gerarHTMLEntrega(carga, embarcador.razao_social),
        alertaId: alerta.id
      });

      console.log('Alerta de entrega enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar alerta de entrega:', error);
      throw error;
    }
  }

  /**
   * Envia alerta de atraso para cooperativa
   */
  async enviarAlertaAtraso(carga: Carga): Promise<void> {
    try {
      // Buscar email da cooperativa (configuração)
      const emailCooperativa = import.meta.env.VITE_EMAIL_COOPERATIVA || 'operacao@braticargas.com.br';

      // Criar registro de alerta
      const { data: alerta, error: alertaError } = await supabase
        .from('alertas')
        .insert([
          {
            carga_id: carga.id,
            tipo: 'atraso',
            destinatario: 'cooperativa',
            emails_enviados: [emailCooperativa],
            mensagem: this.gerarMensagemAtraso(carga),
            enviado: false
          }
        ])
        .select()
        .single();

      if (alertaError) throw alertaError;

      // Enviar email
      await this.enviarEmail({
        para: [emailCooperativa],
        assunto: `⚠️ ALERTA: Carga em Atraso - NF ${carga.nota_fiscal}`,
        html: this.gerarHTMLAtraso(carga),
        alertaId: alerta.id
      });

      console.log('Alerta de atraso enviado para cooperativa');
    } catch (error) {
      console.error('Erro ao enviar alerta de atraso:', error);
      throw error;
    }
  }

  /**
   * Envia alerta de adiantamento para embarcador
   */
  async enviarAlertaAdiantamento(carga: Carga): Promise<void> {
    try {
      const { data: embarcador, error: embarcadorError } = await supabase
        .from('embarcadores')
        .select('razao_social, email_contato, emails_alertas')
        .eq('id', carga.embarcador_id)
        .single();

      if (embarcadorError) throw embarcadorError;

      const emails = [embarcador.email_contato, ...(embarcador.emails_alertas || [])];

      const { data: alerta, error: alertaError } = await supabase
        .from('alertas')
        .insert([
          {
            carga_id: carga.id,
            tipo: 'adiantamento',
            destinatario: 'embarcador',
            emails_enviados: emails,
            mensagem: this.gerarMensagemAdiantamento(carga, embarcador.razao_social),
            enviado: false
          }
        ])
        .select()
        .single();

      if (alertaError) throw alertaError;

      await this.enviarEmail({
        para: emails,
        assunto: `🚀 Carga Adiantada - NF ${carga.nota_fiscal}`,
        html: this.gerarHTMLAdiantamento(carga, embarcador.razao_social),
        alertaId: alerta.id
      });

      console.log('Alerta de adiantamento enviado');
    } catch (error) {
      console.error('Erro ao enviar alerta de adiantamento:', error);
      throw error;
    }
  }

  /**
   * Envia email via Supabase Edge Function
   */
  private async enviarEmail(params: {
    para: string[];
    assunto: string;
    html: string;
    alertaId: string;
  }): Promise<void> {
    try {
      // Chamar Edge Function para enviar email
      const { data, error } = await supabase.functions.invoke('enviar-email', {
        body: {
          to: params.para,
          subject: params.assunto,
          html: params.html
        }
      });

      if (error) throw error;

      // Marcar alerta como enviado
      await supabase
        .from('alertas')
        .update({
          enviado: true,
          enviado_em: new Date().toISOString()
        })
        .eq('id', params.alertaId);

      console.log('Email enviado com sucesso:', data);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  /**
   * Gera mensagem de texto para entrega
   */
  private gerarMensagemEntrega(carga: Carga, razaoSocial: string): string {
    return `Prezado(a) ${razaoSocial},

Informamos que a carga referente à Nota Fiscal ${carga.nota_fiscal} foi entregue com sucesso!

Detalhes da Entrega:
- Origem: ${carga.origem_cidade}/${carga.origem_uf}
- Destino: ${carga.destino_cidade}/${carga.destino_uf}
- Data de Entrega: ${new Date(carga.data_entrega_real!).toLocaleString('pt-BR')}
- Motorista: ${carga.motorista_nome || 'Não informado'}
- Placa: ${carga.placa_veiculo || 'Não informado'}

Atenciosamente,
BratCargas`;
  }

  /**
   * Gera mensagem de atraso
   */
  private gerarMensagemAtraso(carga: Carga): string {
    return `ALERTA: Carga em possível atraso!

Nota Fiscal: ${carga.nota_fiscal}
Rota: ${carga.origem_cidade}/${carga.origem_uf} → ${carga.destino_cidade}/${carga.destino_uf}
Prazo de Entrega: ${new Date(carga.prazo_entrega).toLocaleString('pt-BR')}
Motorista: ${carga.motorista_nome || 'Não informado'}
Telefone: ${carga.motorista_telefone || 'Não informado'}

Ação necessária: Entrar em contato com o motorista.`;
  }

  /**
   * Gera mensagem de adiantamento
   */
  private gerarMensagemAdiantamento(carga: Carga, razaoSocial: string): string {
    return `Prezado(a) ${razaoSocial},

Ótimas notícias! A carga NF ${carga.nota_fiscal} está adiantada em sua rota de entrega!

Rota: ${carga.origem_cidade}/${carga.origem_uf} → ${carga.destino_cidade}/${carga.destino_uf}
Prazo Original: ${new Date(carga.prazo_entrega).toLocaleString('pt-BR')}

Continue acompanhando em tempo real pelo sistema.

Atenciosamente,
BratCargas`;
  }

  /**
   * Gera HTML para email de entrega
   */
  private gerarHTMLEntrega(carga: Carga, razaoSocial: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #10b981; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Carga Entregue com Sucesso!</h1>
    </div>
    <div class="content">
      <p>Prezado(a) <strong>${razaoSocial}</strong>,</p>
      <p>Informamos que a carga foi entregue com sucesso!</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="label">Nota Fiscal:</span> ${carga.nota_fiscal}
        </div>
        <div class="info-row">
          <span class="label">Origem:</span> ${carga.origem_cidade}/${carga.origem_uf}
        </div>
        <div class="info-row">
          <span class="label">Destino:</span> ${carga.destino_cidade}/${carga.destino_uf}
        </div>
        <div class="info-row">
          <span class="label">Data de Entrega:</span> ${new Date(carga.data_entrega_real!).toLocaleString('pt-BR')}
        </div>
        <div class="info-row">
          <span class="label">Motorista:</span> ${carga.motorista_nome || 'Não informado'}
        </div>
        <div class="info-row">
          <span class="label">Placa:</span> ${carga.placa_veiculo || 'Não informado'}
        </div>
      </div>
      
      <p>Obrigado por confiar na BratCargas!</p>
    </div>
    <div class="footer">
      <p>BratCargas - Cooperativa de Transporte</p>
      <p>Este é um email automático, não responda.</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Gera HTML para email de atraso
   */
  private gerarHTMLAtraso(carga: Carga): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: #fee2e2; padding: 15px; margin: 15px 0; border-left: 4px solid #ef4444; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ ALERTA: Carga em Atraso</h1>
    </div>
    <div class="content">
      <p><strong>Atenção Equipe BratCargas!</strong></p>
      <p>A carga abaixo está com possível atraso na entrega:</p>
      
      <div class="alert-box">
        <div class="info-row">
          <span class="label">NF:</span> ${carga.nota_fiscal}
        </div>
        <div class="info-row">
          <span class="label">Rota:</span> ${carga.origem_cidade}/${carga.origem_uf} → ${carga.destino_cidade}/${carga.destino_uf}
        </div>
        <div class="info-row">
          <span class="label">Prazo:</span> ${new Date(carga.prazo_entrega).toLocaleString('pt-BR')}
        </div>
        <div class="info-row">
          <span class="label">Motorista:</span> ${carga.motorista_nome || 'Não informado'}
        </div>
        <div class="info-row">
          <span class="label">Telefone:</span> ${carga.motorista_telefone || 'Não informado'}
        </div>
      </div>
      
      <p><strong>Ação necessária:</strong> Entrar em contato com o motorista imediatamente!</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Gera HTML para email de adiantamento
   */
  private gerarHTMLAdiantamento(carga: Carga, razaoSocial: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: #dbeafe; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Carga Adiantada!</h1>
    </div>
    <div class="content">
      <p>Prezado(a) <strong>${razaoSocial}</strong>,</p>
      <p>Ótimas notícias! Sua carga está adiantada!</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="label">NF:</span> ${carga.nota_fiscal}
        </div>
        <div class="info-row">
          <span class="label">Rota:</span> ${carga.origem_cidade}/${carga.origem_uf} → ${carga.destino_cidade}/${carga.destino_uf}
        </div>
        <div class="info-row">
          <span class="label">Prazo Original:</span> ${new Date(carga.prazo_entrega).toLocaleString('pt-BR')}
        </div>
      </div>
      
      <p>Continue acompanhando em tempo real pelo sistema!</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Monitora cargas e dispara alertas automaticamente
   */
  async monitorarCargas(): Promise<void> {
    try {
      // Buscar cargas em trânsito
      const { data: cargas, error } = await supabase
        .from('cargas')
        .select('*, embarcador:embarcadores(*)')
        .eq('status', 'em_transito')
        .eq('ativo', true);

      if (error) throw error;

      for (const carga of cargas || []) {
        // Verificar se já enviou alerta recentemente (evitar spam)
        const { data: alertaRecente } = await supabase
          .from('alertas')
          .select('created_at')
          .eq('carga_id', carga.id)
          .eq('tipo', carga.status_prazo === 'atrasado' ? 'atraso' : 'adiantamento')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // últimas 24h
          .single();

        if (alertaRecente) continue; // Já enviou alerta recente

        // Disparar alerta baseado no status
        if (carga.status_prazo === 'atrasado') {
          await this.enviarAlertaAtraso(carga);
        } else if (carga.status_prazo === 'adiantado') {
          await this.enviarAlertaAdiantamento(carga);
        }
      }
    } catch (error) {
      console.error('Erro ao monitorar cargas:', error);
    }
  }
}

// Exportar instância única
export const notificacoesService = new NotificacoesService();
export default notificacoesService;
