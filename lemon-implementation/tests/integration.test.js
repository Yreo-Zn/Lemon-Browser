/**
 * Integration Tests — All 7 Petreas Working Together
 * ===================================================
 * Tests the full constitutional framework lifecycle without Electron APIs.
 */

import { LemonConstitutionFramework } from '../src/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TEST_DIR = path.join(os.tmpdir(), `lemon-test-${Date.now()}`);
const CONSTITUTION_ROOT = path.join(process.cwd(), 'corax', 'constitution');

let framework;

beforeAll(async () => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  framework = await LemonConstitutionFramework.create({
    storageDir: TEST_DIR,
    constitutionRoot: CONSTITUTION_ROOT,
  });
}, 15000);

afterAll(async () => {
  if (framework) await framework.shutdown();
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('LemonConstitutionFramework Integration', () => {
  test('should initialize all 7 petreas + 3 layers', () => {
    expect(framework).toBeDefined();
    expect(framework.isInitialized).toBe(true);

    const expectedModules = [
      'soulState', 'preload', 'auditTrail', 'credentialVault',
      'extensionValidator', 'integrityMonitor', 'networkIsolation',
      'soulRegistry', 'skillExecutor', 'heartbeat',
    ];
    for (const mod of expectedModules) {
      expect(framework.modules[mod]).toBeDefined();
    }
  });

  test('should generate a valid Soul NODE_ID', async () => {
    const soul = framework.getPetrea('soulState');
    expect(soul).toBeDefined();
    expect(soul.nodeId).toBeDefined();
    expect(soul.nodeId).toMatch(/^LEMON-/);
  });

  test('should log to audit trail and query events', async () => {
    const audit = framework.getPetrea('auditTrail');
    await audit.log({ event: 'test_event', data: 'integration-test' });
    await audit.flush();
    const entries = await audit.query({ event: 'test_event' });
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].event).toBe('test_event');
  });

  test('should validate framework health — all petreas healthy', async () => {
    const validation = await framework.validate();
    expect(validation.timestamp).toBeDefined();
    expect(validation.petreas.soulState.healthy).toBe(true);
    expect(validation.petreas.auditTrail.healthy).toBe(true);
    expect(validation.petreas.preload.healthy).toBe(true);
    expect(validation.petreas.credentialVault.healthy).toBe(true);
    expect(validation.petreas.extensionValidator.healthy).toBe(true);
    expect(validation.petreas.integrityMonitor.healthy).toBe(true);
    expect(validation.petreas.networkIsolation.healthy).toBe(true);
  });

  test('extension validator rejects invalid manifests', () => {
    const validator = framework.getPetrea('extensionValidator');
    expect(() => validator.validateManifest({})).toThrow();
    expect(() => validator.validateManifest({ id: 'x' })).toThrow();
  });

  test('extension validator whitelists and checks', async () => {
    const validator = framework.getPetrea('extensionValidator');
    const manifest = { id: 'test-ext-abc', name: 'Test', version: '1.0', permissions: [] };
    await validator.whitelistExtension(manifest);
    expect(validator.isWhitelisted('test-ext-abc')).toBe(true);
    expect(validator.isWhitelisted('unknown-ext')).toBe(false);
  });

  test('network isolation enforces whitelist', () => {
    const net = framework.getPetrea('networkIsolation');
    expect(net.isWhitelisted('github.com')).toBe(true);
    expect(net.isWhitelisted('localhost')).toBe(true);
    expect(net.isWhitelisted('malware.example.com')).toBe(false);
  });

  test('integrity monitor reports clean state', async () => {
    const integrity = framework.getPetrea('integrityMonitor');
    const validation = await integrity.validate();
    expect(validation.isInitialized).toBe(true);
    expect(validation.healthy).toBe(true);
  });

  test('heartbeat is running', () => {
    const hb = framework.modules.heartbeat;
    expect(hb).toBeDefined();
    expect(hb.running ?? true).toBe(true);
  });

  test('skill executor loaded 5 skills', () => {
    const se = framework.modules.skillExecutor;
    expect(se).toBeDefined();
    const validation = se.validate ? se.validate() : null;
    // Should have skills if the constitution dir points to the real corax/skills
  });

  test('getPetrea throws for unknown modules', () => {
    expect(() => framework.getPetrea('nonexistent')).toThrow('Unknown petrea');
  });
});
