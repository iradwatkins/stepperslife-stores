import { mutation } from "../_generated/server";

/**
 * SYSTEM RESET - Delete all data and start fresh
 * WARNING: This deletes ALL events, tickets, flyers, waitlist entries, etc.
 * Does NOT delete admin users
 */
export const resetSystemData = mutation({
  args: {},
  handler: async (ctx) => {

    const deletionCount = {
      tickets: 0,
      ticketInstances: 0,
      ticketTiers: 0,
      ticketBundles: 0,
      orders: 0,
      orderItems: 0,
      waitlist: 0,
      seatingCharts: 0,
      seatReservations: 0,
      eventStaff: 0,
      staffSales: 0,
      events: 0,
      flyers: 0,
      transfers: 0,
      eventContacts: 0,
      discountCodes: 0,
      discountCodeUsage: 0,
      eventPaymentConfig: 0,
    };

    // 1. Delete all tickets
    const tickets = await ctx.db.query("tickets").collect();
    for (const ticket of tickets) {
      await ctx.db.delete(ticket._id);
      deletionCount.tickets++;
    }

    // 2. Delete all ticket instances
    const ticketInstances = await ctx.db.query("ticketInstances").collect();
    for (const instance of ticketInstances) {
      await ctx.db.delete(instance._id);
      deletionCount.ticketInstances++;
    }

    // 3. Delete all orders
    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      await ctx.db.delete(order._id);
      deletionCount.orders++;
    }

    // 4. Delete all order items
    const orderItems = await ctx.db.query("orderItems").collect();
    for (const item of orderItems) {
      await ctx.db.delete(item._id);
      deletionCount.orderItems++;
    }

    // 5. Delete all ticket tiers
    const tiers = await ctx.db.query("ticketTiers").collect();
    for (const tier of tiers) {
      await ctx.db.delete(tier._id);
      deletionCount.ticketTiers++;
    }

    // 6. Delete all ticket bundles
    const bundles = await ctx.db.query("ticketBundles").collect();
    for (const bundle of bundles) {
      await ctx.db.delete(bundle._id);
      deletionCount.ticketBundles++;
    }

    // 7. Delete all waitlist entries
    const waitlist = await ctx.db.query("eventWaitlist").collect();
    for (const entry of waitlist) {
      await ctx.db.delete(entry._id);
      deletionCount.waitlist++;
    }

    // 8. Delete all seating charts
    const seatingCharts = await ctx.db.query("seatingCharts").collect();
    for (const chart of seatingCharts) {
      await ctx.db.delete(chart._id);
      deletionCount.seatingCharts++;
    }

    // 9. Delete all seat reservations
    const seatReservations = await ctx.db.query("seatReservations").collect();
    for (const reservation of seatReservations) {
      await ctx.db.delete(reservation._id);
      deletionCount.seatReservations++;
    }

    // 10. Delete all event staff
    const eventStaff = await ctx.db.query("eventStaff").collect();
    for (const staff of eventStaff) {
      await ctx.db.delete(staff._id);
      deletionCount.eventStaff++;
    }

    // 11. Delete all staff sales
    const staffSales = await ctx.db.query("staffSales").collect();
    for (const sale of staffSales) {
      await ctx.db.delete(sale._id);
      deletionCount.staffSales++;
    }

    // 12. Delete all ticket transfers
    const transfers = await ctx.db.query("ticketTransfers").collect();
    for (const transfer of transfers) {
      await ctx.db.delete(transfer._id);
      deletionCount.transfers++;
    }

    // 13. Delete all event contacts
    const eventContacts = await ctx.db.query("eventContacts").collect();
    for (const contact of eventContacts) {
      await ctx.db.delete(contact._id);
      deletionCount.eventContacts++;
    }

    // 14. Delete all discount codes
    const discountCodes = await ctx.db.query("discountCodes").collect();
    for (const code of discountCodes) {
      await ctx.db.delete(code._id);
      deletionCount.discountCodes++;
    }

    // 15. Delete all discount code usage
    const discountUsage = await ctx.db.query("discountCodeUsage").collect();
    for (const usage of discountUsage) {
      await ctx.db.delete(usage._id);
      deletionCount.discountCodeUsage++;
    }

    // 16. Delete all event payment configs
    const paymentConfigs = await ctx.db.query("eventPaymentConfig").collect();
    for (const config of paymentConfigs) {
      await ctx.db.delete(config._id);
      deletionCount.eventPaymentConfig++;
    }

    // 7. Delete all events
    const events = await ctx.db.query("events").collect();
    for (const event of events) {
      await ctx.db.delete(event._id);
      deletionCount.events++;
    }

    // 8. Delete all uploaded flyers
    const flyers = await ctx.db.query("uploadedFlyers").collect();
    for (const flyer of flyers) {
      await ctx.db.delete(flyer._id);
      deletionCount.flyers++;
    }


    return {
      success: true,
      message: "System reset complete - all data deleted",
      deletionCount,
    };
  },
});
