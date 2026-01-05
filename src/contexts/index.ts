/**
 * Context exports for SteppersLife Stores
 *
 * Usage:
 * ```tsx
 * import { useCart, CartProvider } from "@/contexts";
 * ```
 */

// Product cart (marketplace)
export {
  CartProvider,
  useCart,
  type CartItem,
  type SelectedProductOption,
  type VendorGroup,
} from "./CartContext";

// Workspace context
export { WorkspaceProvider, useWorkspace } from "./WorkspaceContext";
