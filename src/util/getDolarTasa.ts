//Obtiene la tasa de cotización del dólar BCV actual desde la API dolarapi.com
export default async function getDolarTasa() {
  try {
    const res = await fetch("https://ve.dolarapi.com/v1/cotizaciones", { cache: 'no-store' });
    const data = await res.json();
    return data[0].promedio || 500.0;
  } catch {
    return 500.0;
  }
}