/**
 * Food Order Email Templates
 * Black & white receipt-style design for food orders
 */

// Black & white receipt styles - no colors, no gradients
const receiptStyles = `
  body {
    font-family: 'Courier New', Courier, monospace;
    line-height: 1.4;
    color: #000000;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }
  .container {
    max-width: 480px;
    margin: 0 auto;
    padding: 20px;
  }
  .receipt {
    background: #ffffff;
    border: 2px solid #000000;
    padding: 24px;
  }
  .header {
    text-align: center;
    border-bottom: 2px dashed #000000;
    padding-bottom: 16px;
    margin-bottom: 16px;
  }
  .logo {
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }
  .tagline {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .section {
    margin: 16px 0;
    padding: 12px 0;
    border-bottom: 1px dashed #000000;
  }
  .section:last-child {
    border-bottom: none;
  }
  .section-title {
    font-weight: bold;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .order-number {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    margin: 8px 0;
  }
  .status-badge {
    display: inline-block;
    border: 2px solid #000000;
    padding: 4px 12px;
    font-weight: bold;
    font-size: 14px;
    text-transform: uppercase;
  }
  .item-row {
    display: table;
    width: 100%;
    margin: 4px 0;
  }
  .item-qty {
    display: table-cell;
    width: 30px;
    text-align: left;
  }
  .item-name {
    display: table-cell;
    text-align: left;
  }
  .item-price {
    display: table-cell;
    text-align: right;
    width: 80px;
  }
  .total-row {
    display: table;
    width: 100%;
    margin: 4px 0;
  }
  .total-label {
    display: table-cell;
    text-align: left;
  }
  .total-value {
    display: table-cell;
    text-align: right;
  }
  .grand-total {
    font-size: 18px;
    font-weight: bold;
    border-top: 2px solid #000000;
    padding-top: 8px;
    margin-top: 8px;
  }
  .restaurant-info {
    text-align: center;
  }
  .restaurant-name {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 4px;
  }
  .restaurant-address {
    font-size: 12px;
  }
  .pickup-info {
    text-align: center;
    padding: 12px;
    border: 2px solid #000000;
    margin: 16px 0;
  }
  .footer {
    text-align: center;
    font-size: 11px;
    padding-top: 16px;
    border-top: 2px dashed #000000;
    margin-top: 16px;
  }
  .footer a {
    color: #000000;
  }
  .special-instructions {
    background: #f5f5f5;
    padding: 8px;
    font-style: italic;
    font-size: 12px;
  }
  .datetime {
    font-size: 12px;
    text-align: center;
    margin: 8px 0;
  }
`;

function wrapReceiptTemplate(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>SteppersLife Food Order</title>
  ${preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
  <style>${receiptStyles}</style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`;
}

// Format price from cents to dollars
function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Format date
function formatDate(timestamp?: number): string {
  const date = timestamp ? new Date(timestamp) : new Date();
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Status display names
const statusDisplayNames: Record<string, string> = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY FOR PICKUP',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

export interface FoodOrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    name: string;
    price: number; // in cents
    quantity: number;
    notes?: string;
  }>;
  subtotal: number; // in cents
  tax: number; // in cents
  total: number; // in cents
  status: string;
  paymentMethod?: string;
  pickupTime?: number;
  specialInstructions?: string;
  placedAt?: number;
}

export interface RestaurantData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  estimatedPickupTime?: number;
}

/**
 * Customer Order Confirmation Email
 * Sent when customer places an order
 */
export function customerOrderConfirmationTemplate(
  order: FoodOrderEmailData,
  restaurant: RestaurantData
): { subject: string; html: string } {
  const itemRows = order.items.map(item => `
    <div class="item-row">
      <span class="item-qty">${item.quantity}x</span>
      <span class="item-name">${item.name}${item.notes ? ` (${item.notes})` : ''}</span>
      <span class="item-price">${formatPrice(item.price * item.quantity)}</span>
    </div>
  `).join('');

  const content = `
    <div class="receipt">
      <div class="header">
        <div class="logo">STEPPERSLIFE</div>
        <div class="tagline">Food Order Receipt</div>
      </div>

      <div class="order-number">Order #${order.orderNumber}</div>
      <div class="datetime">${formatDate(order.placedAt)}</div>
      <div style="text-align: center; margin: 12px 0;">
        <span class="status-badge">${statusDisplayNames[order.status] || order.status}</span>
      </div>

      <div class="section restaurant-info">
        <div class="section-title">Restaurant</div>
        <div class="restaurant-name">${restaurant.name}</div>
        <div class="restaurant-address">
          ${restaurant.address}<br>
          ${restaurant.city}, ${restaurant.state} ${restaurant.zipCode}<br>
          ${restaurant.phone}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Order Details</div>
        ${itemRows}
      </div>

      <div class="section">
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span class="total-value">${formatPrice(order.subtotal)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Tax (8.75%)</span>
          <span class="total-value">${formatPrice(order.tax)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">TOTAL</span>
          <span class="total-value">${formatPrice(order.total)}</span>
        </div>
      </div>

      <div class="pickup-info">
        <div class="section-title">Pickup Information</div>
        <div>Estimated: ~${restaurant.estimatedPickupTime || 25} minutes</div>
        <div>Payment: ${order.paymentMethod === 'pay_at_pickup' ? 'Pay at Pickup' : order.paymentMethod || 'Pay at Pickup'}</div>
      </div>

      ${order.specialInstructions ? `
        <div class="section">
          <div class="section-title">Special Instructions</div>
          <div class="special-instructions">${order.specialInstructions}</div>
        </div>
      ` : ''}

      <div class="footer">
        <p>Questions? Contact us at</p>
        <p><a href="mailto:support@stepperslife.com">support@stepperslife.com</a></p>
        <p><a href="https://stepperslife.com/restaurants/my-orders">Track Your Order</a></p>
        <p style="margin-top: 12px;">Thank you for your order!</p>
        <p>&copy; ${new Date().getFullYear()} SteppersLife</p>
      </div>
    </div>
  `;

  return {
    subject: `Order Confirmed - #${order.orderNumber}`,
    html: wrapReceiptTemplate(content, `Your order #${order.orderNumber} has been placed at ${restaurant.name}`)
  };
}

/**
 * Customer Status Update Email
 * Sent when order status changes
 */
export function customerStatusUpdateTemplate(
  order: FoodOrderEmailData,
  restaurant: RestaurantData,
  newStatus: string
): { subject: string; html: string } {
  const statusMessages: Record<string, string> = {
    CONFIRMED: 'Your order has been confirmed by the restaurant.',
    PREPARING: 'Your order is now being prepared.',
    READY_FOR_PICKUP: 'Your order is READY FOR PICKUP! Please head to the restaurant.',
    COMPLETED: 'Thank you! Your order has been completed.',
    CANCELLED: 'Your order has been cancelled. Please contact the restaurant for details.',
  };

  const content = `
    <div class="receipt">
      <div class="header">
        <div class="logo">STEPPERSLIFE</div>
        <div class="tagline">Order Status Update</div>
      </div>

      <div class="order-number">Order #${order.orderNumber}</div>
      <div class="datetime">${formatDate()}</div>

      <div style="text-align: center; margin: 16px 0; padding: 16px; border: 2px solid #000000;">
        <div class="section-title">Status Update</div>
        <div class="status-badge">${statusDisplayNames[newStatus] || newStatus}</div>
        <p style="margin-top: 12px; font-size: 14px;">${statusMessages[newStatus] || 'Your order status has been updated.'}</p>
      </div>

      <div class="section restaurant-info">
        <div class="section-title">Restaurant</div>
        <div class="restaurant-name">${restaurant.name}</div>
        <div class="restaurant-address">
          ${restaurant.address}<br>
          ${restaurant.city}, ${restaurant.state} ${restaurant.zipCode}<br>
          ${restaurant.phone}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Order Summary</div>
        <div class="total-row">
          <span class="total-label">Items</span>
          <span class="total-value">${order.items.reduce((sum, i) => sum + i.quantity, 0)} item(s)</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">TOTAL</span>
          <span class="total-value">${formatPrice(order.total)}</span>
        </div>
      </div>

      ${newStatus === 'READY_FOR_PICKUP' ? `
        <div class="pickup-info" style="background: #f5f5f5;">
          <div style="font-size: 16px; font-weight: bold;">YOUR ORDER IS READY!</div>
          <div style="margin-top: 8px;">Please pick up at:</div>
          <div style="margin-top: 4px;">${restaurant.name}</div>
          <div>${restaurant.address}</div>
        </div>
      ` : ''}

      <div class="footer">
        <p><a href="https://stepperslife.com/restaurants/my-orders">View Order Details</a></p>
        <p style="margin-top: 12px;">&copy; ${new Date().getFullYear()} SteppersLife</p>
      </div>
    </div>
  `;

  const subjectByStatus: Record<string, string> = {
    CONFIRMED: `Order Confirmed - #${order.orderNumber}`,
    PREPARING: `Now Preparing - #${order.orderNumber}`,
    READY_FOR_PICKUP: `READY FOR PICKUP - #${order.orderNumber}`,
    COMPLETED: `Order Complete - #${order.orderNumber}`,
    CANCELLED: `Order Cancelled - #${order.orderNumber}`,
  };

  return {
    subject: subjectByStatus[newStatus] || `Order Update - #${order.orderNumber}`,
    html: wrapReceiptTemplate(content, statusMessages[newStatus] || 'Your order status has been updated.')
  };
}

/**
 * Restaurant New Order Alert Email
 * Sent to restaurant owner/staff when new order comes in
 */
export function restaurantNewOrderAlertTemplate(
  order: FoodOrderEmailData,
  restaurant: RestaurantData
): { subject: string; html: string } {
  const itemRows = order.items.map(item => `
    <div class="item-row">
      <span class="item-qty">${item.quantity}x</span>
      <span class="item-name">${item.name}${item.notes ? ` (${item.notes})` : ''}</span>
      <span class="item-price">${formatPrice(item.price * item.quantity)}</span>
    </div>
  `).join('');

  const content = `
    <div class="receipt">
      <div class="header">
        <div class="logo">STEPPERSLIFE</div>
        <div class="tagline">New Food Order Alert</div>
      </div>

      <div style="text-align: center; padding: 16px; border: 3px solid #000000; margin: 16px 0;">
        <div style="font-size: 18px; font-weight: bold;">NEW ORDER RECEIVED!</div>
      </div>

      <div class="order-number">Order #${order.orderNumber}</div>
      <div class="datetime">${formatDate(order.placedAt)}</div>

      <div class="section">
        <div class="section-title">Customer Information</div>
        <div><strong>Name:</strong> ${order.customerName}</div>
        <div><strong>Phone:</strong> ${order.customerPhone}</div>
        <div><strong>Email:</strong> ${order.customerEmail}</div>
      </div>

      <div class="section">
        <div class="section-title">Order Items</div>
        ${itemRows}
      </div>

      <div class="section">
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span class="total-value">${formatPrice(order.subtotal)}</span>
        </div>
        <div class="total-row">
          <span class="total-label">Tax</span>
          <span class="total-value">${formatPrice(order.tax)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">TOTAL</span>
          <span class="total-value">${formatPrice(order.total)}</span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Payment</div>
        <div>${order.paymentMethod === 'pay_at_pickup' ? 'Customer will pay at pickup' : order.paymentMethod || 'Pay at Pickup'}</div>
      </div>

      ${order.specialInstructions ? `
        <div class="section">
          <div class="section-title">Special Instructions</div>
          <div class="special-instructions">${order.specialInstructions}</div>
        </div>
      ` : ''}

      <div class="pickup-info">
        <div style="font-weight: bold;">ACTION REQUIRED</div>
        <div style="margin-top: 8px;">Please confirm this order in your dashboard</div>
      </div>

      <div class="footer">
        <p><a href="https://stepperslife.com/restaurateur/dashboard/orders">Go to Orders Dashboard</a></p>
        <p style="margin-top: 12px;">&copy; ${new Date().getFullYear()} SteppersLife</p>
      </div>
    </div>
  `;

  return {
    subject: `New Order #${order.orderNumber} - ${formatPrice(order.total)}`,
    html: wrapReceiptTemplate(content, `New order from ${order.customerName} - ${order.items.reduce((sum, i) => sum + i.quantity, 0)} items totaling ${formatPrice(order.total)}`)
  };
}
