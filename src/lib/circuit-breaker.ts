/**
 * Circuit Breaker Pattern for External API Calls
 *
 * Prevents cascading failures when external services (Stripe, PayPal) are down.
 * States: CLOSED (normal) -> OPEN (failing, reject requests) -> HALF_OPEN (testing)
 */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  name: string;                    // Service name for logging
  failureThreshold?: number;       // Failures before opening (default: 5)
  successThreshold?: number;       // Successes to close from half-open (default: 2)
  timeout?: number;                // Time in ms before trying again (default: 30s)
  monitorWindow?: number;          // Time window to track failures (default: 60s)
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number | null;
  lastStateChange: number;
  totalRequests: number;
  totalFailures: number;
}

// Store circuit breaker states by service name
const circuitStates = new Map<string, CircuitBreakerState>();

const DEFAULT_OPTIONS: Required<Omit<CircuitBreakerOptions, "name">> = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30 * 1000,         // 30 seconds
  monitorWindow: 60 * 1000,   // 60 seconds
};

function getState(name: string): CircuitBreakerState {
  if (!circuitStates.has(name)) {
    circuitStates.set(name, {
      state: "CLOSED",
      failures: 0,
      successes: 0,
      lastFailure: null,
      lastStateChange: Date.now(),
      totalRequests: 0,
      totalFailures: 0,
    });
  }
  return circuitStates.get(name)!;
}

/**
 * Check if the circuit allows requests through
 */
export function canRequest(name: string, options: CircuitBreakerOptions): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const state = getState(name);
  const now = Date.now();

  switch (state.state) {
    case "CLOSED":
      return true;

    case "OPEN":
      // Check if timeout has passed - transition to half-open
      if (now - state.lastStateChange >= opts.timeout) {
        state.state = "HALF_OPEN";
        state.lastStateChange = now;
        state.successes = 0;
        console.log(`[CircuitBreaker:${name}] State: OPEN -> HALF_OPEN (timeout elapsed)`);
        return true;
      }
      return false;

    case "HALF_OPEN":
      // Allow limited requests through to test the service
      return true;

    default:
      return true;
  }
}

/**
 * Record a successful request
 */
export function recordSuccess(name: string, options: CircuitBreakerOptions): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const state = getState(name);
  state.totalRequests++;

  switch (state.state) {
    case "CLOSED":
      // Reset failure count on success
      state.failures = 0;
      break;

    case "HALF_OPEN":
      state.successes++;
      if (state.successes >= opts.successThreshold) {
        state.state = "CLOSED";
        state.lastStateChange = Date.now();
        state.failures = 0;
        state.successes = 0;
        console.log(`[CircuitBreaker:${name}] State: HALF_OPEN -> CLOSED (service recovered)`);
      }
      break;
  }
}

/**
 * Record a failed request
 */
export function recordFailure(name: string, options: CircuitBreakerOptions, error?: Error): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const state = getState(name);
  const now = Date.now();

  state.totalRequests++;
  state.totalFailures++;
  state.failures++;
  state.lastFailure = now;

  // Reset failures if outside monitor window
  if (state.state === "CLOSED" && state.lastFailure && now - state.lastFailure > opts.monitorWindow) {
    state.failures = 1;
  }

  switch (state.state) {
    case "CLOSED":
      if (state.failures >= opts.failureThreshold) {
        state.state = "OPEN";
        state.lastStateChange = now;
        console.error(`[CircuitBreaker:${name}] State: CLOSED -> OPEN (threshold reached: ${state.failures} failures)`, {
          error: error?.message,
          totalFailures: state.totalFailures,
        });
      }
      break;

    case "HALF_OPEN":
      // Any failure in half-open immediately opens the circuit
      state.state = "OPEN";
      state.lastStateChange = now;
      state.successes = 0;
      console.error(`[CircuitBreaker:${name}] State: HALF_OPEN -> OPEN (failed during test)`, {
        error: error?.message,
      });
      break;
  }
}

/**
 * Get current circuit breaker status
 */
export function getCircuitStatus(name: string): CircuitBreakerState & { isOpen: boolean } {
  const state = getState(name);
  return {
    ...state,
    isOpen: state.state === "OPEN",
  };
}

/**
 * Reset circuit breaker (for testing or manual intervention)
 */
export function resetCircuit(name: string): void {
  circuitStates.delete(name);
  console.log(`[CircuitBreaker:${name}] Circuit reset to CLOSED`);
}

/**
 * Create a circuit breaker error response
 */
export function createCircuitOpenResponse(serviceName: string): Response {
  return new Response(
    JSON.stringify({
      error: "Service temporarily unavailable",
      message: `The ${serviceName} service is experiencing issues. Please try again in 30 seconds.`,
      code: "CIRCUIT_OPEN",
      retryAfter: 30,
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "30",
      },
    }
  );
}

/**
 * Execute a function with circuit breaker protection
 * Wraps async operations with automatic success/failure tracking
 */
export async function withCircuitBreaker<T>(
  options: CircuitBreakerOptions,
  fn: () => Promise<T>
): Promise<T> {
  const { name } = options;

  // Check if circuit allows the request
  if (!canRequest(name, options)) {
    const status = getCircuitStatus(name);
    const error = new Error(`Circuit breaker is OPEN for ${name}`);
    (error as any).code = "CIRCUIT_OPEN";
    (error as any).retryAfter = Math.ceil((status.lastStateChange + (options.timeout || 30000) - Date.now()) / 1000);
    throw error;
  }

  try {
    const result = await fn();
    recordSuccess(name, options);
    return result;
  } catch (error) {
    recordFailure(name, options, error as Error);
    throw error;
  }
}

// Pre-configured circuit breakers for payment services
export const circuitBreakers = {
  stripe: {
    name: "stripe",
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30 * 1000,
  },
  paypal: {
    name: "paypal",
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30 * 1000,
  },
  postal: {
    name: "postal",
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 60 * 1000,  // Email can wait longer
  },
};

/**
 * Check if an error should trip the circuit breaker
 * Network errors and 5xx errors should trip, but 4xx shouldn't
 */
export function isCircuitBreakerError(error: any): boolean {
  // Network errors
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND") {
    return true;
  }

  // Stripe connection errors
  if (error.type === "StripeConnectionError" || error.type === "StripeAPIError") {
    return true;
  }

  // HTTP 5xx errors
  if (error.statusCode >= 500 || error.status >= 500) {
    return true;
  }

  // Rate limiting (429) should also trip to protect the service
  if (error.statusCode === 429 || error.status === 429) {
    return true;
  }

  return false;
}
