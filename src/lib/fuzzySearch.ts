/**
 * src/lib/fuzzySearch.ts
 * Motor de Búsqueda Inteligente y Tolerante a Errores (Fuzzy & Phonetic) para Aura Platform.
 * 
 * Diseñado específicamente para resolver:
 * 1. Insensibilidad a mayúsculas, minúsculas, tildes y diacríticos (á, é, í, ó, ú, ü, ñ).
 * 2. Fonética en Español:
 *    - 'k' <-> 'qu' <-> 'c' (ej: 'traki' <-> 'traqui' <-> 'traci')
 *    - 'v' <-> 'b' (ej: 'votas' <-> 'botas')
 *    - 'z' <-> 's' <-> 'c' (ej: 'sapato' <-> 'zapato')
 *    - 'y' <-> 'll' (ej: 'mallonesa' <-> 'mayonesa')
 *    - 'g' <-> 'j' (ej: 'jirasol' <-> 'girasol')
 *    - 'h' muda (ej: 'amburguesa' <-> 'hamburguesa')
 *    - Reducción de letras repetidas accidentales ('trannki' -> 'tranki')
 * 3. Tolerancia a Errores Tipográficos (Levenshtein Distance):
 *    - Letras de más o de menos (ej: 'tranki' <-> 'traki', 'camisa' <-> 'camsa')
 *    - Transposición de letras contiguas
 * 4. Palabras pegadas o separadas:
 *    - 'camisacubo' <-> 'camisa cubo'
 *    - 'coca cola' <-> 'cocacola'
 * 5. Búsqueda multi-término (Tokens independientes):
 *    - 'traki azul camisa' coincide aunque las palabras estén en orden diferente.
 */

import { Product } from '@/types';

/**
 * Normaliza un texto removiendo acentos, caracteres especiales y espacios sobrantes.
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convierte un texto a su representación fonética común en español.
 */
export function spanishPhonetic(str: string): string {
  if (!str) return '';
  let s = normalizeSearchText(str).replace(/ñ/g, 'n');
  s = s.replace(/qu([ei])/g, 'k$1');
  s = s.replace(/q/g, 'k');
  s = s.replace(/c([ei])/g, 's$1');
  s = s.replace(/c([aou])/g, 'k$1');
  s = s.replace(/c(?![h])/g, 'k');
  s = s.replace(/z/g, 's');
  s = s.replace(/v/g, 'b');
  s = s.replace(/g([ei])/g, 'j$1');
  s = s.replace(/ll/g, 'y');
  s = s.replace(/(^|[^c])h+/g, '$1');
  s = s.replace(/([a-z])\1+/g, '$1');
  return s;
}

/**
 * Calcula la distancia de Levenshtein entre dos cadenas de manera optimizada O(min(a,b)).
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (a.length > b.length) {
    const tmp = a;
    a = b;
    b = tmp;
  }
  const la = a.length, lb = b.length;
  let prevRow = Array.from({ length: la + 1 }, (_, i) => i);
  let currRow = new Array(la + 1);
  for (let j = 1; j <= lb; j++) {
    currRow[0] = j;
    const bChar = b.charCodeAt(j - 1);
    for (let i = 1; i <= la; i++) {
      const cost = a.charCodeAt(i - 1) === bChar ? 0 : 1;
      currRow[i] = Math.min(currRow[i - 1] + 1, prevRow[i] + 1, prevRow[i - 1] + cost);
    }
    for (let i = 0; i <= la; i++) prevRow[i] = currRow[i];
  }
  return prevRow[la];
}

/**
 * Evalúa si un token individual coincide de manera exacta, fonética, condensada o fuzzy.
 */
function matchSingleToken(
  qToken: string,
  targetTokens: string[],
  rawTargetCondensed: string,
  phoneticTargetCondensed: string
): boolean {
  const normQ = normalizeSearchText(qToken);
  if (!normQ) return true;

  // 1. Coincidencia condensada (palabras pegadas ej: 'camisacubo' vs 'camisa cubo')
  const qCondensed = normQ.replace(/\s+/g, '');
  if (qCondensed.length >= 3 && rawTargetCondensed.includes(qCondensed)) return true;

  // 2. Coincidencia fonética condensada (ej: 'traquicubos' vs 'traki cubo')
  const qPhonetic = spanishPhonetic(normQ).replace(/\s+/g, '');
  if (qPhonetic.length >= 3 && phoneticTargetCondensed.includes(qPhonetic)) return true;

  // 3. Verificación token por token
  for (const t of targetTokens) {
    const normT = normalizeSearchText(t);
    if (!normT) continue;

    // Subcadena directa o prefijo
    if (normT.includes(normQ) || normQ.includes(normT)) return true;

    // Fonética directa
    const phonT = spanishPhonetic(normT);
    const phonQ = spanishPhonetic(normQ);
    if (phonT.includes(phonQ) || phonQ.includes(phonT)) return true;

    // Tolerancia por distancia Levenshtein
    const minLen = Math.min(normQ.length, normT.length);
    const maxLen = Math.max(normQ.length, normT.length);

    // Para palabras de 3 a 6 caracteres (ej: 'traki' vs 'tranki', 'cubo' vs 'tubo'): distancia <= 1
    if (minLen >= 3 && maxLen <= 6) {
      if (levenshteinDistance(phonQ, phonT) <= 1 || levenshteinDistance(normQ, normT) <= 1) return true;
    }
    // Para palabras de 5 a 10 caracteres: distancia <= 2
    else if (minLen >= 5 && maxLen <= 10) {
      if (levenshteinDistance(phonQ, phonT) <= 2 || levenshteinDistance(normQ, normT) <= 2) return true;
    }
    // Para palabras largas (8+ caracteres): distancia <= 3
    else if (minLen >= 8) {
      if (levenshteinDistance(phonQ, phonT) <= 3 || levenshteinDistance(normQ, normT) <= 2) return true;
    }
  }

  return false;
}

/**
 * Función principal para comprobar si un producto coincide de forma difusa / inteligente
 * con la consulta del usuario.
 * 
 * @param product Objeto Producto de Aura
 * @param query Texto escrito por el usuario
 * @param storeName Nombre de la tienda (opcional)
 */
export function matchProductFuzzy(
  product: Product,
  query: string,
  storeName?: string
): boolean {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;

  const targetFields: string[] = [
    product.name,
    product.description || '',
    product.brand || '',
    product.category || '',
    product.subcategory || '',
    storeName || '',
    Array.isArray(product.sizes) ? product.sizes.join(' ') : '',
  ];

  const rawFull = targetFields.filter(Boolean).join(' ');
  const normTarget = normalizeSearchText(rawFull);
  const rawTargetCondensed = normTarget.replace(/\s+/g, '');
  const phoneticTargetCondensed = spanishPhonetic(normTarget).replace(/\s+/g, '');

  // 1. Verificación rápida de la consulta completa condensada
  const qCondensed = normQuery.replace(/\s+/g, '');
  if (qCondensed.length >= 3 && rawTargetCondensed.includes(qCondensed)) return true;

  const qPhoneticCondensed = spanishPhonetic(normQuery).replace(/\s+/g, '');
  if (qPhoneticCondensed.length >= 3 && phoneticTargetCondensed.includes(qPhoneticCondensed)) return true;

  // 2. Verificación de cada token escrito por el usuario
  const queryTokens = normQuery.split(' ').filter(Boolean);
  const targetTokens = normTarget.split(' ').filter(Boolean);

  return queryTokens.every((qTok) =>
    matchSingleToken(qTok, targetTokens, rawTargetCondensed, phoneticTargetCondensed)
  );
}
