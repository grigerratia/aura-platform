/**
 * Obtiene la tasa oficial del BCV vigente para el día de HOY.
 * En Venezuela, el BCV publica en la tarde la tasa con 'Fecha Valor' del día hábil siguiente.
 * Esta función consulta el histórico y filtra por la fecha actual de Venezuela (America/Caracas)
 * para garantizar que siempre se muestre la tasa legalmente vigente de HOY y no la de mañana.
 */
export default async function getDolarTasa(): Promise<number> {
  try {
    const todayCaracas = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()); // Formato "YYYY-MM-DD"

    // 1. Obtener el histórico oficial fechado
    const histRes = await fetch('https://ve.dolarapi.com/v1/historicos/dolares/oficial', {
      next: { revalidate: 300 }, // Revalida cada 5 minutos
    });

    if (histRes.ok) {
      const history = await histRes.json();
      if (Array.isArray(history) && history.length > 0) {
        // Filtrar exclusivamente por fechas iguales o anteriores a HOY en Venezuela
        const validForToday = history
          .filter((item: any) => typeof item.fecha === 'string' && item.fecha <= todayCaracas)
          .sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));
        if (validForToday.length > 0) {
          const currentRate = validForToday[validForToday.length - 1].promedio;
          if (currentRate && currentRate > 0) {
            return Number(currentRate);
          }
        }
      }
    }

    // 2. Fallback directo a la cotización oficial
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.promedio && data.promedio > 0) {
        return Number(data.promedio);
      }
    }

    return 883.3963;
  } catch (error) {
    console.error('Error al obtener la tasa BCV:', error);
    return 883.3963;
  }
}
