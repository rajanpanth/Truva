import { describe, it, expect } from "vitest";
import { Connection } from "@solana/web3.js";
import { createTruvaTool } from "../src/langchain";

const dummyConnection = new Connection("https://api.devnet.solana.com", "confirmed");

describe("LangChain Tool — createTruvaTool", () => {
  it("returns a tool with the correct structure", () => {
    const tool = createTruvaTool(dummyConnection);
    expect(tool.name).toBe("truva_trust_check");
    expect(typeof tool.description).toBe("string");
    expect(tool.description.length).toBeGreaterThan(0);
    expect(typeof tool.schema).toBe("object");
    expect(typeof tool.invoke).toBe("function");
  });

  it("schema has required fields: tier, agentPubkey", () => {
    const tool = createTruvaTool(dummyConnection);
    const schema = tool.schema as Record<string, unknown>;
    const props = schema["properties"] as Record<string, unknown>;
    const required = schema["required"] as string[];
    expect(props).toHaveProperty("tier");
    expect(props).toHaveProperty("agentPubkey");
    expect(required).toContain("tier");
    expect(required).toContain("agentPubkey");
  });

  it("schema tier enum includes all four tiers", () => {
    const tool = createTruvaTool(dummyConnection);
    const schema = tool.schema as Record<string, unknown>;
    const props = schema["properties"] as Record<string, { enum?: string[] }>;
    expect(props["tier"].enum).toEqual(["Bronze", "Silver", "Gold", "Platinum"]);
  });

  it("invoke() returns FAIL for an invalid pubkey (sync-safe check)", async () => {
    const tool = createTruvaTool(dummyConnection);
    const result = JSON.parse(
      await tool.invoke({ tier: "Bronze", agentPubkey: "NOT_A_VALID_KEY" })
    ) as Record<string, unknown>;
    expect(result["status"]).toBe("FAIL");
    expect(result["code"]).toBe("INVALID_PUBKEY");
    expect(typeof result["action"]).toBe("string");
  });

  it("invoke() result for invalid pubkey always says DO NOT execute", async () => {
    const tool = createTruvaTool(dummyConnection);
    const raw = await tool.invoke({ tier: "Gold", agentPubkey: "bad_key" });
    const result = JSON.parse(raw) as Record<string, unknown>;
    expect(String(result["action"])).toContain("DO NOT");
  });

  it("createTruvaTool accepts an optional apiUrl", () => {
    expect(() =>
      createTruvaTool(dummyConnection, "http://localhost:3001")
    ).not.toThrow();
  });
});
