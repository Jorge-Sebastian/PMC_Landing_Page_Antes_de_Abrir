"""SmartGuard quality core: auditable calculations; simulation is always distinct from production.
No personal messages, URLs, tokens or hosts are imported by this module.
"""
from __future__ import annotations
import csv, hashlib, json, math, re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ZONE = ZoneInfo('America/Bogota')
START = datetime(2026, 10, 29, 16, 0, tzinfo=ZONE)
END = datetime(2026, 11, 5, 16, 0, tzinfo=ZONE)
COLUMNS = ('tipo_datos','event_id','timestamp_bogota','installation_id','android_version','riesgo_esperado', 'servicio_ok','analisis_ok','alerta_ok_solo_si_rojo_naranja','firebase_ack','analisis_ms','alerta_ms')
METRICS = (
 ('service_health','Protección saludable observada','%','>=',.99,.20),
 ('analysis_success','Análisis correctos','%','>=',.99,.20),
 ('alert_success','Alertas publicadas','%','>=',.99,.20),
 ('ack_success','Envíos confirmados','%','>=',.99,.20),
 ('analysis_p95','Análisis P95','ms','<=',500,.10),
 ('alert_p95','Alertas P95','ms','<=',1000,.10),
)
RUBRIC=(
 ('UptimeRobot HTTP(s)', 'Disponibilidad >=99% / últimos 7 días', 'Página pública y porcentaje real de UptimeRobot'),
 ('PageSpeed móvil', 'Performance >=70 y Accessibility >=80','Enlace a ambos resultados del informe móvil'),
 ('Flujo central', 'Registro + ingreso + flujo E2E + aislamiento de dos cuentas en móvil y PC','Acta de 3-6 pasos, ambas cuentas, evidencias'),
 ('README', 'Completo y sin secretos','Repositorio con documentos y cuenta de prueba por canal seguro'),
)

class ValidationError(ValueError): pass

def ratio(num: int, den: int) -> float | None:
    return num / den if den > 0 else None

def nearest_rank_p95(values: list[int]) -> int | None:
    if not values: return None
    values=sorted(values)
    return values[math.ceil(.95*len(values))-1]

def strict_int(value: Any, field: str, optional=False) -> int | None:
    if value in ('',None):
        if optional: return None
        raise ValidationError(f'{field}: valor vacío')
    if str(value) not in ('0','1') and field.endswith('_ok') or False:
        raise ValidationError(f'{field}: debe ser 0/1')
    try: n=int(value)
    except (TypeError,ValueError): raise ValidationError(f'{field}: no es entero')
    if n<0: raise ValidationError(f'{field}: negativo')
    return n

def load_simulated_csv(path: str|Path) -> tuple[list[dict[str,Any]],dict[str,Any]]:
    p=Path(path);raw=p.read_bytes();data=[];seen=set()
    with p.open(encoding='utf-8-sig',newline='') as f:
        if f.readline().strip() != 'sep=;': raise ValidationError('CSV original debe empezar sep=;')
        reader=csv.DictReader(f,delimiter=';')
        if tuple(reader.fieldnames or ())!=COLUMNS: raise ValidationError('Encabezados de CSV distintos del archivo original')
        for row in reader:
            if row['tipo_datos'] != 'SIMULADO_NO_EVIDENCIA':continue
            eid=row['event_id'];uid=row['installation_id']
            if not re.fullmatch(r'SIM-\d{4}',eid) or eid in seen:raise ValidationError('ID sintético inválido o duplicado: '+eid)
            seen.add(eid)
            if not re.fullmatch(r'SG-SIM-0[1-6]',uid):raise ValidationError('Dispositivo sintético desconocido '+uid)
            dt=datetime.fromisoformat(row['timestamp_bogota']).replace(tzinfo=ZONE)
            if not START<=dt<=END:raise ValidationError('Fecha fuera del intervalo: '+str(dt))
            risk=row['riesgo_esperado']
            if risk not in ('verde','naranja','rojo'):raise ValidationError('Color desconocido: '+risk)
            service=strict_int(row['servicio_ok'],'servicio_ok')
            analysis=strict_int(row['analisis_ok'],'analisis_ok')
            alert=strict_int(row['alerta_ok_solo_si_rojo_naranja'],'alerta_ok',optional=True)
            ack=strict_int(row['firebase_ack'],'firebase_ack')
            for n,field in [(service,'servicio_ok'),(analysis,'analisis_ok'),(alert,'alerta_ok'),(ack,'firebase_ack')]:
                if n is not None and n not in (0,1):raise ValidationError(field+' no es booleano')
            if risk=='verde' and alert is not None:raise ValidationError('Alerta verde no se debe usar como requisito')
            if risk!='verde' and alert is None:raise ValidationError('Falta resultado de alerta para riesgo naranja/rojo')
            analysis_ms=strict_int(row['analisis_ms'],'analisis_ms',optional=True)
            alert_ms=strict_int(row['alerta_ms'],'alerta_ms',optional=True)
            if analysis_ms is not None and analysis_ms>600000:raise ValidationError('Latencia fuera de rango')
            if alert_ms is not None and alert_ms>600000:raise ValidationError('Latencia de alerta fuera de rango')
            data.append(dict(id=eid,date=dt,uid=uid,android=row['android_version'],risk=risk,
                service=service,analysis=analysis,alert=alert,ack=ack,analysis_ms=analysis_ms,alert_ms=alert_ms,
                provenance='SIMULADO_NO_EVIDENCIA'))
    if len(data)!=1198 or len({r['uid'] for r in data})!=6:raise ValidationError(f'Esperados exactamente 1198 registros en 6 dispositivos; obtenidos {len(data)} / {len(set(r["uid"] for r in data))}')
    return data,{'source_file':str(p.name),'source_sha256':hashlib.sha256(raw).hexdigest(),'provenance':'SIMULADO_NO_EVIDENCIA','source_rows':len(data),'rejected_rows':0}

def aggregate(rows: list[dict[str,Any]]) -> dict[str,Any]:
    a=dict(rows=len(rows),health_ok=sum(r['service'] for r in rows),analysis_ok=sum(r['analysis'] for r in rows),
        alert_requested=sum(r['alert'] is not None for r in rows),alert_posted=sum(r['alert']==1 for r in rows),
        events_generated=len(rows),events_acked=sum(r['ack'] for r in rows),
        analyses_ms=[r['analysis_ms'] for r in rows if r['analysis_ms'] is not None],
        alerts_ms=[r['alert_ms'] for r in rows if r['alert_ms'] is not None])
    scores={'service_health':ratio(a['health_ok'],a['rows']),
            'analysis_success':ratio(a['analysis_ok'],a['rows']),
            'alert_success':ratio(a['alert_posted'],a['alert_requested']),
            'ack_success':ratio(a['events_acked'],a['events_generated']),
            'analysis_p95':nearest_rank_p95(a['analyses_ms']),
            'alert_p95':nearest_rank_p95(a['alerts_ms'])}
    outcomes=[];weighted=0.;total_weight=0.
    for id,label,unit,op,threshold,weight in METRICS:
        actual=scores[id];status='SIN DATOS' if actual is None else ('CUMPLE' if ((actual>=threshold) if op=='>=' else (actual<=threshold)) else 'NO CUMPLE')
        if actual is not None:
            # Percent successes use observed rate; latency scores reach 1 only when meeting their threshold.
            normalized = actual if op=='>=' else (min(1.,threshold/actual) if actual>0 else 1.)
            weighted += normalized*weight;total_weight+=weight
        outcomes.append(dict(id=id,label=label,actual=actual,unit=unit,op=op,threshold=threshold,weight=weight,status=status))
    index=round(100*weighted/total_weight,3) if total_weight else None
    return {**{k:v for k,v in a.items() if not k.endswith('_ms')},'scores':scores,'metrics':outcomes,
      'internal_index':index,'targets_met':sum(x['status']=='CUMPLE' for x in outcomes),
      'targets_available':sum(x['status']!='SIN DATOS' for x in outcomes)}

def make_report(rows: list[dict[str,Any]],source:dict[str,Any]) -> dict[str,Any]:
    by_uid=defaultdict(list);by_date=defaultdict(list)
    for r in rows:by_uid[r['uid']].append(r);by_date[r['date'].strftime('%Y-%m-%d')].append(r)
    return dict(schema_version=1,provenance='SIMULADO_NO_EVIDENCIA',start=START.isoformat(),end=END.isoformat(),
        source=source,global_summary=aggregate(rows),
        devices={k:aggregate(v) for k,v in sorted(by_uid.items())},
        daily={k:aggregate(v) for k,v in sorted(by_date.items())},
        rubric=[{'condition':x[0],'threshold':x[1],'evidence_required':x[2],'status':'PENDIENTE DE EVIDENCIA REAL'} for x in RUBRIC],
        official_verified_count=0)

def scrub_for_json(report: dict[str,Any]) -> dict[str,Any]:
    return json.loads(json.dumps(report,ensure_ascii=False,default=str))
