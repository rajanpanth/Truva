import { describe, it, expect } from "vitest";
import { truvaPlugin } from "../src/eliza";

const mockRuntime = {
  agentId: "8xpN9RxiDhzVNMCLmFqiUFmFgHcnBMiUuEbzpMx6Wys",
  getSetting: (_key: string): string | undefined => undefined,
};

const mockMemory = (content: Record<string, unknown>) => ({ content });

describe("elizaOS Plugin — truvaPlugin", () => {
  it("has correct plugin structure", () => {
    expect(truvaPlugin.name).toBe("truva-reputation");
    expect(Array.isArray(truvaPlugin.actions)).toBe(true);
    expect(Array.isArray(truvaPlugin.providers)).toBe(true);
  });

  it("has TRUVA_VERIFY_TRUST action", () => {
    const action = truvaPlugin.actions[0];
    expect(action.name).toBe("TRUVA_VERIFY_TRUST");
    expect(typeof action.validate).toBe("function");
    expect(typeof action.handler).toBe("function");
  });

  it("validate() returns true for high-value amount", async () => {
    const action = truvaPlugin.actions[0];
    const result = await action.validate(
      mockRuntime as any,
      mockMemory({ amount: 10_000_000_000 }) as any
    );
    expect(result).toBe(true);
  });

  it("validate() returns false for low-value no-tier message", async () => {
    const action = truvaPlugin.actions[0];
    const result = await action.validate(
      mockRuntime as any,
      mockMemory({ amount: 100 }) as any
    );
    expect(result).toBe(false);
  });

  it("validate() returns true when tier is specified (any amount)", async () => {
    const action = truvaPlugin.actions[0];
    const result = await action.validate(
      mockRuntime as any,
      mockMemory({ tier: "Gold", amount: 100 }) as any
    );
    expect(result).toBe(true);
  });

  it("validate() returns true when no content at all but amount missing defaults to 0", async () => {
    const action = truvaPlugin.actions[0];
    const result = await action.validate(
      mockRuntime as any,
      mockMemory({}) as any
    );
    expect(result).toBe(false);
  });

  it("handler() returns FAIL for an invalid pubkey", async () => {
    const action = truvaPlugin.actions[0];
    const result = await action.handler(
      mockRuntime as any,
      mockMemory({ agentId: "NOT_A_PUBKEY", tier: "Silver" }) as any
    );
    expect(result.success).toBe(false);
    const data = result.data as Record<string, unknown>;
    expect(data["code"]).toBe("INVALID_PUBKEY");
    expect(result.metadata.toolName).toBe("TRUVA_VERIFY_TRUST");
  });

  it("has TRUVA_TRUST_STATUS provider", () => {
    const provider = truvaPlugin.providers[0];
    expect(provider.name).toBe("TRUVA_TRUST_STATUS");
    expect(typeof provider.get).toBe("function");
  });

  it("provider.get() returns JSON string with error for invalid agentId", async () => {
    const provider = truvaPlugin.providers[0];
    const result = await provider.get(
      { ...mockRuntime, agentId: "BAD_KEY" } as any,
      mockMemory({}) as any
    );
    const parsed = JSON.parse(result) as Record<string, unknown>;
    expect(parsed["agentId"]).toBe("BAD_KEY");
    expect(typeof parsed["error"]).toBe("string");
  });

  it("plugin has at least one action example", () => {
    const action = truvaPlugin.actions[0];
    expect(Array.isArray(action.examples)).toBe(true);
    expect(action.examples.length).toBeGreaterThan(0);
  });
});
