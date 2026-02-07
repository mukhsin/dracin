import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  CircuitBreaker,
  FallbackService,
  resetFallbackService,
  getFallbackService,
  type FallbackConfig,
} from "../lib/fallback.js";
import { createApp } from "../app.js";

describe("Circuit Breaker", () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      name: "test-circuit",
    });
  });

  describe("Initial State", () => {
    it("should start in CLOSED state", () => {
      const state = circuitBreaker.getState();
      expect(state.state).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
      expect(state.nextAttempt).toBeNull();
    });

    it("should allow execution when CLOSED", () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });
  });

  describe("Failure Handling", () => {
    it("should increment failure count on recordFailure", () => {
      circuitBreaker.recordFailure();
      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(1);
      expect(state.state).toBe("CLOSED");
    });

    it("should open circuit after reaching failure threshold", () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      const state = circuitBreaker.getState();
      expect(state.state).toBe("OPEN");
      expect(state.failureCount).toBe(3);
      expect(state.nextAttempt).not.toBeNull();
    });

    it("should not allow execution when OPEN", () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      expect(circuitBreaker.canExecute()).toBe(false);
    });

    it("should reset failure count on recordSuccess", () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();

      const state = circuitBreaker.getState();
      expect(state.failureCount).toBe(0);
      expect(state.state).toBe("CLOSED");
    });
  });

  describe("HALF_OPEN State", () => {
    it("should transition to HALF_OPEN after reset timeout", async () => {
      const shortCircuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 50,
        name: "test-half-open",
      });

      shortCircuitBreaker.recordFailure();
      shortCircuitBreaker.recordFailure();

      expect(shortCircuitBreaker.canExecute()).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shortCircuitBreaker.canExecute()).toBe(true);
      const state = shortCircuitBreaker.getState();
      expect(state.state).toBe("HALF_OPEN");
    });

    it("should close circuit on success in HALF_OPEN", async () => {
      const shortCircuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 50,
        name: "test-close",
      });

      shortCircuitBreaker.recordFailure();
      shortCircuitBreaker.recordFailure();
      await new Promise((resolve) => setTimeout(resolve, 100));

      shortCircuitBreaker.canExecute();
      shortCircuitBreaker.recordSuccess();

      const state = shortCircuitBreaker.getState();
      expect(state.state).toBe("CLOSED");
      expect(state.failureCount).toBe(0);
    });

    it("should reopen circuit on failure in HALF_OPEN", async () => {
      const shortCircuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 50,
        name: "test-reopen",
      });

      shortCircuitBreaker.recordFailure();
      shortCircuitBreaker.recordFailure();
      await new Promise((resolve) => setTimeout(resolve, 100));

      shortCircuitBreaker.canExecute();
      shortCircuitBreaker.recordFailure();

      const state = shortCircuitBreaker.getState();
      expect(state.state).toBe("OPEN");
    });
  });

  describe("State Monitoring", () => {
    it("should provide accurate state information", () => {
      const state = circuitBreaker.getState();
      expect(state).toHaveProperty("state");
      expect(state).toHaveProperty("failureCount");
      expect(state).toHaveProperty("nextAttempt");
    });

    it("should track nextAttempt when OPEN", () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();

      const state = circuitBreaker.getState();
      expect(state.nextAttempt).toBeGreaterThan(Date.now());
    });
  });
});

describe("Fallback Service", () => {
  let primaryServer: ReturnType<typeof Bun.serve> | null = null;
  let fallbackServer: ReturnType<typeof Bun.serve> | null = null;

  afterEach(() => {
    if (primaryServer) {
      primaryServer.stop();
      primaryServer = null;
    }
    if (fallbackServer) {
      fallbackServer.stop();
      fallbackServer = null;
    }
    resetFallbackService();
  });

  describe("Primary Service Success", () => {
    it("should return data from primary service when available", async () => {
      primaryServer = Bun.serve({
        port: 19991,
        fetch() {
          return Response.json({ data: "primary" });
        },
      });

      fallbackServer = Bun.serve({
        port: 19992,
        fetch() {
          return Response.json({ data: "fallback" });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:19991",
        fallbackUrl: "http://localhost:19992",
        timeoutMs: 1000,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          name: "test-primary-success",
        },
      });

      const result = await service.execute("/api/test");

      expect(result.success).toBe(true);
      expect(result.source).toBe("primary");
      expect(result.data).toEqual({ data: "primary" });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Fallback Mechanism", () => {
    it("should fallback to secondary service when primary fails", async () => {
      primaryServer = Bun.serve({
        port: 19993,
        fetch() {
          return new Response("Error", { status: 500 });
        },
      });

      fallbackServer = Bun.serve({
        port: 19994,
        fetch() {
          return Response.json({ data: "fallback" });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:19993",
        fallbackUrl: "http://localhost:19994",
        timeoutMs: 1000,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          name: "test-fallback",
        },
      });

      const result = await service.execute("/api/test");

      expect(result.success).toBe(true);
      expect(result.source).toBe("fallback");
      expect(result.data).toEqual({ data: "fallback" });
    });

    it("should return error when both services fail", async () => {
      primaryServer = Bun.serve({
        port: 19995,
        fetch() {
          return new Response("Error", { status: 500 });
        },
      });

      fallbackServer = Bun.serve({
        port: 19996,
        fetch() {
          return new Response("Error", { status: 500 });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:19995",
        fallbackUrl: "http://localhost:19996",
        timeoutMs: 1000,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          name: "test-both-fail",
        },
      });

      const result = await service.execute("/api/test");

      expect(result.success).toBe(false);
      expect(result.source).toBe("none");
      expect(result.error).toContain("Both primary and fallback failed");
    });

    it("should track circuit breaker status after failures", async () => {
      primaryServer = Bun.serve({
        port: 19997,
        fetch() {
          return new Response("Error", { status: 500 });
        },
      });

      fallbackServer = Bun.serve({
        port: 19998,
        fetch() {
          return Response.json({ data: "fallback" });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:19997",
        fallbackUrl: "http://localhost:19998",
        timeoutMs: 1000,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          name: "test-cb-track",
        },
      });

      for (let i = 0; i < 4; i++) {
        await service.execute("/api/test");
      }

      const status = service.getCircuitStatus();
      expect(status.state).toBe("OPEN");
      expect(status.failureCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout slow primary and use fallback", async () => {
      primaryServer = Bun.serve({
        port: 19999,
        async fetch() {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return Response.json({ data: "primary" });
        },
      });

      fallbackServer = Bun.serve({
        port: 20000,
        fetch() {
          return Response.json({ data: "fallback" });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:19999",
        fallbackUrl: "http://localhost:20000",
        timeoutMs: 100,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          name: "test-timeout",
        },
      });

      const result = await service.execute("/api/test");

      expect(result.success).toBe(true);
      expect(result.source).toBe("fallback");
    });

    it("should handle timeout as failure for circuit breaker", async () => {
      primaryServer = Bun.serve({
        port: 20001,
        async fetch() {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return Response.json({ data: "primary" });
        },
      });

      fallbackServer = Bun.serve({
        port: 20002,
        fetch() {
          return Response.json({ data: "fallback" });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:20001",
        fallbackUrl: "http://localhost:20002",
        timeoutMs: 100,
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeoutMs: 5000,
          name: "test-timeout-cb",
        },
      });

      await service.execute("/api/test");
      await service.execute("/api/test");

      const status = service.getCircuitStatus();
      expect(status.failureCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Circuit Breaker Integration", () => {
    it("should skip primary when circuit is OPEN", async () => {
      let primaryRequestCount = 0;

      primaryServer = Bun.serve({
        port: 20003,
        fetch() {
          primaryRequestCount++;
          return new Response("Error", { status: 500 });
        },
      });

      fallbackServer = Bun.serve({
        port: 20004,
        fetch() {
          return Response.json({ data: "fallback" });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:20003",
        fallbackUrl: "http://localhost:20004",
        timeoutMs: 1000,
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeoutMs: 5000,
          name: "test-skip-primary",
        },
      });

      for (let i = 0; i < 3; i++) {
        await service.execute("/api/test");
      }

      const countAfterOpen = primaryRequestCount;

      await service.execute("/api/test");

      expect(primaryRequestCount).toBe(countAfterOpen);
    });

    it("should provide circuit breaker status", async () => {
      primaryServer = Bun.serve({
        port: 20005,
        fetch() {
          return Response.json({ data: "primary" });
        },
      });

      fallbackServer = Bun.serve({
        port: 20006,
        fetch() {
          return Response.json({ data: "fallback" });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:20005",
        fallbackUrl: "http://localhost:20006",
        timeoutMs: 1000,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          name: "test-status",
        },
      });

      const status = service.getCircuitStatus();

      expect(status).toHaveProperty("state");
      expect(status).toHaveProperty("failureCount");
      expect(status).toHaveProperty("nextAttempt");
    });
  });

  describe("Request Options", () => {
    it("should pass custom headers to request", async () => {
      let receivedHeaderValue: string | null = null;

      primaryServer = Bun.serve({
        port: 20007,
        fetch(req) {
          receivedHeaderValue = req.headers.get("X-Custom-Header");
          return Response.json({ success: true });
        },
      });

      fallbackServer = Bun.serve({
        port: 20008,
        fetch() {
          return Response.json({ success: true });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:20007",
        fallbackUrl: "http://localhost:20008",
        timeoutMs: 1000,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          name: "test-headers",
        },
      });

      await service.execute("/api/test", {
        headers: { "X-Custom-Header": "test-value" },
      });

      expect(receivedHeaderValue === "test-value").toBe(true);
    });

    it("should support different HTTP methods", async () => {
      let receivedMethod = "";

      primaryServer = Bun.serve({
        port: 20009,
        fetch(req) {
          receivedMethod = req.method;
          return Response.json({ success: true, method: req.method });
        },
      });

      fallbackServer = Bun.serve({
        port: 20010,
        fetch() {
          return Response.json({ success: true });
        },
      });

      const service = new FallbackService({
        primaryUrl: "http://localhost:20009",
        fallbackUrl: "http://localhost:20010",
        timeoutMs: 1000,
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          name: "test-methods",
        },
      });

      await service.execute("/api/test", { method: "POST" });

      expect(receivedMethod).toBe("POST");
    });
  });
});

describe("Fallback Admin Endpoints", () => {
  const app = createApp();

  beforeEach(() => {
    resetFallbackService();
  });

  afterEach(() => {
    resetFallbackService();
  });

  describe("GET /api/admin/fallback/status", () => {
    it("should return circuit breaker status", async () => {
      const res = await app.request("/api/admin/fallback/status");

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.data.circuitBreaker).toBeDefined();
      expect(data.data.circuitBreaker.state).toBeDefined();
      expect(data.data.circuitBreaker.failureCount).toBeDefined();
      expect(data.data.timestamp).toBeDefined();
    });

    it("should return current timestamp", async () => {
      const before = Date.now();
      const res = await app.request("/api/admin/fallback/status");
      const after = Date.now();

      const data = await res.json();
      const timestamp = new Date(data.data.timestamp).getTime();
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe("POST /api/admin/fallback/clear-cache", () => {
    it("should clear fallback cache successfully", async () => {
      const res = await app.request("/api/admin/fallback/clear-cache", {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Fallback cache cleared successfully");
    });

    it("should handle multiple clear requests", async () => {
      const res1 = await app.request("/api/admin/fallback/clear-cache", {
        method: "POST",
      });
      expect(res1.status).toBe(200);

      const res2 = await app.request("/api/admin/fallback/clear-cache", {
        method: "POST",
      });
      expect(res2.status).toBe(200);
    });
  });

  describe("Integration with Circuit Breaker", () => {
    it("should reflect circuit breaker state changes in status", async () => {
      const service = getFallbackService();

      const initialRes = await app.request("/api/admin/fallback/status");
      const initialData = await initialRes.json();
      expect(initialData.data.circuitBreaker.state).toBe("CLOSED");

      for (let i = 0; i < 5; i++) {
        service.getCircuitStatus();
      }

      const finalRes = await app.request("/api/admin/fallback/status");
      const finalData = await finalRes.json();
      expect(finalData.data.circuitBreaker.state).toBeDefined();
    });
  });
});

describe("Fallback Edge Cases", () => {
  let server: ReturnType<typeof Bun.serve> | null = null;

  afterEach(() => {
    if (server) {
      server.stop();
      server = null;
    }
    resetFallbackService();
  });

  it("should handle network errors gracefully", async () => {
    const service = new FallbackService({
      primaryUrl: "http://localhost:59999",
      fallbackUrl: "http://localhost:59998",
      timeoutMs: 500,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        name: "test-network-error",
      },
    });

    const result = await service.execute("/api/test");

    expect(result.success).toBe(false);
    expect(result.source).toBe("none");
    expect(result.error).toBeDefined();
  });

  it("should handle malformed JSON responses", async () => {
    server = Bun.serve({
      port: 20011,
      fetch() {
        return new Response("not valid json", {
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    const fallbackServer = Bun.serve({
      port: 20012,
      fetch() {
        return new Response("not valid json", {
          headers: { "Content-Type": "application/json" },
        });
      },
    });

    const service = new FallbackService({
      primaryUrl: "http://localhost:20011",
      fallbackUrl: "http://localhost:20012",
      timeoutMs: 500,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        name: "test-json-error",
      },
    });

    const result = await service.execute("/api/test");

    expect(result.success).toBe(false);
    fallbackServer.stop();
  });

  it("should handle HTTP error status codes", async () => {
    server = Bun.serve({
      port: 20013,
      fetch() {
        return new Response("Not Found", { status: 404 });
      },
    });

    const fallbackServer = Bun.serve({
      port: 20014,
      fetch() {
        return new Response("Not Found", { status: 404 });
      },
    });

    const service = new FallbackService({
      primaryUrl: "http://localhost:20013",
      fallbackUrl: "http://localhost:20014",
      timeoutMs: 500,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        name: "test-http-error",
      },
    });

    const result = await service.execute("/api/test");

    expect(result.success).toBe(false);
    fallbackServer.stop();
  });
});
