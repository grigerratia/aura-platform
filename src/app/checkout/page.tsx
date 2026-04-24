'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useCart } from '@/store/useCart';
import { MessageCircle, ShieldCheck, User, Loader2, Tag } from 'lucide-react';
import { generatePDF } from '@/lib/pdfGenerator';
import { uploadOrderPDF, saveOrderToDb } from '@/lib/orders';
import getDolarTasa from '@/util/getDolarTasa';

function CheckoutContent() {
  const router = useRouter();
  const { items } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [tasa, setTasa] = useState<number | null>(null);

  // Cargamos la tasa de forma asíncrona segura
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

  const getFinalPrice = (item: any) => useCart.getState().getItemFinalPrice(item);

  const subtotal = items.reduce((acc, item) => acc + (getFinalPrice(item) * item.quantity), 0);
  const totalSinDescuento = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const ahorroTotal = totalSinDescuento - subtotal;
  // Calculamos en Bs solo si la tasa ya cargó
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
    } catch (error) {
      console.error("Error al procesar el pedido:", error);
      alert("Hubo un problema al procesar tu pedido. Intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="cursor-pointer group flex items-center justify-center w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-100 transition-colors shadow-sm"
            aria-label="Volver"
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
                  const hasDiscount = item.discount && item.discount > 0;
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{item.quantity}x {item.name}</span>
                        <span className="font-semibold text-slate-900">${(getFinalPrice(item) * item.quantity).toFixed(2)}</span>
                      </div>
                      {hasDiscount && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                          <Tag size={10} />
                          Descuento aplicado (-{item.discount}%)
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