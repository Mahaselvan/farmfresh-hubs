import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]); 
  // cartItems = [{ lot, qtyKg }]

  const addToCart = (lot, qtyKg) => {
    setCartItems((prev) => {
      const existing = prev.find((x) => x.lot._id === lot._id);

      if (existing) {
        return prev.map((x) =>
          x.lot._id === lot._id
            ? { ...x, qtyKg: Number(x.qtyKg) + Number(qtyKg) }
            : x
        );
      }

      return [...prev, { lot, qtyKg: Number(qtyKg) }];
    });
  };

  const removeFromCart = (lotId) => {
    setCartItems((prev) => prev.filter((x) => x.lot._id !== lotId));
  };

  const updateQty = (lotId, qtyKg) => {
    setCartItems((prev) =>
      prev.map((x) =>
        x.lot._id === lotId ? { ...x, qtyKg: Number(qtyKg) } : x
      )
    );
  };

  const clearCart = () => setCartItems([]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const price = Number(item.lot.expectedPrice || 0);
      return sum + price * Number(item.qtyKg);
    }, 0);
  }, [cartItems]);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    totalAmount
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
