import { describe, expect, it } from 'vitest';
import { MAX_FAMILY_ROOM_MEMBERS, roomCapacity, createConsentedFamilyRiskEvent } from './risk-event';
import { compareFamilyRiskDomains, relatedFamilyRisks } from './risk-matching';

const risk = (change: Record<string,unknown>={}) => createConsentedFamilyRiskEvent({
  url:'https://netf1ix-acceso.com/entrada', memberId:'member000001', memberNickname:'Tía Andrea',
  observedAt:'2026-11-04T13:00:00Z', source:'manual', level:'red',
  familySharingAllowed:true, ...change,
});

describe('12-person room: one host + 11 invitations',()=>{
  it('accepts person 12 but refuses person 13',()=>{
    const members=Array.from({length:MAX_FAMILY_ROOM_MEMBERS-1},(_,i)=>'uid'+i);
    expect(roomCapacity(members,'uid11').allowed).toBe(true);
    expect(roomCapacity([...members,'uid11'],'uid12').allowed).toBe(false);
  });
  it('allows an existing UID to re-enter and does not double-count duplicates',()=>{
    const ids=Array.from({length:12},(_,i)=>'uid'+i);
    expect(roomCapacity(ids,'uid2')).toEqual({allowed:true,alreadyMember:true,remainingSeats:0});
    expect(roomCapacity(['host','guest','guest'],'new').remainingSeats).toBe(10);
  });
});

describe('No secrets or unconsented observations in Family',()=>{
  it('stores a domain only, never query, path, full URL or message',()=>{
    const event=risk({url:'https://alerta.netf1ix-acceso.com/entrada?campaign=abc'});
    expect(event?.registrableDomain).toBe('netf1ix-acceso.com');
    expect(JSON.stringify(event)).not.toContain('campaign=abc');
    expect(JSON.stringify(event)).not.toContain('/entrada');
  });
  it('refuses orange, green and non-consented results',()=>{
    expect(risk({level:'orange'})).toBeNull();
    expect(risk({level:'green'})).toBeNull();
    expect(risk({familySharingAllowed:false})).toBeNull();
  });
  it('does not share login links or private IPs',()=>{
    expect(risk({url:'https://netf1ix-acceso.com/?token=TOPSECRET'})).toBeNull();
    expect(risk({url:'https://netf1ix-acceso.com/verify/ABCDEF123456'})).toBeNull();
    expect(risk({url:'http://192.168.1.5/login'})).toBeNull();
  });
  it('labels manual reports separately from Android notification results',()=>{
    expect(risk({source:'manual'})?.source).toBe('manual');
    expect(risk({source:'notification'})?.source).toBe('notification');
  });
});

describe('Same domain vs possible typo (no false social narrative)',()=>{
  it('compares by registrable domain including subdomains',()=>{
    expect(compareFamilyRiskDomains('seguro.netf1ix-acceso.com','netf1ix-acceso.com')).toBe('same-domain');
  });
  it('detects common confusables within related brands',()=>{
    expect(compareFamilyRiskDomains('netf1ix-acceso.com','netflix.com')).toBe('similar-domain');
    expect(compareFamilyRiskDomains('g00gle-login.com','google.com')).toBe('similar-domain');
    expect(compareFamilyRiskDomains('paypa1.com','paypal.com')).toBe('similar-domain');
  });
  it('does not equate Netflix, WhatsApp or unrelated brands',()=>{
    expect(compareFamilyRiskDomains('netflix.com','whatsap1.com')).toBeNull();
    expect(compareFamilyRiskDomains('netflix.com','bancolombia.com')).toBeNull();
  });
  it('does not group all websites hosted on vercel.app',()=>{
    expect(compareFamilyRiskDomains('family-a.vercel.app','family-b.vercel.app')).toBeNull();
  });
  it('does not mistake a malicious subdomain for the official domain',()=>{
    expect(compareFamilyRiskDomains('netflix.com.evil.test','netflix.com')).toBeNull();
  });
  it('never invents a match for unrelated domains or the same member',()=>{
    const history=[{...risk()!,id:'event1'}];
    expect(relatedFamilyRisks('desconocido-falso.com',history,'member000002')).toEqual([]);
    expect(relatedFamilyRisks('netf1ix-acceso.com',history,'member000001')).toEqual([]);
  });
  it('attributes a similar but not identical match cautiously to Tía Andrea',()=>{
    const history=[{...risk()!,id:'event2'}];
    const matches=relatedFamilyRisks('netflix.com',history,'member000002');
    expect(matches).toHaveLength(1);
    expect(matches[0].memberNickname).toBe('Tía Andrea');
    expect(matches[0].kind).toBe('similar-domain');
    expect(matches[0].label).toContain('No es una coincidencia confirmada');
  });
});
