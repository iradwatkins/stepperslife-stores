/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addCredits from "../addCredits.js";
import type * as admin from "../admin.js";
import type * as admin_cleanup from "../admin/cleanup.js";
import type * as admin_completeSystemReset from "../admin/completeSystemReset.js";
import type * as admin_eventUploads from "../admin/eventUploads.js";
import type * as admin_featureFlags from "../admin/featureFlags.js";
import type * as admin_platformSettings from "../admin/platformSettings.js";
import type * as admin_queries from "../admin/queries.js";
import type * as admin_reset from "../admin/reset.js";
import type * as admin_resetData from "../admin/resetData.js";
import type * as admin_resetExceptUsers from "../admin/resetExceptUsers.js";
import type * as admin_restaurantUploads from "../admin/restaurantUploads.js";
import type * as admin_seed from "../admin/seed.js";
import type * as admin_seedAll from "../admin/seedAll.js";
import type * as admin_seedClasses from "../admin/seedClasses.js";
import type * as admin_seedEvents from "../admin/seedEvents.js";
import type * as admin_seedRestaurants from "../admin/seedRestaurants.js";
import type * as admin_seedUsers from "../admin/seedUsers.js";
import type * as admin_seedVendor from "../admin/seedVendor.js";
import type * as admin_systemReset from "../admin/systemReset.js";
import type * as adminPanel_actions from "../adminPanel/actions.js";
import type * as adminPanel_mutations from "../adminPanel/mutations.js";
import type * as adminPanel_queries from "../adminPanel/queries.js";
import type * as analytics_queries from "../analytics/queries.js";
import type * as auth_mutations from "../auth/mutations.js";
import type * as bundles_bundleEmails from "../bundles/bundleEmails.js";
import type * as bundles_mutations from "../bundles/mutations.js";
import type * as bundles_queries from "../bundles/queries.js";
import type * as carpools_mutations from "../carpools/mutations.js";
import type * as carpools_queries from "../carpools/queries.js";
import type * as classAttendance_mutations from "../classAttendance/mutations.js";
import type * as classAttendance_queries from "../classAttendance/queries.js";
import type * as classReviews_mutations from "../classReviews/mutations.js";
import type * as classReviews_queries from "../classReviews/queries.js";
import type * as classReviews_seed from "../classReviews/seed.js";
import type * as credits_mutations from "../credits/mutations.js";
import type * as credits_queries from "../credits/queries.js";
import type * as crm_mutations from "../crm/mutations.js";
import type * as crm_queries from "../crm/queries.js";
import type * as crons from "../crons.js";
import type * as discounts_mutations from "../discounts/mutations.js";
import type * as discounts_queries from "../discounts/queries.js";
import type * as email_mutations from "../email/mutations.js";
import type * as email_queries from "../email/queries.js";
import type * as events_allocations from "../events/allocations.js";
import type * as events_mutations from "../events/mutations.js";
import type * as events_queries from "../events/queries.js";
import type * as events_seed from "../events/seed.js";
import type * as events_social from "../events/social.js";
import type * as favoriteEvents from "../favoriteEvents.js";
import type * as favoriteRestaurants from "../favoriteRestaurants.js";
import type * as files_mutations from "../files/mutations.js";
import type * as files_queries from "../files/queries.js";
import type * as flyers_mutations from "../flyers/mutations.js";
import type * as flyers_queries from "../flyers/queries.js";
import type * as foodOrders from "../foodOrders.js";
import type * as hotels_bookings from "../hotels/bookings.js";
import type * as hotels_hotelCron from "../hotels/hotelCron.js";
import type * as hotels_mutations from "../hotels/mutations.js";
import type * as hotels_queries from "../hotels/queries.js";
import type * as hotels_seed from "../hotels/seed.js";
import type * as instructorAnalytics from "../instructorAnalytics.js";
import type * as instructors_mutations from "../instructors/mutations.js";
import type * as instructors_queries from "../instructors/queries.js";
import type * as lib_activationCodes from "../lib/activationCodes.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_restaurantAuth from "../lib/restaurantAuth.js";
import type * as lib_restaurantPlans from "../lib/restaurantPlans.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_timezone from "../lib/timezone.js";
import type * as lib_validation from "../lib/validation.js";
import type * as lib_vendorTiers from "../lib/vendorTiers.js";
import type * as menuItems from "../menuItems.js";
import type * as migrations from "../migrations.js";
import type * as migrations_addVendorTiers from "../migrations/addVendorTiers.js";
import type * as migrations_migrateToLocations from "../migrations/migrateToLocations.js";
import type * as migrations_roleSeparation from "../migrations/roleSeparation.js";
import type * as migrations_updatePaymentModels from "../migrations/updatePaymentModels.js";
import type * as notifications_classReminders from "../notifications/classReminders.js";
import type * as notifications_customerNotifications from "../notifications/customerNotifications.js";
import type * as notifications_foodOrderNotifications from "../notifications/foodOrderNotifications.js";
import type * as notifications_index from "../notifications/index.js";
import type * as notifications_instructorDigests from "../notifications/instructorDigests.js";
import type * as notifications_mutations from "../notifications/mutations.js";
import type * as notifications_pushNotifications from "../notifications/pushNotifications.js";
import type * as notifications_pushSubscriptions from "../notifications/pushSubscriptions.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as notifications_restaurantNotifications from "../notifications/restaurantNotifications.js";
import type * as notifications_staffNotifications from "../notifications/staffNotifications.js";
import type * as notifications_ticketNotifications from "../notifications/ticketNotifications.js";
import type * as orders_cashPayments from "../orders/cashPayments.js";
import type * as orders_cashPaymentsCron from "../orders/cashPaymentsCron.js";
import type * as orders_mutations from "../orders/mutations.js";
import type * as orders_queries from "../orders/queries.js";
import type * as organizerPaymentMethods_index from "../organizerPaymentMethods/index.js";
import type * as organizerPaymentMethods_mutations from "../organizerPaymentMethods/mutations.js";
import type * as organizerPaymentMethods_queries from "../organizerPaymentMethods/queries.js";
import type * as organizerPayouts_index from "../organizerPayouts/index.js";
import type * as organizerPayouts_mutations from "../organizerPayouts/mutations.js";
import type * as organizerPayouts_queries from "../organizerPayouts/queries.js";
import type * as passport_mutations from "../passport/mutations.js";
import type * as passport_queries from "../passport/queries.js";
import type * as paymentConfig_mutations from "../paymentConfig/mutations.js";
import type * as paymentConfig_queries from "../paymentConfig/queries.js";
import type * as paymentDisputes_index from "../paymentDisputes/index.js";
import type * as paymentDisputes_mutations from "../paymentDisputes/mutations.js";
import type * as paymentDisputes_queries from "../paymentDisputes/queries.js";
import type * as payments_actions from "../payments/actions.js";
import type * as payments_mutations from "../payments/mutations.js";
import type * as payments_queries from "../payments/queries.js";
import type * as platformDebt_mutations from "../platformDebt/mutations.js";
import type * as platformDebt_queries from "../platformDebt/queries.js";
import type * as productOrders_mutations from "../productOrders/mutations.js";
import type * as productOrders_queries from "../productOrders/queries.js";
import type * as productReviews from "../productReviews.js";
import type * as productWishlists from "../productWishlists.js";
import type * as products_mutations from "../products/mutations.js";
import type * as products_orders from "../products/orders.js";
import type * as products_queries from "../products/queries.js";
import type * as products_variationMutations from "../products/variationMutations.js";
import type * as products_variations from "../products/variations.js";
import type * as promotions_mutations from "../promotions/mutations.js";
import type * as public_queries from "../public/queries.js";
import type * as radio from "../radio.js";
import type * as radioStreaming from "../radioStreaming.js";
import type * as restaurantActivity from "../restaurantActivity.js";
import type * as restaurantAnalytics from "../restaurantAnalytics.js";
import type * as restaurantHours from "../restaurantHours.js";
import type * as restaurantLocations from "../restaurantLocations.js";
import type * as restaurantReviews from "../restaurantReviews.js";
import type * as restaurantStaff from "../restaurantStaff.js";
import type * as restaurants from "../restaurants.js";
import type * as scanning_mutations from "../scanning/mutations.js";
import type * as scanning_queries from "../scanning/queries.js";
import type * as scripts_updateTestUserRoles from "../scripts/updateTestUserRoles.js";
import type * as seating_mutations from "../seating/mutations.js";
import type * as seating_queries from "../seating/queries.js";
import type * as seating_seatHoldsCron from "../seating/seatHoldsCron.js";
import type * as seating_social from "../seating/social.js";
import type * as services from "../services.js";
import type * as services_admin from "../services/admin.js";
import type * as services_analytics from "../services/analytics.js";
import type * as services_favorites from "../services/favorites.js";
import type * as services_reviews from "../services/reviews.js";
import type * as shipping from "../shipping.js";
import type * as staff_bundleSales from "../staff/bundleSales.js";
import type * as staff_mutations from "../staff/mutations.js";
import type * as staff_queries from "../staff/queries.js";
import type * as staff_settlement from "../staff/settlement.js";
import type * as staff_tierAllocations from "../staff/tierAllocations.js";
import type * as staff_transfers from "../staff/transfers.js";
import type * as subscriptions_mutations from "../subscriptions/mutations.js";
import type * as supportTickets_mutations from "../supportTickets/mutations.js";
import type * as supportTickets_queries from "../supportTickets/queries.js";
import type * as taxRates from "../taxRates.js";
import type * as templates_mutations from "../templates/mutations.js";
import type * as templates_queries from "../templates/queries.js";
import type * as testing_seedMarketplace from "../testing/seedMarketplace.js";
import type * as testing_seedRestaurants from "../testing/seedRestaurants.js";
import type * as testing_setup from "../testing/setup.js";
import type * as tickets_mutations from "../tickets/mutations.js";
import type * as tickets_queries from "../tickets/queries.js";
import type * as transfers_mutations from "../transfers/mutations.js";
import type * as transfers_queries from "../transfers/queries.js";
import type * as upload from "../upload.js";
import type * as users_admin from "../users/admin.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as vendorCoupons from "../vendorCoupons.js";
import type * as vendorEarnings from "../vendorEarnings.js";
import type * as vendorPayouts from "../vendorPayouts.js";
import type * as vendors from "../vendors.js";
import type * as waitlist_mutations from "../waitlist/mutations.js";
import type * as waitlist_queries from "../waitlist/queries.js";
import type * as webhookEvents_index from "../webhookEvents/index.js";
import type * as webhookEvents_mutations from "../webhookEvents/mutations.js";
import type * as webhookEvents_queries from "../webhookEvents/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addCredits: typeof addCredits;
  admin: typeof admin;
  "admin/cleanup": typeof admin_cleanup;
  "admin/completeSystemReset": typeof admin_completeSystemReset;
  "admin/eventUploads": typeof admin_eventUploads;
  "admin/featureFlags": typeof admin_featureFlags;
  "admin/platformSettings": typeof admin_platformSettings;
  "admin/queries": typeof admin_queries;
  "admin/reset": typeof admin_reset;
  "admin/resetData": typeof admin_resetData;
  "admin/resetExceptUsers": typeof admin_resetExceptUsers;
  "admin/restaurantUploads": typeof admin_restaurantUploads;
  "admin/seed": typeof admin_seed;
  "admin/seedAll": typeof admin_seedAll;
  "admin/seedClasses": typeof admin_seedClasses;
  "admin/seedEvents": typeof admin_seedEvents;
  "admin/seedRestaurants": typeof admin_seedRestaurants;
  "admin/seedUsers": typeof admin_seedUsers;
  "admin/seedVendor": typeof admin_seedVendor;
  "admin/systemReset": typeof admin_systemReset;
  "adminPanel/actions": typeof adminPanel_actions;
  "adminPanel/mutations": typeof adminPanel_mutations;
  "adminPanel/queries": typeof adminPanel_queries;
  "analytics/queries": typeof analytics_queries;
  "auth/mutations": typeof auth_mutations;
  "bundles/bundleEmails": typeof bundles_bundleEmails;
  "bundles/mutations": typeof bundles_mutations;
  "bundles/queries": typeof bundles_queries;
  "carpools/mutations": typeof carpools_mutations;
  "carpools/queries": typeof carpools_queries;
  "classAttendance/mutations": typeof classAttendance_mutations;
  "classAttendance/queries": typeof classAttendance_queries;
  "classReviews/mutations": typeof classReviews_mutations;
  "classReviews/queries": typeof classReviews_queries;
  "classReviews/seed": typeof classReviews_seed;
  "credits/mutations": typeof credits_mutations;
  "credits/queries": typeof credits_queries;
  "crm/mutations": typeof crm_mutations;
  "crm/queries": typeof crm_queries;
  crons: typeof crons;
  "discounts/mutations": typeof discounts_mutations;
  "discounts/queries": typeof discounts_queries;
  "email/mutations": typeof email_mutations;
  "email/queries": typeof email_queries;
  "events/allocations": typeof events_allocations;
  "events/mutations": typeof events_mutations;
  "events/queries": typeof events_queries;
  "events/seed": typeof events_seed;
  "events/social": typeof events_social;
  favoriteEvents: typeof favoriteEvents;
  favoriteRestaurants: typeof favoriteRestaurants;
  "files/mutations": typeof files_mutations;
  "files/queries": typeof files_queries;
  "flyers/mutations": typeof flyers_mutations;
  "flyers/queries": typeof flyers_queries;
  foodOrders: typeof foodOrders;
  "hotels/bookings": typeof hotels_bookings;
  "hotels/hotelCron": typeof hotels_hotelCron;
  "hotels/mutations": typeof hotels_mutations;
  "hotels/queries": typeof hotels_queries;
  "hotels/seed": typeof hotels_seed;
  instructorAnalytics: typeof instructorAnalytics;
  "instructors/mutations": typeof instructors_mutations;
  "instructors/queries": typeof instructors_queries;
  "lib/activationCodes": typeof lib_activationCodes;
  "lib/auth": typeof lib_auth;
  "lib/helpers": typeof lib_helpers;
  "lib/permissions": typeof lib_permissions;
  "lib/restaurantAuth": typeof lib_restaurantAuth;
  "lib/restaurantPlans": typeof lib_restaurantPlans;
  "lib/roles": typeof lib_roles;
  "lib/timezone": typeof lib_timezone;
  "lib/validation": typeof lib_validation;
  "lib/vendorTiers": typeof lib_vendorTiers;
  menuItems: typeof menuItems;
  migrations: typeof migrations;
  "migrations/addVendorTiers": typeof migrations_addVendorTiers;
  "migrations/migrateToLocations": typeof migrations_migrateToLocations;
  "migrations/roleSeparation": typeof migrations_roleSeparation;
  "migrations/updatePaymentModels": typeof migrations_updatePaymentModels;
  "notifications/classReminders": typeof notifications_classReminders;
  "notifications/customerNotifications": typeof notifications_customerNotifications;
  "notifications/foodOrderNotifications": typeof notifications_foodOrderNotifications;
  "notifications/index": typeof notifications_index;
  "notifications/instructorDigests": typeof notifications_instructorDigests;
  "notifications/mutations": typeof notifications_mutations;
  "notifications/pushNotifications": typeof notifications_pushNotifications;
  "notifications/pushSubscriptions": typeof notifications_pushSubscriptions;
  "notifications/queries": typeof notifications_queries;
  "notifications/restaurantNotifications": typeof notifications_restaurantNotifications;
  "notifications/staffNotifications": typeof notifications_staffNotifications;
  "notifications/ticketNotifications": typeof notifications_ticketNotifications;
  "orders/cashPayments": typeof orders_cashPayments;
  "orders/cashPaymentsCron": typeof orders_cashPaymentsCron;
  "orders/mutations": typeof orders_mutations;
  "orders/queries": typeof orders_queries;
  "organizerPaymentMethods/index": typeof organizerPaymentMethods_index;
  "organizerPaymentMethods/mutations": typeof organizerPaymentMethods_mutations;
  "organizerPaymentMethods/queries": typeof organizerPaymentMethods_queries;
  "organizerPayouts/index": typeof organizerPayouts_index;
  "organizerPayouts/mutations": typeof organizerPayouts_mutations;
  "organizerPayouts/queries": typeof organizerPayouts_queries;
  "passport/mutations": typeof passport_mutations;
  "passport/queries": typeof passport_queries;
  "paymentConfig/mutations": typeof paymentConfig_mutations;
  "paymentConfig/queries": typeof paymentConfig_queries;
  "paymentDisputes/index": typeof paymentDisputes_index;
  "paymentDisputes/mutations": typeof paymentDisputes_mutations;
  "paymentDisputes/queries": typeof paymentDisputes_queries;
  "payments/actions": typeof payments_actions;
  "payments/mutations": typeof payments_mutations;
  "payments/queries": typeof payments_queries;
  "platformDebt/mutations": typeof platformDebt_mutations;
  "platformDebt/queries": typeof platformDebt_queries;
  "productOrders/mutations": typeof productOrders_mutations;
  "productOrders/queries": typeof productOrders_queries;
  productReviews: typeof productReviews;
  productWishlists: typeof productWishlists;
  "products/mutations": typeof products_mutations;
  "products/orders": typeof products_orders;
  "products/queries": typeof products_queries;
  "products/variationMutations": typeof products_variationMutations;
  "products/variations": typeof products_variations;
  "promotions/mutations": typeof promotions_mutations;
  "public/queries": typeof public_queries;
  radio: typeof radio;
  radioStreaming: typeof radioStreaming;
  restaurantActivity: typeof restaurantActivity;
  restaurantAnalytics: typeof restaurantAnalytics;
  restaurantHours: typeof restaurantHours;
  restaurantLocations: typeof restaurantLocations;
  restaurantReviews: typeof restaurantReviews;
  restaurantStaff: typeof restaurantStaff;
  restaurants: typeof restaurants;
  "scanning/mutations": typeof scanning_mutations;
  "scanning/queries": typeof scanning_queries;
  "scripts/updateTestUserRoles": typeof scripts_updateTestUserRoles;
  "seating/mutations": typeof seating_mutations;
  "seating/queries": typeof seating_queries;
  "seating/seatHoldsCron": typeof seating_seatHoldsCron;
  "seating/social": typeof seating_social;
  services: typeof services;
  "services/admin": typeof services_admin;
  "services/analytics": typeof services_analytics;
  "services/favorites": typeof services_favorites;
  "services/reviews": typeof services_reviews;
  shipping: typeof shipping;
  "staff/bundleSales": typeof staff_bundleSales;
  "staff/mutations": typeof staff_mutations;
  "staff/queries": typeof staff_queries;
  "staff/settlement": typeof staff_settlement;
  "staff/tierAllocations": typeof staff_tierAllocations;
  "staff/transfers": typeof staff_transfers;
  "subscriptions/mutations": typeof subscriptions_mutations;
  "supportTickets/mutations": typeof supportTickets_mutations;
  "supportTickets/queries": typeof supportTickets_queries;
  taxRates: typeof taxRates;
  "templates/mutations": typeof templates_mutations;
  "templates/queries": typeof templates_queries;
  "testing/seedMarketplace": typeof testing_seedMarketplace;
  "testing/seedRestaurants": typeof testing_seedRestaurants;
  "testing/setup": typeof testing_setup;
  "tickets/mutations": typeof tickets_mutations;
  "tickets/queries": typeof tickets_queries;
  "transfers/mutations": typeof transfers_mutations;
  "transfers/queries": typeof transfers_queries;
  upload: typeof upload;
  "users/admin": typeof users_admin;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  vendorCoupons: typeof vendorCoupons;
  vendorEarnings: typeof vendorEarnings;
  vendorPayouts: typeof vendorPayouts;
  vendors: typeof vendors;
  "waitlist/mutations": typeof waitlist_mutations;
  "waitlist/queries": typeof waitlist_queries;
  "webhookEvents/index": typeof webhookEvents_index;
  "webhookEvents/mutations": typeof webhookEvents_mutations;
  "webhookEvents/queries": typeof webhookEvents_queries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
