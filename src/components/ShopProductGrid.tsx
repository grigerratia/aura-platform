'use client';

import { useState } from 'react';
import { Product, Store } from '@/types';
import GameProductCard from '@/components/game/GameProductCard';
import ProductBottomSheet from '@/components/game/ProductBottomSheet';
import { QuickViewModal } from '@/components/QuickViewModal';
import { useFavoriteProducts } from '@/store/useFavoriteProducts';

interface Props {
  products: Product[];
  store: Store;
  tasa: number;
}

export default function ShopProductGrid({ products, store, tasa }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const { isFavorite, toggleFavorite } = useFavoriteProducts();

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        {products.map((product) => {
          const isFav = isFavorite(product.id);
          const calcDiscount =
            product.discount_percent && product.discount_percent > 0
              ? product.discount_percent
              : product.regular_price_usd &&
                product.aura_price_usd &&
                product.regular_price_usd > product.aura_price_usd
              ? Math.round(
                  ((product.regular_price_usd - product.aura_price_usd) /
                    product.regular_price_usd) *
                    100
                )
              : 0;

          return (
            <GameProductCard
              key={product.id}
              product={product}
              onSelect={(p) => setSelectedProduct(p)}
              onViewDetails={(p) => setQuickViewProduct(p)}
              storeName={store.name}
              storeRating={store.rating !== undefined && store.rating !== null ? Number(store.rating) : 5.0}
              distanceFormatted={store.zone || 'Cumaná'}
              customBadge={
                product.is_clearance
                  ? calcDiscount > 0
                    ? `-${calcDiscount}%`
                    : 'Remate de Hoy'
                  : undefined
              }
              isFavoriteProduct={isFav}
              onToggleFavoriteProduct={() => toggleFavorite(product.id)}
            />
          );
        })}
      </div>

      {/* Modal de Apartado / Pago Nativo de Aura */}
      <ProductBottomSheet
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSuccessUnlock={() => setSelectedProduct(null)}
        stores={[store]}
        tasa={tasa}
      />

      {/* Modal de Vista Rápida de Detalles */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        store={store}
        tasa={tasa}
        onSelectProduct={(p) => {
          setQuickViewProduct(null);
          setSelectedProduct(p);
        }}
      />
    </>
  );
}

