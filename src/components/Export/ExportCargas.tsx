// components/Export/ExportCargas.tsx - Exportar Cargas para Excel/PDF

import { useState } from 'react';
import type { Carga } from '../../types';
import { formatarDataHora, formatarToneladas, formatarDistancia } from '../../utils/formatters';

interface ExportCargasProps {
  cargas: Carga[];
  nomeArquivo?: string;
}

export default function ExportCargas({ cargas, nomeArquivo = 'cargas' }: ExportCargasProps) {
  const [exportando, setExportando] = useState(false);

  // Exportar para CSV (pode abrir no Excel)
  function exportarCSV() {
    setExportando(true);

    try {
      // Cabeçalhos
      const headers = [
        'Nota Fiscal',
        'Embarcador',
        'Origem',
        'Destino',
        'Toneladas',
        'Status',
        'Status Prazo',
        'Motorista',
        'Placa',
        'Data Carregamento',
        'Prazo Entrega',
        'Distância (km)'
      ].join(',');

      // Dados
      const rows = cargas.map(carga => [
        carga.nota_fiscal,
        carga.embarcador?.razao_social || '',
        `${carga.origem_cidade}/${carga.origem_uf}`,
        `${carga.destino_cidade}/${carga.destino_uf}`,
        carga.toneladas,
        carga.status,
        carga.status_prazo,
        carga.motorista_nome || '',
        carga.placa_veiculo || '',
        formatarDataHora(carga.data_carregamento),
        formatarDataHora(carga.prazo_entrega),
        carga.distancia_total_km.toFixed(2)
      ].map(field => `"${field}"`).join(','));

      const csv = [headers, ...rows].join('\n');

      // Download
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${nomeArquivo}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao exportar arquivo');
    } finally {
      setExportando(false);
    }
  }

  // Exportar para JSON
  function exportarJSON() {
    setExportando(true);

    try {
      const json = JSON.stringify(cargas, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${nomeArquivo}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar JSON:', error);
      alert('Erro ao exportar arquivo');
    } finally {
      setExportando(false);
    }
  }

  // Imprimir (pode salvar como PDF no navegador)
  function imprimir() {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) {
      alert('Popup bloqueado! Permita popups para imprimir.');
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Cargas</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          h1 {
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 12px;
          }
          th {
            background-color: #2563eb;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .status {
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: bold;
          }
          .status.no_prazo { background: #dcfce7; color: #16a34a; }
          .status.atrasado { background: #fee2e2; color: #dc2626; }
          .status.adiantado { background: #dbeafe; color: #2563eb; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>BratCargas - Relatório de Cargas</h1>
        <p><strong>Data:</strong> ${formatarDataHora(new Date().toISOString())}</p>
        <p><strong>Total de Cargas:</strong> ${cargas.length}</p>
        
        <table>
          <thead>
            <tr>
              <th>NF</th>
              <th>Embarcador</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Toneladas</th>
              <th>Motorista</th>
              <th>Status</th>
              <th>Prazo</th>
            </tr>
          </thead>
          <tbody>
            ${cargas.map(carga => `
              <tr>
                <td>${carga.nota_fiscal}</td>
                <td>${carga.embarcador?.razao_social || '—'}</td>
                <td>${carga.origem_cidade}/${carga.origem_uf}</td>
                <td>${carga.destino_cidade}/${carga.destino_uf}</td>
                <td>${formatarToneladas(carga.toneladas)}</td>
                <td>${carga.motorista_nome || '—'}</td>
                <td><span class="status ${carga.status_prazo}">${carga.status_prazo.toUpperCase()}</span></td>
                <td>${formatarDataHora(carga.prazo_entrega)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Imprimir / Salvar PDF
        </button>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        onClick={() => document.getElementById('export-menu')?.classList.toggle('hidden')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Exportar
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Menu Dropdown */}
      <div
        id="export-menu"
        className="hidden absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
      >
        <button
          onClick={exportarCSV}
          disabled={exportando}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-3"
        >
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar Excel (CSV)
        </button>

        <button
          onClick={exportarJSON}
          disabled={exportando}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-3"
        >
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Exportar JSON
        </button>

        <button
          onClick={imprimir}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-3"
        >
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir / PDF
        </button>

        <div className="border-t border-gray-200 my-2" />

        <div className="px-4 py-2 text-xs text-gray-500">
          {cargas.length} carga(s) selecionada(s)
        </div>
      </div>
    </div>
  );
}
