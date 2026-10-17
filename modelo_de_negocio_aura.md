# Proyecto Aura (Celta): Análisis Estratégico, Modelo de Negocio y Plan de Ejecución en 15 Días

**Visión del Proyecto:** Transformar la "ceguera de vitrina" (peatones que pasan frente a tiendas locales sin entrar y compradores que buscan desde casa sin certidumbre) en visitas garantizadas y ventas reales mediante una **Plataforma de Vitrina Local y Reserva Garantizada con Pago en Tienda**.

---

## Parte 1: Análisis Estratégico y Diagnóstico de Fricciones

### 1. La Verdad sobre los Beneficios (Negocio vs. Cliente)
* **Para el Cliente (Beneficio Validado):** Ahorrar caminatas bajo el sol, ahorrar dinero, ganar tiempo y tener certidumbre de disponibilidad y precio antes de salir de casa.
* **Para el Negocio (Ajuste de Enfoque):** A un comerciante tradicional no le interesa la "visibilidad" en abstracto ni los "datos de los clientes" si no se traducen en ventas inmediatas. El dueño de tienda piensa únicamente en dos cosas:
  1. **Flujo de caja diario:** Vender hoy para cubrir costos operativos y proveedores.
  2. **Rotación de mercancía estancada:** Salir de los "clavos" (inventario frío o últimas tallas) que ocupan espacio en el depósito.

### 2. ¿Por qué un negocio que vende "caro" usaría Aura?
Un negocio con precios altos **jamás usaría una app que funcione como un comparador de precios directo** de productos idénticos, ya que eso destruiría su margen y enviaría sus clientes a la competencia más barata. Para que la tienda "cara" quiera estar en Aura, el eje de la plataforma cambia de *"Quién vende más barato"* a *"Quién tiene lo que buscas hoy y qué ventaja te ofrece"*:

* **Búsqueda por disponibilidad específica, no por código de barras idéntico:** En calzado, ropa o comercio local, el cliente busca disponibilidad inmediata (*"Zapatos escolares negros talla 38 a menos de 5 cuadras"*). Si la tienda más costosa tiene la talla exacta o está más cerca, gana la venta.
* **Estrategia de "Producto Gancho" (Liquidación):** El negocio caro no rebaja su colección nueva, pero necesita liquidar mercancía de temporadas pasadas para recuperar liquidez. Aura le sirve para publicar sus remates, atraer al cliente por primera vez a su tienda física y, una vez dentro, venderle también mercancía de nueva temporada.
* **Valor agregado visible:** La tienda puede justificar su precio destacando insignias de servicio que otras no tienen (*"Acepta Cashea"*, *"Cambios sin rollo"*, *"Delivery gratis en la zona"*, *"Garantía extendida"*).

### 3. ¿Qué impulsa realmente al usuario a abrir la app y comprar?
1. **Evitar la fricción física (Buscador de certidumbre):** Saber qué tienda de su ciudad tiene el producto exacto sin caminar de local en local ni esperar horas a que respondan *"Precio al privado"* en Instagram.
2. **Caza de oportunidades reales (Dopamina y escasez):** Una sección viva de *"Liquidaciones reales de hoy: últimas unidades"* genera el hábito de abrir la app por curiosidad.
3. **Reserva inmediata en 1 clic:** Asegurar el producto y congelar su precio antes de salir de casa.

---

## Parte 2: El Modelo de Negocio Blindado (Cero Conflictos de Interés)

Para construir, codificar y lanzar Aura en 15 días sin fisuras lógicas ni cuellos de botella operativos, **se descartan tres elementos**: subir archivos Excel, comparar por código de barras y procesar pagos bancarios dentro de la app.

| Bloque del Modelo | Definición Estratégica sin Fugas Lógicas |
| :--- | :--- |
| **Propuesta para el Cliente** | *"Descubre qué tienda de tu ciudad tiene exactamente tu talla o producto hoy, apártalo en 1 clic con precio congelado y ve a tiro seguro."* |
| **Propuesta para la Tienda** | *"Convierte a la gente que pasa frente a tu local sin entrar en clientes reales, liquida tu mercancía estancada rápido y recibe compradores en tu caja con el producto ya elegido."* |
| **Posicionamiento Justo** | Los resultados **no se ordenan de menor a mayor precio**, sino por **verificación de stock reciente, rapidez de atención y cercanía**. |
| **Flujo del Dinero (Cero Burocracia)** | El cliente **reserva en Aura y paga directamente en el local** (Pago Móvil, Punto de Venta, Efectivo o Divisas) al retirar o recibir el delivery. Cero permisos bancarios ni retenciones financieras. |
| **Monetización (Ingresos de Aura)** | **Suscripción Plana B2B (10 USD a 15 USD al mes por tienda) tras 30 días de prueba gratis.** Evita el fraude de comisiones por venta no reportadas en caja y permite que la tienda recupere su inversión vendiendo un solo par de zapatos al mes. |

---

## Parte 3: Solución al "Problema de los 10 Zapatos" (Inventario Autogestionado)

### Regla 1: Catálogo Curado desde el Celular (Ley de Pareto $80/20$)
El comerciante no sube 2.000 artículos ni archivos Excel. Sube únicamente entre **15 y 40 productos clave** (los más buscados, nueva colección y remates) tomando una foto con su celular, indicando título, tallas y precio en 30 segundos. No se muestran cantidades exactas (*"Quedan 10"*), sino estados simples: **Disponible** o **Últimas unidades**.

### Regla 2: El Bucle de "Actualización por Intento de Compra"
El inventario se sincroniza en el momento exacto en que un cliente solicita una reserva:

1. **Solicitud del Cliente:** El usuario ve unos zapatos en 35 USD, elige "Talla 40" y presiona **`[Apartar por 3 horas]`** (Estado: `PENDIENTE`).
2. **Confirmación de la Tienda en 1 Toque:** Al teléfono del encargado llega una alerta (notificación web o mensaje de WhatsApp con enlace único) preguntando: *"Juan quiere venir hoy por: Zapato Casual Talla 40 (35 USD). ¿Está en el estante?"* con **tres botones de acción**:
   * **Botón Verde (`[Sí hay, apartar y dejar activo]`):** Genera el Ticket QR al cliente por 3 horas. El producto sigue activo en Aura porque quedan más unidades en tienda.
   * **Botón Amarillo (`[Sí hay, pero es el ÚLTIMO par]`):** Genera el Ticket QR al cliente y **automáticamente apaga la Talla 40 en Aura** para que nadie más la pida.
   * **Botón Rojo (`[Ya se vendió en tienda]`):** Disculpa automáticamente al cliente, **marca el producto/talla como agotado en Aura al instante** y le sugiere opciones similares en otras tiendas.

---

## Parte 4: Cómo Aplicar "El Efecto Cashea" en 15 Días (Sin Prestar Dinero)

1. **Sistema de Reputación y Niveles del Comprador:**
   * Para evitar que los clientes aparten productos y no vayan a la tienda, cada usuario inicia en **Nivel 1** (máximo 1 reserva activa por 2 horas).
   * Cada vez que el cliente asiste al local y el comerciante valida su QR de compra, el usuario suma puntos y sube a **Nivel Oro**: desbloquea reservas hasta por 24 horas y acceso a **"Precios VIP / Descuentos de Vitrina"** exclusivos para compradores con $100\%$ de asistencia.
   * Si un usuario deja vencer 2 reservas sin asistir, el sistema pausa su capacidad de reservar por 14 días (y el stock se reactiva automáticamente al vencer el temporizador).
2. **El Caballo de Troya Físico (QR de Vitrina):**
   * Cada tienda recibe un hablador o adhesivo con un código QR para su vitrina principal: *"¿Pasaste rápido o estamos cerrados? Escanea aquí, mira nuestros precios reales adentro y reclama un descuento de vitrina hoy"*.
   * El peatón que escanea el QR de una zapatería entra a Aura y descubre todo el ecosistema de tiendas de la ciudad.
3. **Pestaña de Dopamina Diaria ("Remates Verificados"):**
   * Pantalla principal con ofertas reales de liquidación con unidades limitadas para fomentar la apertura diaria de la aplicación desde casa.

---

## Parte 5: Plan de Desarrollo y Arquitectura en 15 Días (Sprint MVP)

* **Stack Tecnológico Recomendado:** PWA (Progressive Web App) con **Next.js / React + Tailwind CSS** (Frontend) y **Supabase** (Base de datos PostgreSQL, Autenticación, Storage para fotos de productos y Realtime).

| Días | Fase del Sprint | Entregables Técnicos Exactos |
| :--- | :--- | :--- |
| **Días 1 a 3** | **Base de Datos y Perfiles Multi-Tienda** | Creación en Supabase de 4 tablas: `stores` (datos del local, ubicación, WhatsApp, insignias), `products` (foto, precio, precio oferta, tallas en JSON, estado de stock), `reservations` (estado: *pendiente, confirmada, completada, expirada*, fecha de vencimiento) y `users` (nivel de reputación, reservas cumplidas/fallidas). |
| **Días 4 a 6** | **Vitrina Pública y Buscador Local** | Interfaz móvil para el cliente: Buscador por palabra clave + filtros rápidos (Categoría, Talla, Zona). Vista de "Perfil de Tienda" (destino del QR físico de la puerta) y pestaña de "Liquidaciones del Día". |
| **Días 7 a 9** | **Motor de Reservas y Semáforo de Stock** | Flujo de solicitud de reserva con alerta a WhatsApp/Panel de la tienda. Vista rápida para el comerciante con los **3 botones de confirmación** (Verde, Amarillo y Rojo) que actualizan el stock automáticamente. |
| **Días 10 a 12** | **Ticket QR y Validador de Reputación** | Generación del Ticket QR único con temporizador regresivo (ej. 3 horas). Lector QR o validación por PIN de 4 dígitos para que la tienda cierre la venta y suba el puntaje del comprador. |
| **Días 13 a 15** | **Despliegue y Carga de 5 Tiendas Piloto** | Despliegue en Vercel. Impresión de los primeros 5 habladores QR para vitrinas. Carga asistida en persona de los primeros 15 a 20 productos de 5 comercios aliados para lanzar con catálogo real. |

---

## Parte 6: Estrategia de Lanzamiento en Calle (Go-To-Market)

* **Onboarding Concierge (Cero Fricción Inicial):** Durante las primeras dos semanas, no esperes a que los comerciantes suban sus fotos solos. Visita personalmente las primeras 5 a 10 tiendas, fotografía sus 15 mejores productos y sus 3 mejores remates con tu teléfono, deja su vitrina digital activa en 20 minutos y coloca el código QR en su puerta.
* **Activación del Hábito:** En cuanto el comerciante reciba su primera alerta de reserva real en el celular y vea entrar al cliente con el Ticket QR listo para pagar en caja, entenderá el valor de Aura sin necesidad de discursos teóricos.