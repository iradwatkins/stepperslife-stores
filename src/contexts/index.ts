/**
 * Context exports for SteppersLife
 *
 * Usage:
 * ```tsx
 * // Unified cart (recommended for new code)
 * import { useUnifiedCart, UnifiedCartProvider } from "@/contexts";
 *
 * // Individual carts (legacy, still supported)
 * import { useCart, CartProvider } from "@/contexts";
 * import { useEventCart, EventCartProvider } from "@/contexts";
 * import { useFoodCart, FoodCartProvider } from "@/contexts";
 * ```
 */

// Unified cart (facade over all carts)
export {
  UnifiedCartProvider,
  useUnifiedCart,
  useUnifiedProductCart,
  useUnifiedEventCart,
  useUnifiedFoodCart,
  type UnifiedCartSummary,
  type UnifiedCartItemType,
} from "./UnifiedCartContext";

// Product cart (marketplace)
export {
  CartProvider,
  useCart,
  type CartItem,
  type SelectedProductOption,
  type VendorGroup,
} from "./CartContext";

// Event cart (tickets, seats, hotels)
export {
  EventCartProvider,
  useEventCart,
  type EventCartItem,
  type TicketCartItem,
  type SeatCartItem,
  type HotelCartItem,
} from "./EventCartContext";

// Food cart (restaurant orders)
export {
  FoodCartProvider,
  useFoodCart,
  type FoodCartItem,
  type FoodCart,
} from "./FoodCartContext";
