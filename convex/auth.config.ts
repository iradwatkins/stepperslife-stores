/**
 * Convex Auth Configuration
 *
 * This configures Convex to accept our custom JWT tokens issued by the Next.js API routes.
 * The tokens are created in /app/api/auth/convex-token/route.ts
 *
 * IMPORTANT: This configuration must match the issuer (iss) in the JWT tokens
 * created by /app/api/auth/convex-token/route.ts
 *
 * Required JWT fields: header (kid, alg, typ), payload (sub, iss, exp, iat)
 * The applicationID must match the "aud" field in the JWT
 */

export default {
  providers: [
    // Production - Main landing page
    {
      type: "customJwt" as const,
      issuer: "https://stepperslife.com",
      jwks: "https://stepperslife.com/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Production - www subdomain
    {
      type: "customJwt" as const,
      issuer: "https://www.stepperslife.com",
      jwks: "https://www.stepperslife.com/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Production - Events subdomain
    {
      type: "customJwt" as const,
      issuer: "https://events.stepperslife.com",
      jwks: "https://events.stepperslife.com/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Production - Restaurants subdomain
    {
      type: "customJwt" as const,
      issuer: "https://restaurants.stepperslife.com",
      jwks: "https://restaurants.stepperslife.com/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Production - Stores subdomain
    {
      type: "customJwt" as const,
      issuer: "https://stores.stepperslife.com",
      jwks: "https://stores.stepperslife.com/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Development - Landing (port 3018)
    {
      type: "customJwt" as const,
      issuer: "http://localhost:3018",
      jwks: "http://localhost:3018/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Development - Events (port 3001)
    {
      type: "customJwt" as const,
      issuer: "http://localhost:3001",
      jwks: "http://localhost:3001/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Development - Restaurants (port 3016)
    {
      type: "customJwt" as const,
      issuer: "http://localhost:3016",
      jwks: "http://localhost:3016/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Development - Stores (port 3017)
    {
      type: "customJwt" as const,
      issuer: "http://localhost:3017",
      jwks: "http://localhost:3017/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
    // Legacy - Original dev port
    {
      type: "customJwt" as const,
      issuer: "http://localhost:3004",
      jwks: "http://localhost:3004/.well-known/jwks.json",
      algorithm: "RS256" as const,
      applicationID: "convex",
    },
  ],
};
