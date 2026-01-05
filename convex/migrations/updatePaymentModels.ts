import { mutation } from "../_generated/server";

/**
 * Migration to update old payment model names to new ones
 * PRE_PURCHASE → PREPAY
 * PAY_AS_SELL → CREDIT_CARD
 */
export const updatePaymentModels = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all payment configs with legacy payment models
    const configs = await ctx.db.query("eventPaymentConfig").collect();

    let updated = 0;

    for (const config of configs) {
      let newModel = config.paymentModel;

      if (config.paymentModel === "PRE_PURCHASE") {
        newModel = "PREPAY";
      } else if (config.paymentModel === "PAY_AS_SELL") {
        newModel = "CREDIT_CARD";
      }

      if (newModel !== config.paymentModel) {
        await ctx.db.patch(config._id, {
          paymentModel: newModel as any,
          updatedAt: Date.now(),
        });
        updated++;
      }
    }

    return {
      success: true,
      message: `Updated ${updated} payment configurations`,
      total: configs.length,
      updated,
    };
  },
});
