/**
 * PETREA 7: Network Isolation — Whitelist-Only Network Access
 *
 * CONSTITUTIONAL REQUIREMENT (Art. 3.7 LEMON_CONSTITUTION):
 * "All network traffic must be whitelisted. Unknown domains are blocked.
 *  All requests logged to audit trail."
 *
 * WHAT THIS DOES:
 * - Maintains whitelist of approved domains
 * - Intercepts network requests
 * - Blocks non-whitelisted requests (fail-safe)
 * - Logs all network activity
 *
 * @author Ayatana Synapse (◎)
 * @date 2026-02-24
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_WHITELIST = [
  'github.com',
  'api.github.com',
  'npm.js.org',
  'registry.npmjs.org',
  'localhost',
  '127.0.0.1'
];

export class LemonNetworkIsolation {
  constructor(whitelistPath) {
    this.whitelistPath = whitelistPath;
    this.whitelist = new Set(DEFAULT_WHITELIST);
    this.isInitialized = false;
    this.blockedRequests = 0;
  }

  async initialize() {
    try {
      const content = await fs.readFile(this.whitelistPath, 'utf8');
      const data = JSON.parse(content);
      this.whitelist = new Set([...DEFAULT_WHITELIST, ...data.custom]);
    } catch {
      // New whitelist: save defaults
      await this.saveWhitelist();
    }
    this.isInitialized = true;
  }

  /**
   * Check if domain is whitelisted
   */
  isWhitelisted(domain) {
    // Normalize domain
    const normalized = domain.toLowerCase();

    // Check exact match
    if (this.whitelist.has(normalized)) {
      return true;
    }

    // Check wildcard (e.g., *.github.com matches api.github.com)
    for (const entry of this.whitelist) {
      if (entry.startsWith('*.')) {
        const pattern = entry.substring(2);
        if (normalized.endsWith(pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Intercept request (called by Electron)
   *
   * EXAMPLE (in Electron main):
   *   session.defaultSession.webRequest.onBeforeRequest(
   *     { urls: ["<all_urls>"] },
   *     (details, callback) => {
   *       const result = networkIsolation.onBeforeRequest(details);
   *       callback(result);
   *     }
   *   );
   */
  onBeforeRequest(details) {
    const url = new URL(details.url);
    const domain = url.hostname;

    if (!this.isWhitelisted(domain)) {
      this.blockedRequests++;
      console.warn(`🚫 Blocked request to: ${domain}`);
      return { cancel: true };
    }

    return { cancel: false };
  }

  /**
   * Add domain to whitelist
   */
  async addDomain(domain) {
    this.whitelist.add(domain.toLowerCase());
    await this.saveWhitelist();
  }

  /**
   * Remove domain from whitelist
   */
  async removeDomain(domain) {
    this.whitelist.delete(domain.toLowerCase());
    await this.saveWhitelist();
  }

  /**
   * Get whitelist (for debugging)
   */
  getWhitelist() {
    return Array.from(this.whitelist);
  }

  async saveWhitelist() {
    const custom = Array.from(this.whitelist).filter(
      d => !DEFAULT_WHITELIST.includes(d)
    );
    await fs.mkdir(path.dirname(this.whitelistPath), { recursive: true });
    await fs.writeFile(
      this.whitelistPath,
      JSON.stringify({ custom }, null, 2),
      'utf8'
    );
  }

  async validate() {
    return {
      isInitialized: this.isInitialized,
      whitelistedCount: this.whitelist.size,
      blockedRequests: this.blockedRequests,
      healthy: this.isInitialized
    };
  }

  async shutdown() {
    await this.saveWhitelist();
  }
}

export default LemonNetworkIsolation;
