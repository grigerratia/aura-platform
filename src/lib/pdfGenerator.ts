import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Definimos el tipo para los datos del cliente
interface ClientData {
  name: string;
  phone: string;
  address: string;
  idDocument: string;
  email: string;
}

export const generatePDF = (items: any[], clientData: ClientData, subtotal: number) => {
  const doc = new jsPDF();

  // 1. Encabezado de la Empresa
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Color slate-900
  doc.text("Aura", 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Tu tienda online", 14, 23);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Factura de Pedido Digital", 14, 28);

  // 2. Información del Cliente
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Datos del Cliente:", 14, 45);
  doc.setFontSize(10);
  doc.text([
    `Nombre: ${clientData.name}`,
    `Documento: ${clientData.idDocument}`,
    `Email: ${clientData.email}`,
    `Teléfono: ${clientData.phone}`,
    `Dirección: ${clientData.address}`
  ], 14, 52);

  // 3. Tabla de Productos
  const tableData = items.map((item) => [
    item.name,
    item.quantity.toString(),
    `$${(item.price * item.quantity).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Producto', 'Cant.', 'Subtotal']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] }, // Azul profesional
  });

  // 4. Total Final
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text(`Total a pagar: $${subtotal.toFixed(2)}`, 14, finalY);

  // 5. Pie de página
  doc.setFontSize(8);
  doc.text("Gracias por confiar en Aura.", 14, 280);

  // Retornar el archivo como Blob
  return doc.output('blob');
};