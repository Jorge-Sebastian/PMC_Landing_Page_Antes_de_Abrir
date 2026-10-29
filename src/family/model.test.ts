import { describe, expect, it } from 'vitest';
import { invitationLink, parseFamilyDomain, safeDomainForFamily } from './model';

describe('SmartGuard Family privacy rules', () => {
  it('shares a hostname, never a full link or its path', () => {
    expect(safeDomainForFamily('https://ejemplo.com/factura?ref=2')).toBe('ejemplo.com');
  });
  it('excludes one-time tokens, login codes and personal data', () => {
    expect(safeDomainForFamily('https://cuenta.ejemplo.com/reset?token=secreto')).toBeNull();
    expect(safeDomainForFamily('https://cuenta.ejemplo.com/?email=persona%40ejemplo.com')).toBeNull();
    expect(safeDomainForFamily('http://127.0.0.1/login')).toBeNull();
  });
  it('disallows forged hostnames in family alerts', () => {
    expect(parseFamilyDomain('ejemplo.com/path')).toBeNull();
    expect(parseFamilyDomain('ejemplo.com?token=privado')).toBeNull();
    expect(parseFamilyDomain('ejemplo.com')).toBe('ejemplo.com');
  });
  it('builds an invitation without sharing any raw user message', () => {
    const link = invitationLink('https://smartguard.test', 'abc123');
    expect(link).toBe('https://smartguard.test/familia?invitacion=abc123');
  });
});
