'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useCart } from '@/store/useCart';
import { MessageCircle, ShieldCheck, User, Loader2, Tag, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { generatePDF } from '@/lib/pdfGenerator';
import { uploadOrderPDF, saveOrderToDb } from '@/lib/orders';
import getDolarTasa from '@/util/getDolarTasa';

function CheckoutContent() {
  const router = useRouter();
  const { items } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tasa, setTasa] = useState<number | null>(null);

  useEffect(() => {
    getDolarTasa().then((valor) => setTasa(valor));
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    idDocument: '',
    email: ''
  });

  // Lógica local para calcular el precio final asegurando el uso de discount_percent
  const getFinalPrice = (item: any) => {
    const activeDiscount = (item as any).discount_percent;
    const hasDbDiscountPercent = typeof activeDiscount === 'number' && activeDiscount > 0;
    const hasDbSalePrice = typeof item.sale_price === 'number' && item.sale_price < item.price;

    if (hasDbDiscountPercent) return item.price * (1 - activeDiscount / 100);
    if (hasDbSalePrice) return item.sale_price;
    return item.price;
  };

  const subtotal = items.reduce((acc, item) => acc + (getFinalPrice(item) * item.quantity), 0);
  const totalSinDescuento = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const ahorroTotal = totalSinDescuento - subtotal;
  const totalBs = tasa ? subtotal * tasa : 0;

  const inputClass = "w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900 placeholder:text-slate-400";

  const handleFinalizeOrder = async () => {
    if (!formData.name || !formData.phone || !formData.address) {
      alert("Por favor, completa los campos obligatorios.");
      return;
    }

    setIsProcessing(true);
    try {
      const safeName = formData.name.replace(/[^a-zA-Z0-9]/g, '_');
      const pdfBlob = generatePDF(items, formData, subtotal);
      const fileName = `Factura_${Date.now()}_${safeName}.pdf`;

      const pdfUrl = await uploadOrderPDF(pdfBlob, fileName);

      await saveOrderToDb({
        store_id: '8a6cedda-2d76-4c48-bb83-ad474b67f6d1',
        customer_info: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          idDocument: formData.idDocument,
          address: formData.address
        },
        total_usd: subtotal,
        total_ves: totalBs,
        pdf_url: pdfUrl,
        items: items,
        status: 'pendiente'
      });

      const waLink = useCart.getState().generateWhatsAppLink(
        "584248037379",
        "Aura",
        { ...formData, pdfUrl }
      );

      window.open(waLink, "_blank");
      useCart.getState().clearCart();
      setIsSuccess(true);
    } catch (error) {
      console.error("Error al procesar el pedido:", error);
      alert("Hubo un problema al procesar tu pedido. Intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="max-w-2xl w-full bg-white p-8 sm:p-12 rounded-3xl shadow-sm border border-slate-200 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-4">Pedido generado exitosamente</h1>
          <p className="text-lg text-slate-600 mb-8">
            Se ha abierto una ventana de WhatsApp para que envíes tu solicitud.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-left mb-10">
            <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2 mb-4">
              <AlertCircle size={22} className="text-amber-600" />
              Aviso Importante sobre su Pedido
            </h3>
            <p className="text-sm text-amber-800 mb-4">
              Para garantizar que nuestro sistema procese su compra de manera eficiente, por favor lea atentamente:
            </p>
            <ul className="text-sm text-amber-800 space-y-3 list-disc pl-5 marker:text-amber-500">
              <li>
                <strong>NO modifique ni borre el mensaje de WhatsApp:</strong> El texto generado contiene la estructura y los enlaces exactos que nuestro sistema automatizado requiere.
              </li>
              <li>
                <strong>Tiempos de respuesta:</strong> La verificación de pagos depende de la disponibilidad de nuestros agentes.
              </li>
              <li>
                <strong>Respaldo de compra:</strong> El enlace PDF incluido en su mensaje es el único comprobante formal de los precios solicitados.
              </li>
            </ul>
          </div>

          <button
            onClick={() => { router.push('/aura'); useCart.getState().clearCart(); }}
            className="cursor-pointer inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-800 transition shadow-md w-full sm:w-auto"
          >
            <ArrowLeft size={20} /> Volver a la página de productos
          </button>
        </div>
      </main >
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="cursor-pointer group flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-100 transition-colors shadow-sm"
          >
            <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Finalizar compra</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 border-b pb-4 flex items-center gap-2">
                <User size={20} /> Datos de facturación y entrega
              </h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <input placeholder="Nombre completo" className={inputClass} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  <input placeholder="Cédula o RIF" className={inputClass} onChange={(e) => setFormData({ ...formData, idDocument: e.target.value })} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <input placeholder="Teléfono para WhatsApp" className={inputClass} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  <input placeholder="Correo Electrónico" type="email" className={inputClass} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
                <textarea placeholder="Dirección" className={`${inputClass} h-32`} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Resumen del pedido</h2>
              <div className="space-y-4 mb-6">
                {items.map((item: any) => {
                  const finalPrice = getFinalPrice(item);
                  const activeDiscount = (item as any).discount_percent;
                  const hasDiscount = typeof activeDiscount === 'number' && activeDiscount > 0;

                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{item.quantity}x {item.name}</span>
                        <span className="font-semibold text-slate-900">${(finalPrice * item.quantity).toFixed(2)}</span>
                      </div>
                      {hasDiscount && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                          <Tag size={10} />
                          Descuento aplicado (-{activeDiscount}%)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                {ahorroTotal > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium bg-green-50 p-2 rounded-lg">
                    <span>Tu ahorro:</span>
                    <span>-${ahorroTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-slate-900">
                  <span>Total USD</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-md font-medium text-slate-500 italic">
                  <span>Total en Bs.</span>
                  <span>{tasa !== null ? totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '...'} Bs.</span>
                </div>
                <button
                  onClick={handleFinalizeOrder}
                  disabled={isProcessing || tasa === null}
                  className="cursor-pointer w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-md shadow-green-200 mt-4 disabled:opacity-70"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : (
                    <> <MessageCircle size={20} /> Enviar pedido por WhatsApp </>
                  )}
                </button>
                <div className="flex items-start gap-3 text-sm text-slate-600 border-t border-slate-200 pt-6 mt-6">
                  <ShieldCheck className="text-blue-600 shrink-0 mt-0.5" size={24} />
                  <p>Compra protegida. Recibe el producto exacto que pediste o te ayudamos con la devolución.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}