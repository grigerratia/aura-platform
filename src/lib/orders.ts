"use server";

import { createClient } from '@/lib/server';

export const uploadOrderPDF = async (file: Blob, fileName: string) => {
  // Instanciamos el cliente
  const supabase = await createClient();

  // 1. Subir el archivo al bucket 'orders'
  const { data, error } = await supabase.storage
    .from('orders')
    .upload(`facturas/${fileName}`, file);

  if (error) throw error;

  // 2. Obtener la URL pública
  const { data: publicUrlData } = supabase.storage
    .from('orders')
    .getPublicUrl(data?.path);

  return publicUrlData.publicUrl;
};

export const saveOrderToDb = async (orderData: any) => {
  // Instanciamos el cliente nuevamente para el alcance de esta función
  const supabase = await createClient();

  const { error } = await supabase
    .from('orders')
    .insert([orderData]);

  if (error) throw error;
};