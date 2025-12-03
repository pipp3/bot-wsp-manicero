/**
 * Servicio de Gestión de Carrito de Compras
 *
 * Maneja el carrito en memoria por usuario con las siguientes características:
 * - Agregar productos al carrito con validación de stock
 * - Calcular totales automáticamente (precio por mayor si cantidad >= 5)
 * - Listar items del carrito
 * - Vaciar carrito
 * - Eliminar item específico
 * - Modificar cantidad de un item
 * - El carrito se limpia cuando la sesión expira (15 minutos de inactividad)
 */

import { sessionService } from './sessionService.js';

/**
 * Estructura del carrito:
 * Map<telefono, Array<CartItem>>
 *
 * CartItem = {
 *   id_producto: number,
 *   nombre: string,
 *   cantidad: number,
 *   precio_unitario: number,
 *   precio_por_mayor: number,
 *   stock_disponible: number,
 *   subtotal: number,
 *   aplicaPrecioMayor: boolean
 * }
 */

class CartService {
  constructor() {
    // Almacén de carritos por usuario
    this.carts = new Map();

    // Cantidad mínima para aplicar precio por mayor
    this.CANTIDAD_PRECIO_MAYOR = 5;

    console.log('🛒 Servicio de carrito inicializado');
  }

  /**
   * Obtiene el carrito de un usuario
   * @param {string} telefono - Número de teléfono del usuario
   * @returns {Array<CartItem>} - Items del carrito
   */
  getCart(telefono) {
    if (!telefono) {
      console.warn('⚠️ getCart: telefono no proporcionado');
      return [];
    }

    // Verificar si la sesión ha expirado
    if (sessionService.isSessionExpired(telefono)) {
      console.log(`⏰ Sesión expirada para ${telefono} - Limpiando carrito`);
      this.clearCart(telefono);
      return [];
    }

    return this.carts.get(telefono) || [];
  }

  /**
   * Agrega un producto al carrito
   * @param {string} telefono - Número de teléfono del usuario
   * @param {Object} producto - Datos del producto
   * @param {number} producto.id_producto - ID del producto
   * @param {string} producto.nombre - Nombre del producto
   * @param {number} producto.precio_unitario - Precio por unidad
   * @param {number} producto.precio_por_mayor - Precio por mayor (5+ unidades)
   * @param {number} producto.stock_actual - Stock disponible
   * @param {number} cantidad - Cantidad a agregar (default: 1)
   * @returns {Object} - Resultado de la operación
   */
  addToCart(telefono, producto, cantidad = 1) {
    try {
      // Validaciones
      if (!telefono) {
        throw new Error('Teléfono no proporcionado');
      }

      if (!producto || !producto.id_producto) {
        throw new Error('Producto inválido');
      }

      if (cantidad <= 0 || !Number.isInteger(cantidad)) {
        throw new Error('La cantidad debe ser un número entero positivo');
      }

      // Verificar stock disponible
      if (cantidad > producto.stock_actual) {
        return {
          success: false,
          message: `⚠️ Stock insuficiente. Solo hay ${producto.stock_actual} unidades disponibles.`,
          error: 'STOCK_INSUFICIENTE',
          stock_disponible: producto.stock_actual
        };
      }

      // Obtener carrito actual
      let cart = this.getCart(telefono);

      // Verificar si el producto ya está en el carrito
      const existingItemIndex = cart.findIndex(item => item.id_producto === producto.id_producto);

      if (existingItemIndex !== -1) {
        // Producto ya existe - actualizar cantidad
        const existingItem = cart[existingItemIndex];
        const nuevaCantidad = existingItem.cantidad + cantidad;

        // Verificar stock para la nueva cantidad
        if (nuevaCantidad > producto.stock_actual) {
          return {
            success: false,
            message: `⚠️ Stock insuficiente. Ya tienes ${existingItem.cantidad} en el carrito. Solo hay ${producto.stock_actual} disponibles.`,
            error: 'STOCK_INSUFICIENTE',
            stock_disponible: producto.stock_actual,
            cantidad_en_carrito: existingItem.cantidad
          };
        }

        // Actualizar cantidad y recalcular subtotal
        cart[existingItemIndex] = this._createCartItem(producto, nuevaCantidad);

        console.log(`🛒 Cantidad actualizada en carrito para ${telefono}: ${producto.nombre} - Nueva cantidad: ${nuevaCantidad}`);
      } else {
        // Producto nuevo - agregar al carrito
        const cartItem = this._createCartItem(producto, cantidad);
        cart.push(cartItem);

        console.log(`🛒 Producto agregado al carrito para ${telefono}: ${producto.nombre} x${cantidad}`);
      }

      // Guardar carrito actualizado
      this.carts.set(telefono, cart);

      // Calcular totales
      const totales = this.getCartTotals(telefono);

      return {
        success: true,
        message: `✅ ${producto.nombre} agregado al carrito (${cantidad} unidad${cantidad > 1 ? 'es' : ''})`,
        cart_item: cart[existingItemIndex !== -1 ? existingItemIndex : cart.length - 1],
        cart_size: cart.length,
        totales
      };

    } catch (error) {
      console.error('❌ Error en addToCart:', error.message);
      return {
        success: false,
        message: `❌ Error al agregar producto: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Crea un item de carrito con cálculos automáticos
   * @private
   */
  _createCartItem(producto, cantidad) {
    // Determinar si aplica precio por mayor
    const aplicaPrecioMayor = cantidad >= this.CANTIDAD_PRECIO_MAYOR;

    // Precio a aplicar
    const precioAplicable = aplicaPrecioMayor ? producto.precio_por_mayor : producto.precio_unitario;

    // Calcular subtotal
    const subtotal = precioAplicable * cantidad;

    return {
      id_producto: producto.id_producto,
      nombre: producto.nombre,
      cantidad: cantidad,
      precio_unitario: producto.precio_unitario,
      precio_por_mayor: producto.precio_por_mayor,
      stock_disponible: producto.stock_actual,
      subtotal: subtotal,
      aplicaPrecioMayor: aplicaPrecioMayor,
      precio_aplicado: precioAplicable
    };
  }

  /**
   * Actualiza la cantidad de un item en el carrito
   * @param {string} telefono - Número de teléfono del usuario
   * @param {number} id_producto - ID del producto
   * @param {number} nuevaCantidad - Nueva cantidad
   * @returns {Object} - Resultado de la operación
   */
  updateQuantity(telefono, id_producto, nuevaCantidad) {
    try {
      // Validaciones
      if (!telefono || !id_producto) {
        throw new Error('Teléfono o ID de producto no proporcionado');
      }

      if (nuevaCantidad <= 0 || !Number.isInteger(nuevaCantidad)) {
        throw new Error('La cantidad debe ser un número entero positivo');
      }

      // Obtener carrito
      let cart = this.getCart(telefono);
      const itemIndex = cart.findIndex(item => item.id_producto === id_producto);

      if (itemIndex === -1) {
        return {
          success: false,
          message: '❌ El producto no está en el carrito',
          error: 'PRODUCTO_NO_ENCONTRADO'
        };
      }

      const item = cart[itemIndex];

      // Verificar stock
      if (nuevaCantidad > item.stock_disponible) {
        return {
          success: false,
          message: `⚠️ Stock insuficiente. Solo hay ${item.stock_disponible} unidades disponibles.`,
          error: 'STOCK_INSUFICIENTE',
          stock_disponible: item.stock_disponible
        };
      }

      // Actualizar cantidad y recalcular
      const producto = {
        id_producto: item.id_producto,
        nombre: item.nombre,
        precio_unitario: item.precio_unitario,
        precio_por_mayor: item.precio_por_mayor,
        stock_actual: item.stock_disponible
      };

      cart[itemIndex] = this._createCartItem(producto, nuevaCantidad);
      this.carts.set(telefono, cart);

      console.log(`🛒 Cantidad actualizada para ${telefono}: ${item.nombre} - Nueva cantidad: ${nuevaCantidad}`);

      // Calcular totales
      const totales = this.getCartTotals(telefono);

      return {
        success: true,
        message: `✅ Cantidad actualizada: ${item.nombre} (${nuevaCantidad} unidad${nuevaCantidad > 1 ? 'es' : ''})`,
        cart_item: cart[itemIndex],
        totales
      };

    } catch (error) {
      console.error('❌ Error en updateQuantity:', error.message);
      return {
        success: false,
        message: `❌ Error al actualizar cantidad: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Elimina un producto del carrito
   * @param {string} telefono - Número de teléfono del usuario
   * @param {number} id_producto - ID del producto a eliminar
   * @returns {Object} - Resultado de la operación
   */
  removeFromCart(telefono, id_producto) {
    try {
      if (!telefono || !id_producto) {
        throw new Error('Teléfono o ID de producto no proporcionado');
      }

      let cart = this.getCart(telefono);
      const itemIndex = cart.findIndex(item => item.id_producto === id_producto);

      if (itemIndex === -1) {
        return {
          success: false,
          message: '❌ El producto no está en el carrito',
          error: 'PRODUCTO_NO_ENCONTRADO'
        };
      }

      const removedItem = cart[itemIndex];
      cart.splice(itemIndex, 1);
      this.carts.set(telefono, cart);

      console.log(`🛒 Producto eliminado del carrito para ${telefono}: ${removedItem.nombre}`);

      // Calcular totales
      const totales = this.getCartTotals(telefono);

      return {
        success: true,
        message: `✅ ${removedItem.nombre} eliminado del carrito`,
        removed_item: removedItem,
        cart_size: cart.length,
        totales
      };

    } catch (error) {
      console.error('❌ Error en removeFromCart:', error.message);
      return {
        success: false,
        message: `❌ Error al eliminar producto: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Vacía completamente el carrito de un usuario
   * @param {string} telefono - Número de teléfono del usuario
   */
  clearCart(telefono) {
    if (!telefono) {
      console.warn('⚠️ clearCart: telefono no proporcionado');
      return;
    }

    const deleted = this.carts.delete(telefono);
    if (deleted) {
      console.log(`🧹 Carrito vaciado para ${telefono}`);
    }
  }

  /**
   * Calcula los totales del carrito
   * @param {string} telefono - Número de teléfono del usuario
   * @returns {Object} - Totales calculados
   */
  getCartTotals(telefono) {
    const cart = this.getCart(telefono);

    if (cart.length === 0) {
      return {
        subtotal: 0,
        descuento: 0,
        total: 0,
        cantidad_items: 0,
        cantidad_productos: 0,
        items_con_descuento: 0
      };
    }

    let subtotal = 0;
    let subtotalConDescuento = 0;
    let itemsConDescuento = 0;

    cart.forEach(item => {
      const subtotalNormal = item.precio_unitario * item.cantidad;
      subtotal += subtotalNormal;
      subtotalConDescuento += item.subtotal;

      if (item.aplicaPrecioMayor) {
        itemsConDescuento++;
      }
    });

    const descuento = subtotal - subtotalConDescuento;
    const cantidadProductos = cart.reduce((sum, item) => sum + item.cantidad, 0);

    return {
      subtotal: subtotal,
      descuento: descuento,
      total: subtotalConDescuento,
      cantidad_items: cart.length,
      cantidad_productos: cantidadProductos,
      items_con_descuento: itemsConDescuento
    };
  }

  /**
   * Verifica si un usuario tiene items en el carrito
   * @param {string} telefono - Número de teléfono del usuario
   * @returns {boolean} - true si hay items en el carrito
   */
  hasItems(telefono) {
    const cart = this.getCart(telefono);
    return cart.length > 0;
  }

  /**
   * Obtiene un resumen formateado del carrito para mostrar al usuario
   * @param {string} telefono - Número de teléfono del usuario
   * @returns {string} - Resumen formateado
   */
  getFormattedSummary(telefono) {
    const cart = this.getCart(telefono);
    const totales = this.getCartTotals(telefono);

    if (cart.length === 0) {
      return '🛒 Tu carrito está vacío';
    }

    let summary = `🛒 *Resumen del Carrito*\n\n`;

    cart.forEach((item, index) => {
      const descuentoIcon = item.aplicaPrecioMayor ? '🔥 ' : '';
      const precioMostrado = item.precio_aplicado.toLocaleString('es-CL');

      summary += `${index + 1}. ${descuentoIcon}*${item.nombre}*\n`;
      summary += `   Cantidad: ${item.cantidad} x $${precioMostrado}\n`;
      summary += `   Subtotal: $${item.subtotal.toLocaleString('es-CL')}\n`;

      if (item.aplicaPrecioMayor) {
        const ahorro = (item.precio_unitario - item.precio_por_mayor) * item.cantidad;
        summary += `   _Precio por mayor aplicado - Ahorras $${ahorro.toLocaleString('es-CL')}_\n`;
      }

      summary += `\n`;
    });

    summary += `━━━━━━━━━━━━━━━━━━━━\n`;
    summary += `*Total de productos:* ${totales.cantidad_productos} unidad${totales.cantidad_productos > 1 ? 'es' : ''}\n`;

    if (totales.descuento > 0) {
      summary += `*Subtotal:* $${totales.subtotal.toLocaleString('es-CL')}\n`;
      summary += `*Descuento:* -$${totales.descuento.toLocaleString('es-CL')} 🔥\n`;
    }

    summary += `*TOTAL:* $${totales.total.toLocaleString('es-CL')}\n`;

    if (totales.items_con_descuento > 0) {
      summary += `\n💡 _Tienes ${totales.items_con_descuento} producto(s) con precio por mayor (5+ unidades)_`;
    }

    return summary;
  }

  /**
   * Obtiene estadísticas del servicio de carrito
   * @returns {Object} - Estadísticas
   */
  getStats() {
    let totalCarts = this.carts.size;
    let totalItems = 0;
    let totalValue = 0;

    for (const [telefono, cart] of this.carts.entries()) {
      totalItems += cart.length;
      const totales = this.getCartTotals(telefono);
      totalValue += totales.total;
    }

    return {
      totalCarts,
      totalItems,
      totalValue,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Prepara los datos del carrito para enviar al backend al crear el pedido
   * @param {string} telefono - Número de teléfono del usuario
   * @returns {Array} - Array de detalles del pedido
   */
  prepareOrderDetails(telefono) {
    const cart = this.getCart(telefono);

    return cart.map(item => ({
      id_producto: item.id_producto,
      cantidad: item.cantidad
    }));
  }
}

// Instancia singleton del servicio de carrito
export const cartService = new CartService();

// Exportar también como default para compatibilidad
export default cartService;
