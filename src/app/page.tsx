import { createClient } from '@/lib/server';
import { Store, Product } from '@/types';
import AuraGameShell from '@/components/game/AuraGameShell';
import getDolarTasa from '@/util/getDolarTasa';

export const dynamic = 'force-dynamic';
export const revalidate = 0; // Datos en tiempo real para reflejar nuevas tiendas y productos al instante

export default async function HomePage() {
  const supabase = await createClient();

  // Obtenemos en paralelo tiendas, tasa BCV y productos de inventario
  const [tasa, { data: storesData }, { data: storeProductsData }] = await Promise.all([
    getDolarTasa(),
    supabase.from('stores').select('*'),
    supabase
      .from('store_products')
      .select(`
        *,
        products (*)
      `)
      .eq('is_active', true)
      .limit(500)
  ]);

  const stores: Store[] = storesData || [];

  // Tiendas registradas en vitrina comercial
  const activeStoreIds = new Set(stores.map((s) => s.id));

  const verifiedStoreProducts = (storeProductsData || []).filter((sp: any) =>
    activeStoreIds.has(sp.store_id)
  );

  // Mapeamos los productos de inventario a formato Product polimórfico
  const products: Product[] = verifiedStoreProducts.map((sp: any) => {
    const rawCat = (sp.products?.category || '').toLowerCase();
    const archetype = sp.products?.category_archetype || sp.products?.archetype || (
      rawCat.includes('comida') || rawCat.includes('restaurante') || rawCat.includes('café') ? 'GASTRO_FLASH' :
      rawCat.includes('vehículo') || rawCat.includes('moto') || rawCat.includes('carro') ? 'VEHICLES_CLASSIFIED' :
      rawCat.includes('electro') || rawCat.includes('mueble') || rawCat.includes('tecnología') ? 'HIGH_TICKET' :
      rawCat.includes('ferretería') || rawCat.includes('farmacia') || rawCat.includes('repuesto') ? 'URGENT_SEARCH' : 'RETAIL_STANDARD'
    );

    const price = Number(sp.price || sp.products?.price || 10);
    const regularPrice = Number(sp.products?.regular_price_usd || price);
    const discountPercent = Number(sp.discount_percent || sp.products?.discount_percent || sp.products?.discount_percentage || 0);

    let auraPrice = sp.products?.aura_price_usd ? Number(sp.products.aura_price_usd) : price;
    if (discountPercent > 0 && regularPrice <= auraPrice) {
      auraPrice = Number((regularPrice * (1 - discountPercent / 100)).toFixed(2));
    }

    const unlockFee = sp.products?.unlock_fee_usd !== undefined
      ? Number(sp.products?.unlock_fee_usd)
      : Number((auraPrice * 0.10).toFixed(2));

    const isWholesale = Boolean(
      sp.is_wholesale ||
      sp.metadata?.is_wholesale ||
      sp.products?.is_wholesale ||
      sp.products?.specs?.is_wholesale
    );
    const wholesaleMinUnits = Number(
      sp.wholesale_min_units ||
      sp.metadata?.wholesale_min_units ||
      sp.products?.wholesale_min_units ||
      sp.products?.specs?.wholesale_min_units ||
      1
    );
    const wholesalePriceUsd = sp.wholesale_price_usd ||
      sp.metadata?.wholesale_price_usd ||
      sp.products?.wholesale_price_usd ||
      sp.products?.specs?.wholesale_price_usd ||
      null;

    const hasDiscount = Boolean(
      sp.has_discount ||
      sp.metadata?.has_discount ||
      sp.products?.has_discount ||
      sp.products?.specs?.has_discount ||
      discountPercent > 0 ||
      (regularPrice > auraPrice) ||
      (sp.products?.sale_price && Number(sp.products.sale_price) < regularPrice) ||
      sp.products?.is_clearance ||
      sp.products?.isOffer
    );

    return {
      ...sp.products,
      id: sp.products?.id || sp.id,
      store_id: sp.store_id,
      store_product_id: sp.id,
      price: price,
      regular_price_usd: regularPrice,
      aura_price_usd: auraPrice,
      unlock_fee_usd: unlockFee,
      category_archetype: archetype,
      variants: sp.products?.variants || (sp.products?.sizes && sp.products.sizes.length > 0 ? [{ label: 'Talla', options: sp.products.sizes }] : []),
      specs: sp.products?.specs || {},
      auto_confirm_stock: sp.products?.auto_confirm_stock,
      is_sponsored: Boolean(sp.products?.is_sponsored),
      published_at: sp.products?.published_at || sp.created_at,
      stock: sp.stock ?? 5,
      discount_percent: discountPercent,
      sizes: sp.products?.sizes || [],
      is_clearance: (discountPercent >= 15) || (sp.stock && sp.stock <= 2),
      clearance_badge: discountPercent ? `-${discountPercent}%` : undefined,
      is_wholesale: isWholesale,
      wholesale_min_units: wholesaleMinUnits,
      wholesale_price_usd: wholesalePriceUsd ? Number(wholesalePriceUsd) : undefined,
      has_discount: hasDiscount,
    };
  });

  return (
    <AuraGameShell
      initialProducts={products}
      initialStores={stores}
      initialTasa={tasa}
    />
  );
}