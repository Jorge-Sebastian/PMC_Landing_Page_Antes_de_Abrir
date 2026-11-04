import { splitHost } from '@/lib/link-analysis/analyze-url';
import { normaliseRiskDomain, type FamilyRiskEvent } from './risk-event';

export type FamilyMatchKind = 'same-domain' | 'similar-domain';
export type FamilyRiskMatch = {
  eventId: string;
  memberId: string;
  memberNickname: string;
  registrableDomain: string;
  observedAt: string;
  kind: FamilyMatchKind;
  label: string;
};
/** Only clearly identifiable suffix/prefix context; no fuzzy search by arbitrary keywords. */
const CONTEXT=new Set(['acceso','actualiza','alerta','cuenta','login','pago','promo','seguro','soporte','update','verifica','verificacion','verify']);
const REPLACE: Record<string,string>={'0':'o','3':'e','4':'a','5':'s','7':'t'};
function roots(core: string): string[] {
  const options=new Set([core]);
  const parts=core.split('-');
  if (parts.length===2 && CONTEXT.has(parts[1])) options.add(parts[0]);
  if (parts.length===2 && CONTEXT.has(parts[0])) options.add(parts[1]);
  return [...options].filter(v=>v.length>=6 && v.length<=60);
}
function variants(token:string):Set<string>{
  const mapped=[...token].map(c=>REPLACE[c]??c).join('').replace(/rn/g,'m').replace(/vv/g,'w');
  let forms=new Set([mapped]);
  if((mapped.match(/1/g)||[]).length>3)return forms;
  for(const c of mapped){
    if(c!=='1')continue;
    const next=new Set<string>();
    for(const form of forms){next.add(form.replace('1','l'));next.add(form.replace('1','i'));}
    forms=next;
  }
  return forms;
}
function oneEdit(a:string,b:string):boolean{
  if(Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,n=0;
  while(i<a.length && j<b.length){
    if(a[i]===b[j]){i++;j++;continue;}
    if(++n>1)return false;
    if(a.length>=b.length)i++;
    if(a.length<=b.length)j++;
  }
  return n+(a.length-i)+(b.length-j)<=1;
}
/**
 * Domain comparison is ONLY supporting context for a verdict obtained elsewhere.
 * It MUST NOT classify a URL as red on its own.
 */
export function compareFamilyRiskDomains(left:string,right:string):FamilyMatchKind|null{
  const a=normaliseRiskDomain(left),b=normaliseRiskDomain(right);
  if(!a||!b)return null;
  if(a===b)return 'same-domain';
  for(const x of roots(splitHost(a).core)){
    for(const y of roots(splitHost(b).core)){
      const vx=variants(x),vy=variants(y);
      if([...vx].some(v=>vy.has(v)))return 'similar-domain';
      if(x.length>=8 && y.length>=8 && x.slice(0,3)===y.slice(0,3) &&
        x.slice(-2)===y.slice(-2) && oneEdit(x,y))return 'similar-domain';
    }
  }
  return null;
}
/** Only a caller authorized to see the room may supply prior events here. */
export function relatedFamilyRisks(domain:string, history:readonly FamilyRiskEvent[], currentMemberId?:string):FamilyRiskMatch[]{
  const d=normaliseRiskDomain(domain);
  if(!d)return [];
  return history.flatMap(event=>{
    if(event.level!=='red' || (currentMemberId && event.memberId===currentMemberId))return [];
    const kind=compareFamilyRiskDomains(d,event.registrableDomain);
    if(!kind)return [];
    return [{
      eventId:event.id,memberId:event.memberId,memberNickname:event.memberNickname,
      registrableDomain:event.registrableDomain,observedAt:event.observedAt,kind,
      label:kind==='same-domain'
        ? 'Este dominio ya fue reportado como peligroso en tu familia.'
        : 'Este dominio se parece a uno reportado como peligroso en tu familia. No es una coincidencia confirmada.',
    }];
  }).sort((a,b)=>((a.kind===b.kind)?0:(a.kind==='same-domain'?-1:1)) || b.observedAt.localeCompare(a.observedAt));
}
