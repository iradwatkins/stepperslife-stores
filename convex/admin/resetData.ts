import { mutation } from "../_generated/server";

/**
 * EXTREMELY DANGEROUS: Deletes ALL users and ALL related data
 * Only products remain. Use this for complete system reset.
 */
export const resetAllUsers = mutation({
  args: {},
  handler: async (ctx) => {

    const deletedCounts = {
      users: 0,
      organizerCredits: 0,
      creditTransactions: 0,
      events: 0,
      ticketTiers: 0,
      tickets: 0,
      ticketInstances: 0,
      orders: 0,
      orderItems: 0,
      paymentConfigs: 0,
      seatingCharts: 0,
      seatReservations: 0,
      eventStaff: 0,
      staffSales: 0,
      staffTicketTransfers: 0,
      bundles: 0,
      discounts: 0,
      discountUsage: 0,
      transfers: 0,
      flyers: 0,
      crm: 0,
      waitlist: 0,
      productOrders: 0,
      roomTemplates: 0,
    };

    // Delete all room templates
    const roomTemplates = await ctx.db.query("roomTemplates").collect();
    for (const template of roomTemplates) {
      await ctx.db.delete(template._id);
      deletedCounts.roomTemplates++;
    }

    // Delete all flyers
    const flyers = await ctx.db.query("uploadedFlyers").collect();
    for (const flyer of flyers) {
      await ctx.db.delete(flyer._id);
      deletedCounts.flyers++;
    }

    // Delete all waitlist entries
    const waitlistEntries = await ctx.db.query("eventWaitlist").collect();
    for (const entry of waitlistEntries) {
      await ctx.db.delete(entry._id);
      deletedCounts.waitlist++;
    }

    // Delete all CRM contacts
    const crmContacts = await ctx.db.query("eventContacts").collect();
    for (const contact of crmContacts) {
      await ctx.db.delete(contact._id);
      deletedCounts.crm++;
    }

    // Delete all transfers
    const transfers = await ctx.db.query("ticketTransfers").collect();
    for (const transfer of transfers) {
      await ctx.db.delete(transfer._id);
      deletedCounts.transfers++;
    }

    // Delete all discount usage
    const discountUsage = await ctx.db.query("discountCodeUsage").collect();
    for (const usage of discountUsage) {
      await ctx.db.delete(usage._id);
      deletedCounts.discountUsage++;
    }

    // Delete all discounts
    const discounts = await ctx.db.query("discountCodes").collect();
    for (const discount of discounts) {
      await ctx.db.delete(discount._id);
      deletedCounts.discounts++;
    }

    // Delete all bundles
    const bundles = await ctx.db.query("ticketBundles").collect();
    for (const bundle of bundles) {
      await ctx.db.delete(bundle._id);
      deletedCounts.bundles++;
    }

    // Delete all staff ticket transfers
    const staffTicketTransfers = await ctx.db.query("staffTicketTransfers").collect();
    for (const transfer of staffTicketTransfers) {
      await ctx.db.delete(transfer._id);
      deletedCounts.staffTicketTransfers++;
    }

    // Delete all staff sales
    const staffSales = await ctx.db.query("staffSales").collect();
    for (const sale of staffSales) {
      await ctx.db.delete(sale._id);
      deletedCounts.staffSales++;
    }

    // Delete all event staff
    const eventStaff = await ctx.db.query("eventStaff").collect();
    for (const staff of eventStaff) {
      await ctx.db.delete(staff._id);
      deletedCounts.eventStaff++;
    }

    // Delete all seat reservations
    const seatReservations = await ctx.db.query("seatReservations").collect();
    for (const reservation of seatReservations) {
      await ctx.db.delete(reservation._id);
      deletedCounts.seatReservations++;
    }

    // Delete all seating charts
    const seatingCharts = await ctx.db.query("seatingCharts").collect();
    for (const chart of seatingCharts) {
      await ctx.db.delete(chart._id);
      deletedCounts.seatingCharts++;
    }

    // Delete all payment configs
    const paymentConfigs = await ctx.db.query("eventPaymentConfig").collect();
    for (const config of paymentConfigs) {
      await ctx.db.delete(config._id);
      deletedCounts.paymentConfigs++;
    }

    // Delete all product orders
    const productOrders = await ctx.db.query("productOrders").collect();
    for (const order of productOrders) {
      await ctx.db.delete(order._id);
      deletedCounts.productOrders++;
    }

    // Delete all order items
    const orderItems = await ctx.db.query("orderItems").collect();
    for (const item of orderItems) {
      await ctx.db.delete(item._id);
      deletedCounts.orderItems++;
    }

    // Delete all orders
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      await ctx.db.delete(order._id);
      deletedCounts.orders++;
    }

    // Delete all ticket instances
    const ticketInstances = await ctx.db.query("ticketInstances").collect();
    for (const instance of ticketInstances) {
      await ctx.db.delete(instance._id);
      deletedCounts.ticketInstances++;
    }

    // Delete all tickets
    const tickets = await ctx.db.query("tickets").collect();
    for (const ticket of tickets) {
      await ctx.db.delete(ticket._id);
      deletedCounts.tickets++;
    }

    // Delete all ticket tiers
    const ticketTiers = await ctx.db.query("ticketTiers").collect();
    for (const tier of ticketTiers) {
      await ctx.db.delete(tier._id);
      deletedCounts.ticketTiers++;
    }

    // Delete all events
    const events = await ctx.db.query("events").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
      deletedCounts.events++;
    }

    // Delete all credit transactions
    const creditTransactions = await ctx.db.query("creditTransactions").collect();
    for (const transaction of creditTransactions) {
      await ctx.db.delete(transaction._id);
      deletedCounts.creditTransactions++;
    }

    // Delete all organizer credits
    const organizerCredits = await ctx.db.query("organizerCredits").collect();
    for (const credits of organizerCredits) {
      await ctx.db.delete(credits._id);
      deletedCounts.organizerCredits++;
    }

    // Delete all users
    const users = await ctx.db.query("users").collect();
    for (const user of users) {
      await ctx.db.delete(user._id);
      deletedCounts.users++;
    }


    return {
      success: true,
      deletedCounts,
    };
  },
});

/**
 * DANGEROUS: Deletes all data except products and user accounts
 * This is for testing purposes only
 */
export const resetAllDataExceptProducts = mutation({
  args: {},
  handler: async (ctx) => {

    const deletedCounts = {
      events: 0,
      ticketTiers: 0,
      tickets: 0,
      orders: 0,
      paymentConfigs: 0,
      seatingLayouts: 0,
      seatAssignments: 0,
      eventStaff: 0,
      bundles: 0,
      discounts: 0,
      transfers: 0,
      flyers: 0,
      crm: 0,
      waitlist: 0,
      organizerCreditsReset: 0,
    };

    // Delete all flyers
    const flyers = await ctx.db.query("uploadedFlyers").collect();
    for (const flyer of flyers) {
      await ctx.db.delete(flyer._id);
      deletedCounts.flyers++;
    }

    // Delete all waitlist entries
    const waitlistEntries = await ctx.db.query("eventWaitlist").collect();
    for (const entry of waitlistEntries) {
      await ctx.db.delete(entry._id);
      deletedCounts.waitlist++;
    }

    // Delete all CRM contacts
    const crmContacts = await ctx.db.query("eventContacts").collect();
    for (const contact of crmContacts) {
      await ctx.db.delete(contact._id);
      deletedCounts.crm++;
    }

    // Delete all transfers
    const transfers = await ctx.db.query("ticketTransfers").collect();
    for (const transfer of transfers) {
      await ctx.db.delete(transfer._id);
      deletedCounts.transfers++;
    }

    // Delete all discounts
    const discounts = await ctx.db.query("discountCodes").collect();
    for (const discount of discounts) {
      await ctx.db.delete(discount._id);
      deletedCounts.discounts++;
    }

    // Delete all bundles
    const bundles = await ctx.db.query("ticketBundles").collect();
    for (const bundle of bundles) {
      await ctx.db.delete(bundle._id);
      deletedCounts.bundles++;
    }

    // Delete all event staff
    const eventStaff = await ctx.db.query("eventStaff").collect();
    for (const staff of eventStaff) {
      await ctx.db.delete(staff._id);
      deletedCounts.eventStaff++;
    }

    // Delete all seat reservations
    const seatReservations = await ctx.db.query("seatReservations").collect();
    for (const reservation of seatReservations) {
      await ctx.db.delete(reservation._id);
      deletedCounts.seatAssignments++;
    }

    // Delete all seating charts
    const seatingCharts = await ctx.db.query("seatingCharts").collect();
    for (const chart of seatingCharts) {
      await ctx.db.delete(chart._id);
      deletedCounts.seatingLayouts++;
    }

    // Delete all payment configs
    const paymentConfigs = await ctx.db.query("eventPaymentConfig").collect();
    for (const config of paymentConfigs) {
      await ctx.db.delete(config._id);
      deletedCounts.paymentConfigs++;
    }

    // Delete all orders
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      await ctx.db.delete(order._id);
      deletedCounts.orders++;
    }

    // Delete all tickets
    const tickets = await ctx.db.query("tickets").collect();
    for (const ticket of tickets) {
      await ctx.db.delete(ticket._id);
      deletedCounts.tickets++;
    }

    // Delete all ticket tiers
    const ticketTiers = await ctx.db.query("ticketTiers").collect();
    for (const tier of ticketTiers) {
      await ctx.db.delete(tier._id);
      deletedCounts.ticketTiers++;
    }

    // Delete all events
    const events = await ctx.db.query("events").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
      deletedCounts.events++;
    }

    // Reset organizer credits to 1,000 free tickets
    const organizerCredits = await ctx.db.query("organizerCredits").collect();
    for (const credits of organizerCredits) {
      await ctx.db.patch(credits._id, {
        creditsTotal: 1000,
        creditsUsed: 0,
        creditsRemaining: 1000,
        firstEventFreeUsed: false,
        updatedAt: Date.now(),
      });
      deletedCounts.organizerCreditsReset++;
    }


    return {
      success: true,
      deletedCounts,
    };
  },
});
