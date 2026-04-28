/**
 * TruvaError — thrown when a trust-gate check fails.
 */
export class TruvaError extends Error {
  public readonly currentTier: string;
  public readonly requiredTier: string;

  constructor(message: string, currentTier: string, requiredTier: string) {
    super(message);
    this.name = "TruvaError";
    this.currentTier = currentTier;
    this.requiredTier = requiredTier;
    // Restore prototype chain for instanceof checks across transpiled ES5
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
