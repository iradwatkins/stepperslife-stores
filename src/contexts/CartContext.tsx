"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Id } from '@/convex/_generated/dataModel';

export interface SelectedProductOption {
  optionId: string;
  optionName: string;
  type: string;
  value?: string | number | string[];
  priceModifier: number;
  selectedChoices?: Array<{
    id: string;
    label: string;
    priceModifier: number;
  }>;
}

export interface CartItem {
  productId: Id<"products">;
  productName: string;
  productPrice: number; // Base/variant price + options price modifier
  productImage?: string;
  quantity: number;
  // Vendor info for split payments
  vendorId?: Id<"vendors">;
  vendorName?: string;
  // Legacy variant system
  variantId?: string;
  variantName?: string;
  variantOptions?: {size?: string; color?: string};
  // New variation system (productType: "VARIABLE")
  variationId?: Id<"productVariations">;
  variationAttributes?: Record<string, string>; // { size: "M", color: "Blue" }
  variationSku?: string;
  // Product customization options
  productOptions?: SelectedProductOption[];
  optionsPriceModifier?: number; // Total price from options
}

// Group cart items by vendor for multi-vendor display
export interface VendorGroup {
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: Id<"products">, variantId?: string, productOptions?: SelectedProductOption[]) => void;
  updateQuantity: (productId: Id<"products">, quantity: number, variantId?: string, productOptions?: SelectedProductOption[]) => void;
  removeItemByIndex: (index: number) => void;
  updateQuantityByIndex: (index: number, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getItemsByVendor: () => VendorGroup[];
  getVendorCount: () => number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addToCart = (newItem: CartItem) => {
    setItems(currentItems => {
      // Check if item already exists in cart
      // Match by productId, variantId/variationId, AND productOptions
      const existingItemIndex = currentItems.findIndex(item => {
        // Must match productId
        if (item.productId !== newItem.productId) return false;

        // Must match legacy variantId
        if (item.variantId !== newItem.variantId) return false;

        // Must match new variationId
        if (item.variationId !== newItem.variationId) return false;

        // Must have same product options (or both have none)
        const itemOptionsJson = JSON.stringify(item.productOptions || []);
        const newItemOptionsJson = JSON.stringify(newItem.productOptions || []);
        return itemOptionsJson === newItemOptionsJson;
      });

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        const updatedItems = [...currentItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + newItem.quantity
        };
        return updatedItems;
      } else {
        // Add new item
        return [...currentItems, newItem];
      }
    });
    setIsCartOpen(true);
  };

  // Helper function to match cart items by productId, variantId, and productOptions
  const matchCartItem = (item: CartItem, productId: Id<"products">, variantId?: string, productOptions?: SelectedProductOption[]) => {
    if (item.productId !== productId) return false;
    if (item.variantId !== variantId) return false;
    const itemOptionsJson = JSON.stringify(item.productOptions || []);
    const targetOptionsJson = JSON.stringify(productOptions || []);
    return itemOptionsJson === targetOptionsJson;
  };

  const removeFromCart = (productId: Id<"products">, variantId?: string, productOptions?: SelectedProductOption[]) => {
    setItems(currentItems => {
      // Find the first matching item and remove it
      const indexToRemove = currentItems.findIndex(item =>
        matchCartItem(item, productId, variantId, productOptions)
      );
      if (indexToRemove === -1) return currentItems;
      return currentItems.filter((_, index) => index !== indexToRemove);
    });
  };

  const updateQuantity = (productId: Id<"products">, quantity: number, variantId?: string, productOptions?: SelectedProductOption[]) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId, productOptions);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item =>
        matchCartItem(item, productId, variantId, productOptions)
          ? { ...item, quantity }
          : item
      )
    );
  };

  // Index-based operations for simpler cart UI updates
  const removeItemByIndex = (index: number) => {
    setItems(currentItems => currentItems.filter((_, i) => i !== index));
  };

  const updateQuantityByIndex = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItemByIndex(index);
      return;
    }

    setItems(currentItems =>
      currentItems.map((item, i) => i === index ? { ...item, quantity } : item)
    );
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('cart');
  };

  const getItemCount = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => total + (item.productPrice * item.quantity), 0);
  };

  // Group items by vendor for multi-vendor display
  const getItemsByVendor = (): VendorGroup[] => {
    const vendorMap = new Map<string, VendorGroup>();

    items.forEach(item => {
      const vendorId = item.vendorId || 'stepperslife'; // Default vendor for items without vendorId
      const vendorName = item.vendorName || 'SteppersLife Marketplace';

      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          vendorName,
          items: [],
          subtotal: 0,
          itemCount: 0,
        });
      }

      const group = vendorMap.get(vendorId)!;
      group.items.push(item);
      group.subtotal += item.productPrice * item.quantity;
      group.itemCount += item.quantity;
    });

    // Sort by vendor name alphabetically
    return Array.from(vendorMap.values()).sort((a, b) =>
      a.vendorName.localeCompare(b.vendorName)
    );
  };

  // Get number of unique vendors in cart
  const getVendorCount = (): number => {
    const vendorIds = new Set<string>();
    items.forEach(item => {
      vendorIds.add(item.vendorId || 'stepperslife');
    });
    return vendorIds.size;
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        removeItemByIndex,
        updateQuantityByIndex,
        clearCart,
        getItemCount,
        getSubtotal,
        getItemsByVendor,
        getVendorCount,
        isCartOpen,
        setIsCartOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
