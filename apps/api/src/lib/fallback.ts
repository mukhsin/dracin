const log = (message: string) => console.log(message);

/**
 * Circuit Breaker States
 */
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit Breaker Configuration
 */
interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in milliseconds before attempting to close the circuit */
  resetTimeoutMs: number;
  /** Name for logging purposes */
  name: string;
}

/**
 * Circuit Breaker for handling cascading failures
 * Prevents overwhelming a failing service by temporarily blocking requests
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private nextAttempt: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Check if the circuit allows requests through
   */
  canExecute(): boolean {
    if (this.state === "CLOSED") return true;

    if (this.state === "OPEN") {
      if (Date.now() >= this.nextAttempt) {
        this.state = "HALF_OPEN";
        log(
          `[CircuitBreaker:${this.config.name}] Entering HALF_OPEN state - testing service`,
        );
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow one request to test
    return true;
  }

  /**
   * Record a successful execution
   */
  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === "HALF_OPEN") {
      this.state = "CLOSED";
      log(
        `[CircuitBreaker:${this.config.name}] Circuit CLOSED - service recovered`,
      );
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
      this.nextAttempt = Date.now() + this.config.resetTimeoutMs;
      log(
        `[CircuitBreaker:${this.config.name}] Circuit OPENED after ${this.failureCount} failures. ` +
          `Will retry after ${this.config.resetTimeoutMs}ms`,
      );
    }
  }

  /**
   * Get current state for monitoring
   */
  getState(): {
    state: CircuitState;
    failureCount: number;
    nextAttempt: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.state === "OPEN" ? this.nextAttempt : null,
    };
  }
}

/**
 * Fallback Service Configuration
 */
export interface FallbackConfig {
  /** Primary service base URL */
  primaryUrl: string;
  /** Fallback service base URL (Express API-Proxy) */
  fallbackUrl: string;
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;
}

/**
 * Default fallback configuration
 */
export const defaultFallbackConfig: FallbackConfig = {
  primaryUrl: process.env.PRIMARY_API_URL || "http://localhost:3001",
  fallbackUrl: process.env.API_PROXY_URL || "http://localhost:3002",
  timeoutMs: 5000,
  circuitBreaker: {
    failureThreshold: 3,
    resetTimeoutMs: 30000,
    name: "video-fallback",
  },
};

/**
 * Result from a fallback attempt
 */
export interface FallbackResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: "primary" | "fallback" | "none";
  durationMs: number;
}

/**
 * Fallback Service with Circuit Breaker
 * Tries primary service first, falls back to secondary on failure
 */
export class FallbackService {
  private circuitBreaker: CircuitBreaker;

  constructor(private config: FallbackConfig) {
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
  }

  /**
   * Execute a request with fallback logic
   * @param path - API path (e.g., "/api/episodes/123/videos")
   * @param options - Fetch options
   * @returns FallbackResult with data from primary or fallback source
   */
  async execute<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<FallbackResult<T>> {
    const startTime = Date.now();

    // Try primary first if circuit is closed or half-open
    if (this.circuitBreaker.canExecute()) {
      try {
        const primaryResult = await this.tryPrimary<T>(path, options);
        this.circuitBreaker.recordSuccess();
        return {
          success: true,
          data: primaryResult,
          source: "primary",
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        this.circuitBreaker.recordFailure();
        log(
          `[FallbackService] Primary failed for ${path}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      log(`[FallbackService] Circuit OPEN - skipping primary for ${path}`);
    }

    // Try fallback
    try {
      const fallbackResult = await this.tryFallback<T>(path, options);
      return {
        success: true,
        data: fallbackResult,
        source: "fallback",
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log(
        `[FallbackService] Fallback also failed for ${path}: ${errorMessage}`,
      );

      return {
        success: false,
        error: `Both primary and fallback failed. Last error: ${errorMessage}`,
        source: "none",
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Try the primary service
   */
  private async tryPrimary<T>(path: string, options: RequestInit): Promise<T> {
    const url = `${this.config.primaryUrl}${path}`;
    return this.fetchWithTimeout<T>(url, options);
  }

  /**
   * Try the fallback service (Express API-Proxy)
   */
  private async tryFallback<T>(path: string, options: RequestInit): Promise<T> {
    const url = `${this.config.fallbackUrl}${path}`;
    log(`[FallbackService] Attempting fallback: ${url}`);
    return this.fetchWithTimeout<T>(url, options);
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout<T>(
    url: string,
    options: RequestInit,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs,
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitStatus() {
    return this.circuitBreaker.getState();
  }
}

/**
 * Create a singleton fallback service instance
 */
let fallbackServiceInstance: FallbackService | null = null;

export function getFallbackService(
  config?: Partial<FallbackConfig>,
): FallbackService {
  if (!fallbackServiceInstance) {
    fallbackServiceInstance = new FallbackService({
      ...defaultFallbackConfig,
      ...config,
    });
  }
  return fallbackServiceInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetFallbackService(): void {
  fallbackServiceInstance = null;
}

/**
 * Force reset circuit breaker state to CLOSED
 * Useful when circuit is stuck OPEN due to temporary failures
 */
export function resetCircuitBreaker(): void {
  if (fallbackServiceInstance) {
    // Create new instance with fresh circuit breaker
    fallbackServiceInstance = new FallbackService({
      ...defaultFallbackConfig,
    });
    console.log("[FallbackService] Circuit breaker reset to CLOSED state");
  }
}
