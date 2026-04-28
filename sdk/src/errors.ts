/**
 * TruvaError — base class for all Truva trust-gate failures.
 */
export class TruvaError extends Error {
  public readonly currentTier: string;
  public readonly requiredTier: string;
  public readonly code: string;

  constructor(message: string, currentTier: string, requiredTier: string, code = "TRUST_CHECK_FAILED") {
    super(message);
    this.name = "TruvaError";
    this.currentTier = currentTier;
    this.requiredTier = requiredTier;
    this.code = code;
    // Restore prototype chain for instanceof checks across transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an agent's tier is below the required minimum.
 */
export class InsufficientTierError extends TruvaError {
  public readonly actualTier: string;

  constructor(actualTier: string, requiredTier: string) {
    super(
      `InsufficientTrust: Agent is ${actualTier} but ${requiredTier} is required`,
      actualTier,
      requiredTier,
      "INSUFFICIENT_TIER"
    );
    this.name = "InsufficientTierError";
    this.actualTier = actualTier;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when an agent's passport has been frozen by a validator.
 */
export class AgentFrozenError extends TruvaError {
  constructor(agentId: string) {
    super(
      `Agent ${agentId} has been frozen by a validator`,
      "Frozen",
      "Any",
      "AGENT_FROZEN"
    );
    this.name = "AgentFrozenError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
