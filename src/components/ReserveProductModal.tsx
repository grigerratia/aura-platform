'use client';

import { Product, Store } from '@/types';
import ProductBottomSheet from './game/ProductBottomSheet';

interface Props {
  product: Product;
  store: Store;
  tasa: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * @deprecated Este componente ha sido unificado con ProductBottomSheet nativo de Aura.
 * Redirige cualquier llamada legacy al modal de pago oscuro y minimalista con SPIDI QR y apartado de 7 días.
 */
export default function ReserveProductModal({ product, store, tasa, isOpen, onClose }: Props) {
  if (!isOpen || !product) return null;

  const productWithStore = {
    ...product,
    store_id: product.store_id || store?.id,
    storeId: product.storeId || store?.id,
  };

  return (
    <ProductBottomSheet
      product={productWithStore}
      onClose={onClose}
      onSuccessUnlock={onClose}
      stores={store ? [store] : []}
      tasa={tasa}
    />
  );
}
