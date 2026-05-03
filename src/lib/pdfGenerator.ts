import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ClientData {
  name: string;
  phone: string;
  address: string;
  idDocument: string;
  email: string;
}

const colors = {
  primary: '#2563eb',
  secondary: '#1e293b',
  accent: '#16a34a',
  lightText: '#64748b',
  border: '#e2e8f0'
};

// Generador de PDF con soporte bimonetario (USD/Bs)
export const generatePDF = (
  items: any[],
  clientData: ClientData,
  subtotal: number,
  storeName: string,
  exchangeRate: number // Tasa BCV recibida
) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString();
  const totalBs = subtotal * exchangeRate;

  try {
    // --- 1. ENCABEZADO ---
    // Logo Placeholder (Vectorial para evitar errores de PNG)
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(14, 15, 25, 25, 2, 2, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(8);
    doc.text("LOGO", 20, 30);

    doc.setFontSize(22);
    doc.setTextColor(colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.text(storeName.toUpperCase(), 45, 25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(colors.lightText);
    doc.text("Factura Digital Bimonetaria - Aura App", 45, 30);
    doc.text(`Fecha: ${date} | Tasa: ${exchangeRate.toFixed(2)} Bs/$`, 45, 35);

    // Indicador de Marca Aura
    doc.setFillColor(0, 0, 0);
    doc.circle(180, 25, 10, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(10);
    doc.text("A", 178, 28);

    // --- 2. INFORMACIÓN DEL CLIENTE ---
    doc.setDrawColor(colors.border);
    doc.line(14, 45, 196, 45);

    doc.setFontSize(10);
    doc.setTextColor(colors.secondary);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE:", 14, 55);

    doc.setFont("helvetica", "normal");
    doc.text([
      `Nombre: ${clientData.name}`,
      `C.I./RIF: ${clientData.idDocument}`,
      `Email: ${clientData.email}`,
      `Teléfono: ${clientData.phone}`
    ], 14, 62, { lineHeightFactor: 1.5 });

    doc.setFont("helvetica", "bold");
    doc.text("LUGAR DE ENTREGA:", 110, 55);
    doc.setFont("helvetica", "normal");
    const splitAddress = doc.splitTextToSize(clientData.address, 80);
    doc.text(splitAddress, 110, 62);

    // --- 3. TABLA DE PRODUCTOS (USD y Bs) ---
    const tableData = items.map((item) => {
      const originalPrice = item.price;
      const discount = item.discount_percent || 0;
      const finalUnitPrice = originalPrice * (1 - discount / 100);
      const subtotalUSD = finalUnitPrice * item.quantity;
      const subtotalBs = subtotalUSD * exchangeRate;

      return [
        item.name,
        `$${originalPrice.toFixed(2)}`,
        discount > 0 ? `${discount}%` : '-',
        item.quantity.toString(),
        `$${subtotalUSD.toFixed(2)}`,
        `${subtotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`
      ];
    });

    autoTable(doc, {
      startY: 85,
      head: [['Producto', 'Precio ($)', 'Desc.', 'Cant.', 'Subtotal ($)', 'Subtotal (Bs)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: '#ffffff',
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center' },
        2: { halign: 'center', textColor: [22, 163, 74] },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: '#f8faff' }
    });

    // --- 4. CUADRO DE TOTALES DUAL ---
    const finalTableY = (doc as any).lastAutoTable.finalY || 150;
    const finalY = finalTableY + 10;

    // Caja de Total en USD
    doc.setFillColor(colors.secondary);
    doc.roundedRect(130, finalY, 66, 18, 2, 2, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(9);
    doc.text("TOTAL DÓLARES", 135, finalY + 7);
    doc.setFontSize(14);
    doc.text(`$${subtotal.toFixed(2)}`, 135, finalY + 14);

    // Caja de Total en Bs
    doc.setFillColor('#f1f5f9');
    doc.roundedRect(130, finalY + 20, 66, 18, 2, 2, 'F');
    doc.setTextColor(colors.secondary);
    doc.setFontSize(9);
    doc.text("TOTAL BOLÍVARES (BCV)", 135, finalY + 27);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.`, 135, finalY + 34);

    // --- 5. PIE DE PÁGINA (SERVICIOS KRAKEN) ---
    const footerY = 275;

    doc.setDrawColor(colors.primary);
    doc.setLineWidth(0.5);
    doc.line(14, footerY - 5, 196, footerY - 5);

    doc.setFontSize(10);
    doc.setTextColor(colors.primary);
    doc.setFont("helvetica", "bold");
    doc.text("SERVICIOS KRAKEN", 14, footerY + 5);

    doc.setFontSize(8);
    doc.setTextColor(colors.lightText);
    doc.setFont("helvetica", "italic");
    doc.text([
      "Comprobante de pedido digital con tasa oficial BCV.",
      "Gracias por su compra en Aura.",
      `© ${new Date().getFullYear()} Servicios Kraken - Cumaná, Venezuela`
    ], 110, footerY + 2, { align: "center" });

    return doc.output('blob');
  } catch (error) {
    console.error("Error al generar PDF:", error);
    throw error;
  }
};