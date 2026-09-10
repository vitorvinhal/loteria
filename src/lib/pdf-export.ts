import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface JogoPDF {
  dezenas: number[];
  score: number | null;
  loteria: string;
  estrategia: string;
  criado_em: string;
}

interface PDFExportOptions {
  jogos: JogoPDF[];
  titulo?: string;
}

function formatarDezenas(dezenas: number[]): string {
  return dezenas.map((d) => String(d).padStart(2, '0')).join(' - ');
}

function formatarData(dataStr: string): string {
  try {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dataStr;
  }
}

function formatarScore(score: number | null): string {
  if (score === null || score === undefined) return '-';
  return `${score.toFixed(1)}%`;
}

export function exportarPDF({ jogos, titulo = 'Loterias CAIXA - Jogos' }: PDFExportOptions): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(45, 45, 45);
  doc.text(titulo, 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Gerado em: ${dataAtual}`, 14, 25);
  doc.text(`Total de jogos: ${jogos.length}`, pageWidth - 14, 25, { align: 'right' });

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 28, pageWidth - 14, 28);

  const head = [['#', 'Loteria', 'Estratégia', 'Dezenas', 'Score', 'Data']];
  const body = jogos.map((jogo, index) => [
    String(index + 1),
    jogo.loteria,
    jogo.estrategia,
    formatarDezenas(jogo.dezenas),
    formatarScore(jogo.score),
    formatarData(jogo.criado_em),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 32,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'ellipsize',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: [30, 30, 30],
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 255],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 35 },
      3: { cellWidth: 70 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 40 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const scoreStr = data.cell.raw as string;
        const scoreVal = parseFloat(scoreStr);
        if (!isNaN(scoreVal)) {
          if (scoreVal >= 80) {
            data.cell.styles.textColor = [22, 163, 74];
            data.cell.styles.fontStyle = 'bold';
          } else if (scoreVal >= 60) {
            data.cell.styles.textColor = [234, 179, 8];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Aviso: Loterias são jogos de azar. Estatísticas não garantem resultados. Jogue com responsabilidade.',
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      const pageNum = data.pageNumber;
      doc.text(
        `Página ${pageNum}`,
        pageWidth - 14,
        pageHeight - 8,
        { align: 'right' }
      );
    },
  });

  const nomeArquivo = `loterias-caixa-${Date.now()}.pdf`;
  doc.save(nomeArquivo);
}
