#!/usr/bin/env python3
"""Produce traceable simulation workbook, sidecar JSON and narrative report.
Usage: python scripts/quality/generate_report.py --input /path/to/original.csv --out-dir reports/quality/local
Excel is not evidence of APK availability: statuses for official services remain pending.
"""
import argparse, json, sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from openpyxl import Workbook, load_workbook
from openpyxl.chart import LineChart, Reference
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from core import START, END, METRICS, RUBRIC, load_simulated_csv, make_report

NAVY='10283B'; NAVY2='193B50'; TEAL='0F827A'; LIGHT='E9F7F4'; GRAY='64748B'; WHITE='FFFFFF'; AMBER='FFF1D6'; RED='FBE8E8'; GREEN='E7F6E9'; PURPLE='F0EDFA'; BLUE='1B5AA7'
FONTS='Aptos'

def theme(ws,title,subtitle,cols):
    ws.sheet_view.showGridLines=False
    last=get_column_letter(cols)
    ws.merge_cells(f'A1:{last}1');a=ws['A1'];a.value=title;a.fill=PatternFill('solid',fgColor=NAVY);a.font=Font(name=FONTS,size=19,bold=True,color=WHITE);a.alignment=Alignment(vertical='center');ws.row_dimensions[1].height=38
    ws.merge_cells(f'A2:{last}2');a=ws['A2'];a.value=subtitle;a.fill=PatternFill('solid',fgColor=LIGHT);a.font=Font(name=FONTS,size=10,color=GRAY);a.alignment=Alignment(vertical='center');ws.row_dimensions[2].height=27
    for col in range(1,cols+1):ws.column_dimensions[get_column_letter(col)].width=18
    ws.sheet_properties.pageSetUpPr.fitToPage=True

def headers(ws,row,titles):
    for i,t in enumerate(titles,1):
        c=ws.cell(row,i,t);c.fill=PatternFill('solid',fgColor=NAVY2);c.font=Font(name=FONTS,bold=True,color=WHITE,size=10);c.alignment=Alignment(wrap_text=True,vertical='center')
    ws.row_dimensions[row].height=37

def txt(ws,row,col,v,fill=None,bold=False,linked=False,editable=False,fmt=None):
    c=ws.cell(row,col,v);c.font=Font(name=FONTS,size=10,bold=bold,color=BLUE if editable else ('00834D' if linked else NAVY))
    c.alignment=Alignment(vertical='center',wrap_text=True)
    if fill:c.fill=PatternFill('solid',fgColor=fill)
    if fmt:c.number_format=fmt
    return c

def status_colors(ws,cell_range):
    ws.conditional_formatting.add(cell_range, FormulaRule(formula=[f'ISNUMBER(SEARCH("CUMPLE",{cell_range.split(":")[0]}))'],fill=PatternFill('solid',fgColor=GREEN)))
    # Text status is visibly explicit even without conditional styles.

def dv_status(ws,ref):
    d=DataValidation(type='list',formula1='"CUMPLE,NO CUMPLE,PENDIENTE"');ws.add_data_validation(d);d.add(ref)

def create(rows,rep,outdir):
    outdir=Path(outdir);outdir.mkdir(parents=True,exist_ok=True)
    wb=Workbook();wb.remove(wb.active)
    names=['00_VEREDICTO','01_REGISTROS','02_SUMATORIAS','03_COMPARATIVA','04_RUBRICA_OFICIAL','05_EQUIVALENCIAS_ANDROID','06_PRUEBAS_E2E','07_ACCESIBILIDAD','08_HISTORICO_7D','09_METODOLOGIA','10_TRAZABILIDAD','11_CATALOGO_30','12_AUX_LATENCIAS']
    sheets={n:wb.create_sheet(n) for n in names}
    reg=sheets['01_REGISTROS'];theme(reg,'SMARTGUARD | 1.198 OBSERVACIONES SIMULADAS','SIMULADO_NO_EVIDENCIA · Fuente: CSV proporcionado · No representa registros Firebase ni Android reales',13)
    cols=['event_id','fecha Bogotá','installation_id','Android','riesgo','servicio OK','análisis OK','alerta OK','Firebase ACK','duración análisis (ms)','duración alerta (ms)','proveniencia','comentario']
    headers(reg,5,cols);reg.freeze_panes='E6'
    for col,width in {'A':18,'B':23,'C':19,'D':22,'E':13,'F':15,'G':16,'H':16,'I':17,'J':21,'K':21,'L':24,'M':41}.items():reg.column_dimensions[col].width=width
    for i,r in enumerate(rows,6):
        vals=[r['id'],r['date'].replace(tzinfo=None),r['uid'],r['android'],r['risk'],r['service'],r['analysis'],r['alert'],r['ack'],r['analysis_ms'],r['alert_ms'],r['provenance'],'Muestra sintética; no prueba real']
        for col,v in enumerate(vals,1):txt(reg,i,col,v,fill=WHITE if i%2 else 'F3F7FA',linked=True,fmt='dd/mm/yyyy hh:mm:ss' if col==2 else None)
    end=5+len(rows)
    reg.auto_filter.ref=f'A5:M{end}'
    txt(reg,end+2,1,'REGISTROS VÁLIDOS');txt(reg,end+2,2,f'=COUNTA(A6:A{end})',bold=True)
    txt(reg,end+3,1,'PROCEDENCIA');txt(reg,end+3,2,'SIMULADO_NO_EVIDENCIA',fill=AMBER,bold=True)
    # Helpers hold referenced raw observations. Each device has a direct numeric reference per eligible sample.
    aux=sheets['12_AUX_LATENCIAS'];theme(aux,'AUXILIAR · LATENCIAS DE ORIGEN','Referencias directas al registro original; nunca promediar percentiles por dispositivo',12)
    devs=sorted(rep['devices']);sets={uid:[] for uid in devs}
    for index,r in enumerate(rows,6):sets[r['uid']].append(index)
    for j,uid in enumerate(devs):
        cols2=[2*j+1,2*j+2];txt(aux,4,cols2[0],uid+' análisis ms',fill=LIGHT);txt(aux,4,cols2[1],uid+' alerta ms',fill=LIGHT)
        for i,rn in enumerate(sets[uid],5):
            txt(aux,i,cols2[0],f'=IF(ISNUMBER(\'01_REGISTROS\'!J{rn}),\'01_REGISTROS\'!J{rn},"")')
            txt(aux,i,cols2[1],f'=IF(ISNUMBER(\'01_REGISTROS\'!K{rn}),\'01_REGISTROS\'!K{rn},"")')
    aux.sheet_state='hidden'
    summ=sheets['02_SUMATORIAS'];theme(summ,'SUMATORIAS · 6 DISPOSITIVOS','Los porcentajes se calculan dividiendo SUMA de éxitos entre SUMA de intentos; los P95 se obtienen de muestras originales',17)
    sumcols=['Instalación','Obs.','Servicio OK','Análisis OK','Alertas requeridas','Alertas OK','Eventos generados','ACK Firebase','Salud %','Análisis %','Alertas %','Firebase %','P95 análisis ms','P95 alerta ms','Metas / 6','Índice /100','Android']
    headers(summ,6,sumcols);summ.freeze_panes='B7'
    for col in 'ABCDEFGHIJKL':summ.column_dimensions[col].width=17
    summ.column_dimensions['A'].width=21;summ.column_dimensions['Q'].width=25
    for j,uid in enumerate(devs):
        row=7+j;txt(summ,row,1,uid,linked=True)
        for c,letter,expression in [
          (2,'B',f'=COUNTIF(\'01_REGISTROS\'!$C$6:$C${end},A{row})'),
          (3,'C',f'=SUMIF(\'01_REGISTROS\'!$C$6:$C${end},A{row},\'01_REGISTROS\'!$F$6:$F${end})'),
          (4,'D',f'=SUMIF(\'01_REGISTROS\'!$C$6:$C${end},A{row},\'01_REGISTROS\'!$G$6:$G${end})'),
          (5,'E',f'=COUNTIFS(\'01_REGISTROS\'!$C$6:$C${end},A{row},\'01_REGISTROS\'!$E$6:$E${end},"naranja")+COUNTIFS(\'01_REGISTROS\'!$C$6:$C${end},A{row},\'01_REGISTROS\'!$E$6:$E${end},"rojo")'),
          (6,'F',f'=SUMIF(\'01_REGISTROS\'!$C$6:$C${end},A{row},\'01_REGISTROS\'!$H$6:$H${end})'),
          (7,'G',f'=B{row}'),
          (8,'H',f'=SUMIF(\'01_REGISTROS\'!$C$6:$C${end},A{row},\'01_REGISTROS\'!$I$6:$I${end})')]:txt(summ,row,c,expression)
        for c,num,den in [(9,'C','B'),(10,'D','B'),(11,'F','E'),(12,'H','G')]:txt(summ,row,c,f'=IFERROR({num}{row}/{den}{row},"")',fmt='0.00%')
        a,b=2*j+1,2*j+2
        for c,n in [(13,a),(14,b)]:
            x=get_column_letter(n)
            txt(summ,row,c,f'=IFERROR(SMALL(\'12_AUX_LATENCIAS\'!{x}5:{x}220,ROUNDUP(COUNT(\'12_AUX_LATENCIAS\'!{x}5:{x}220)*0.95,0)),"")',fmt='0" ms"')
        txt(summ,row,15,f'=COUNTIF(I{row}:L{row},">=0.99")+IF(M{row}<=\'09_METODOLOGIA\'!$D$14,1,0)+IF(N{row}<=\'09_METODOLOGIA\'!$D$15,1,0)')
        txt(summ,row,16,f'=IF(COUNT(I{row}:N{row})<6,"",100*(I{row}*0.20+J{row}*0.20+K{row}*0.20+L{row}*0.20+MIN(1,\'09_METODOLOGIA\'!$D$14/M{row})*0.10+MIN(1,\'09_METODOLOGIA\'!$D$15/N{row})*0.10))',fmt='0.00')
        txt(summ,row,17,next((x['android'] for x in rows if x['uid']==uid),''),linked=True)
    total=14;txt(summ,total,1,'TOTAL PONDERADO',fill=LIGHT,bold=True)
    for c in range(2,9):
        letter=get_column_letter(c);txt(summ,total,c,f'=SUM({letter}7:{letter}12)',fill=LIGHT,bold=True)
    for c,num,den in [(9,'C','B'),(10,'D','B'),(11,'F','E'),(12,'H','G')]:txt(summ,total,c,f'=IFERROR({num}{total}/{den}{total},"")',fill=LIGHT,fmt='0.00%',bold=True)
    for c,sourcecol in [(13,'J'),(14,'K')]:txt(summ,total,c,f'=IFERROR(SMALL(\'01_REGISTROS\'!{sourcecol}6:{sourcecol}{end},ROUNDUP(COUNT(\'01_REGISTROS\'!{sourcecol}6:{sourcecol}{end})*0.95,0)),"")',fill=LIGHT,bold=True)
    txt(summ,total,15,'=COUNTIF(I14:L14,">=0.99")+IF(M14<=\'09_METODOLOGIA\'!$D$14,1,0)+IF(N14<=\'09_METODOLOGIA\'!$D$15,1,0)',bold=True)
    txt(summ,total,16,'=IF(COUNT(I14:N14)<6,"",100*(I14*0.20+J14*0.20+K14*0.20+L14*0.20+MIN(1,\'09_METODOLOGIA\'!$D$14/M14)*0.10+MIN(1,\'09_METODOLOGIA\'!$D$15/N14)*0.10))',bold=True,fmt='0.00')
    summ.column_dimensions['O'].width=15;summ.column_dimensions['P'].width=16
    comp=sheets['03_COMPARATIVA'];theme(comp,'COMPARATIVA ENTRE DISPOSITIVOS','Cada instalación puede incumplir una meta aunque el global agregado cumpla',10)
    headers(comp,6,['Dispositivo','Salud observada','Análisis','Alertas','Envíos ACK','Análisis P95','Alerta P95','Metas','Índice','Estado'])
    for j,uid in enumerate(devs):
        rr=7+j;src=7+j
        for cc,src_col in enumerate(['A','I','J','K','L','M','N','O','P'],1):txt(comp,rr,cc,f"='02_SUMATORIAS'!{src_col}{src}",fmt='0.00%' if cc in (2,3,4,5) else ('0.00' if cc==9 else None))
        txt(comp,rr,10,f'=IF(H{rr}=6,"CUMPLE","NO CUMPLE")')
    for j in range(1,11):comp.column_dimensions[get_column_letter(j)].width=21
    eq=sheets['05_EQUIVALENCIAS_ANDROID'];theme(eq,'EQUIVALENCIAS TÉCNICAS · ANDROID VS WEB','Las equivalencias conceptuales NO generan una puntuación UptimeRobot o PageSpeed',5)
    headers(eq,5,['Criterio','Herramienta exigida','Medición nativa','Se parece en','No sustituye'])
    eqrows=[('Disponibilidad','UptimeRobot HTTP(s), 7 días','Salud operativa y cobertura de reportes','Confiabilidad del servicio','No prueba disponibilidad HTTP; ausencia de eventos no significa uptime'),('Rendimiento','PageSpeed Performance ≥70','Latencias análisis/alerta P50/P95 + inicio APK','Experiencia de rapidez','No existe fórmula válida ms→PageSpeed'),('Accesibilidad','PageSpeed Accessibility ≥80','Accessibility Scanner + TalkBack + checklist','Acceso e interacción','No es puntuación Lighthouse'),('Flujo central','Registro y login web; móvil y PC','Pruebas E2E en web + dispositivo Android','Tareas del usuario','No se prueba automáticamente con telemetría'),('README','README seguro','Revisión automatizada + revisión manual','Documentación','No sustituye verificación humana')]
    for ri,row in enumerate(eqrows,6):
        for ci,v in enumerate(row,1):txt(eq,ri,ci,v,fill=WHITE if ri%2 else 'F3F7FA')
    for col in 'ABCDE':eq.column_dimensions[col].width=32
    eq.column_dimensions['E'].width=58
    rub=sheets['04_RUBRICA_OFICIAL'];theme(rub,'RÚBRICA OFICIAL · 4 CONDICIONES','Solo evidencia real; datos simulados Android no acreditan PageSpeed, UptimeRobot ni registros entre cuentas',8)
    headers(rub,6,['Subcondición','Umbral literal','Resultado real (editable)','URL/acta de evidencia','Fecha verificada','Estado automático','Equivalente Android','Observación'])
    rubrows=[
        ('UptimeRobot / Disponibilidad',.99,None,'Salud observada; no uptime HTTP','UptimeRobot monitor cada 5 min y status pública'),
        ('PageSpeed / Performance',70,None,'P95 nativo; no equivale a 70 puntos','PageSpeed móvil: URL informe'),
        ('PageSpeed / Accessibility',80,None,'Auditoría TalkBack; no equivale a 80 puntos','PageSpeed móvil: URL informe'),
        ('Flujo E2E de cuentas','SI',None,'Prueba Android + web, dos cuentas','Debe pasar en móvil y PC, incluyendo aislamiento'),
        ('README completo','SI',None,'README documentado','Revisar contenidos + ningún secreto')]
    for ri,(label,threshold,unused,alternate,note) in enumerate(rubrows,7):
        txt(rub,ri,1,label);txt(rub,ri,2,threshold,fmt='0%' if ri==7 else None)
        for c in (3,4,5):txt(rub,ri,c,None,fill='EDF2FD',editable=True)
        cond = (f'AND(ISNUMBER(C{ri}),C{ri}>=B{ri},LEN(D{ri})>8)' if ri in (7,8,9) else f'AND(C{ri}="SI",LEN(D{ri})>8)')
        has=f'OR(LEN(C{ri})>0,LEN(D{ri})>0)'
        txt(rub,ri,6,f'=IF({cond},"CUMPLE",IF({has},"NO CUMPLE","PENDIENTE"))')
        txt(rub,ri,7,alternate);txt(rub,ri,8,note)
    txt(rub,14,1,'CONDICIONES OFICIALES VERIFICADAS',fill=LIGHT,bold=True)
    txt(rub,14,3,'=COUNTIF(F7,"CUMPLE")+IF(AND(F8="CUMPLE",F9="CUMPLE"),1,0)+COUNTIF(F10:F11,"CUMPLE")',fill=LIGHT,bold=True)
    txt(rub,15,1,'VEREDICTO OFICIAL',fill=LIGHT,bold=True)
    txt(rub,15,3,'=IF(C14=4,"4/4 VERIFICADOS",TEXT(C14,"0")&"/4 VERIFICADOS · RESTANTES PENDIENTES O NO CUMPLEN")',fill=LIGHT,bold=True)
    for col,width in {'A':34,'B':26,'C':20,'D':52,'E':22,'F':18,'G':37,'H':65}.items():rub.column_dimensions[col].width=width
    for c in ['B7','B8','B9','B10','B11']:rub[c].font=Font(name=FONTS,bold=True,color='5A4798')
    rub['C7'].number_format='0.00%'
    e2e=sheets['06_PRUEBAS_E2E'];theme(e2e,'PRUEBAS E2E · REGISTRO Y AISLAMIENTO','No marcar cumplido sin ejecución real, evidencia y dos identidades distintas',9)
    headers(e2e,6,['Plataforma','Cuenta','Paso','Acción','Resultado esperado','Resultado observado','Estado','Enlace/acta','Error bloqueante'])
    tasks=[('A','Crear cuenta','Usuario nuevo registrado'),('A','Iniciar sesión','Acceso y datos propios'),('A','Analizar un enlace de prueba','Clasificación sin bloqueo'),('A','Cerrar/abrir sesión','Persisten datos autorizados'),('B','Verificar aislamiento','B no ve datos de A')]
    for row,(platform,task) in enumerate((p,t) for p in ('Android','Computador') for t in tasks):
        ri=7+row;uid,step,expected=task
        for c,v in enumerate((platform,'Cuenta '+uid,str(row%5+1),step,expected),1):txt(e2e,ri,c,v)
        for c in (6,7,8,9):txt(e2e,ri,c,None,editable=True,fill='EDF2FD')
    dv_status(e2e,'G7:G16');txt(e2e,18,1,'PRUEBAS FUNCIONALES COMPLETAS')
    txt(e2e,18,4,'=IF(COUNTIF(G7:G16,"NO CUMPLE")>0,"NO CUMPLE",IF(AND(COUNTIF(G7:G16,"CUMPLE")=10,COUNTIF(H7:H16,"?*")=10),"CUMPLE","PENDIENTE"))')
    for c,w in {'A':18,'B':20,'C':12,'D':38,'E':46,'F':43,'G':20,'H':46,'I':19}.items():e2e.column_dimensions[c].width=w
    access=sheets['07_ACCESIBILIDAD'];theme(access,'ACCESIBILIDAD · AUDITORÍA ANDROID','Informe propio: etiquetas, contraste, navegación y TalkBack; no simula score PageSpeed',6)
    headers(access,6,['Chequeo','Qué verificar','Estado','Herramienta','Evidencia','Corrección'])
    checks=[('Contenido TalkBack','Lector pronuncia botones, alertas y estado','TalkBack'),('Contraste','Contraste de textos y controles','Accessibility Scanner'),('Etiquetas','Iconos tienen descripción accesible','Android Accessibility Scanner'),('Tamaño táctil','Objetivos táctiles suficientes','Accessibility Scanner'),('Navegación','Orden de foco y recorrido','TalkBack'),('Errores','Avisos comprensibles','Prueba manual'),('Escalado de texto','Textos con tamaño aumentado sin recortes','Android ajustes')]
    for row,check in enumerate(checks,7):
        txt(access,row,1,check[0]);txt(access,row,2,check[1]);txt(access,row,3,None,editable=True,fill='EDF2FD');txt(access,row,4,check[2]);txt(access,row,5,None,editable=True,fill='EDF2FD');txt(access,row,6,None,editable=True,fill='EDF2FD')
    dv_status(access,'C7:C13')
    for c in 'ABCDEF':access.column_dimensions[c].width=32
    hist=sheets['08_HISTORICO_7D'];theme(hist,'HISTÓRICO DEL ESCENARIO SIMULADO','Cortes diarios 29 de octubre–5 de noviembre · extremos con ventanas parciales',9)
    headers(hist,6,['Fecha Bogotá','Observaciones','Salud OK','Análisis OK','Alertas requeridas','Alertas OK','ACK','Salud %','Firebase %'])
    days=list(rep['daily'].keys())
    for j,day in enumerate(days,7):
        txt(hist,j,1,day,linked=True)
        count=f'COUNTIF(\'01_REGISTROS\'!$B$6:$B${end},">="&DATEVALUE(A{j}))-COUNTIF(\'01_REGISTROS\'!$B$6:$B${end},">="&(DATEVALUE(A{j})+1))'
        # Avoid relying on DATEVALUE locale by importing the exact day count for the grouping as observed data, not an official result.
        sums=rep['daily'][day]
        for cc,key in [(2,'rows'),(3,'health_ok'),(4,'analysis_ok'),(5,'alert_requested'),(6,'alert_posted'),(7,'events_acked')]:txt(hist,j,cc,sums[key],linked=True)
        txt(hist,j,8,f'=IFERROR(C{j}/B{j},"")',fmt='0.00%')
        txt(hist,j,9,f'=IFERROR(G{j}/B{j},"")',fmt='0.00%')
    for col in 'ABCDEFGHI':hist.column_dimensions[col].width=20
    try:
        chart=LineChart();chart.title='Calidad observada por fecha (simulación)';chart.style=13;chart.y_axis.title='Proporción';chart.x_axis.title='Fecha';chart.height=10;chart.width=22
        chart.add_data(Reference(hist,min_col=8,max_col=9,min_row=6,max_row=6+len(days)),titles_from_data=True)
        chart.set_categories(Reference(hist,min_col=1,min_row=7,max_row=6+len(days)));hist.add_chart(chart,'A18')
    except Exception as exc: print('Chart skipped:',exc)
    meth=sheets['09_METODOLOGIA'];theme(meth,'MÉTODO Y UMBRALES · FÓRMULAS PUBLICADAS','Objetivos internos propuestos; no están en la rúbrica. No se mezclan con resultados de UptimeRobot.',6)
    headers(meth,6,['ID','Indicador','Sentido','Umbral','Peso','Fórmula'])
    formulas=['saludables / observadas','análisis correctos / registros','alertas OK / alertas requeridas','ACK únicos / eventos generados','P95 nearest-rank de tiempos originales','P95 nearest-rank de alertas aplicables']
    for j,(m,description) in enumerate(zip(METRICS,formulas),8):
        mid,label,unit,operator,threshold,weight=m
        txt(meth,j,1,mid);txt(meth,j,2,label);txt(meth,j,3,operator);txt(meth,j,4,threshold,fmt='0.00%' if operator=='>=' else '0" ms"',editable=True,fill=PURPLE);txt(meth,j,5,weight,fmt='0%');txt(meth,j,6,description)
    # explicit numeric thresholds for P95, used from SUMATORIAS
    txt(meth,14,1,'analysis_limit_ms');txt(meth,14,4,500,editable=True,fill=PURPLE)
    txt(meth,15,1,'alert_limit_ms');txt(meth,15,4,1000,editable=True,fill=PURPLE)
    more=[('Procedencia','SIMULADO_NO_EVIDENCIA'),('Período inicio',START.isoformat()),('Período fin',END.isoformat()),('Índice','20% salud + 20% análisis + 20% alertas + 20% ACK + 10% penalización P95 análisis + 10% penalización P95 alerta'),('P95','SMALL(muestras; ROUNDUP(COUNT(muestras)*0,95;0)). No promediar percentiles.'),('Éxito global','SUM(éxitos)/SUM(intentos), nunca promedio simple entre dispositivos'),('Estado desconocido','Sin reportes ≠ servicio caído o disponible; marcar SIN DATOS'),('Reglas','Nada de mensajes, enlaces completos, tokens ni información familiar'),('Página oficial','UptimeRobot y PageSpeed requieren URL e informe real')]
    for j,(a,b) in enumerate(more,18):txt(meth,j,1,a,bold=True);txt(meth,j,2,b)
    for c in 'ABCDEF':meth.column_dimensions[c].width=29
    meth.column_dimensions['B'].width=38;meth.column_dimensions['F'].width=77
    trace=sheets['10_TRAZABILIDAD'];theme(trace,'VALIDACIÓN, FUENTES Y TRAZABILIDAD','Fuente original no certifica capturas Android ni uso de servicios externos',4)
    for j,(k,v) in enumerate([('Tipo de datos',rep['provenance']),('Archivo importado',rep['source']['source_file']),('SHA-256 del archivo',rep['source']['source_sha256']),('Filas sintéticas aceptadas',len(rows)),('Dispositivos distintos',len(devs)),('Rango inicio Bogotá',START.isoformat()),('Rango fin Bogotá',END.isoformat()),('Registros inválidos',0),('Archivos de origen','Ver hoja anterior; no evidencia de producción'),('URL requerida de UptimeRobot','https://uptimerobot.com/'),('URL requerida PageSpeed','https://pagespeed.web.dev/'),('Esquema',1),('Observación de auditoría','Se separan simulación y producción. Si falta evidencia oficial: PENDIENTE.')],6):
        txt(trace,j,1,k,bold=True);txt(trace,j,2,v,linked=True)
    trace.column_dimensions['A'].width=33;trace.column_dimensions['B'].width=95
    catalogue=sheets['11_CATALOGO_30'];theme(catalogue,'CATÁLOGO DE 30 MÉTRICAS PLANEADAS','Instrumentación potencial. La presencia del nombre NO demuestra captura automática de la métrica.',7)
    headers(catalogue,6,['Categoría','Métrica','Unidad','Tipo','Captura sugerida','Estado en 0.6.x','Límite interpretativo'])
    cat=[
      ('Protección','Estado permisos','bool','gauge','Native NotificationManager','Parcial','Autorizar ≠ servicio ejecutándose'),
      ('Protección','Estado servicio','bool','gauge','Listener callbacks','Parcial','No garantiza uptime'),
      ('Protección','Checks saludables','conteo','counter','On bind / periodic check','Pendiente','Muestras sin cobertura desconocida'),
      ('Protección','Reinicios servicio','conteo','counter','Lifecycle','Pendiente','Puede perder eventos si OS termina proceso'),
      ('Protección','Última actividad','UTC','timestamp','Heartbeats','Parcial','No es vigilancia continua'),
      ('Análisis','Notificaciones elegibles','conteo','counter','Android notification callback','Pendiente','Solo notificaciones accesibles'),
      ('Análisis','Enlaces detectados','conteo','counter','URL extraction','Parcial','No todos los enlaces son amenazas'),
      ('Análisis','Análisis OK','conteo','counter','EngineRunner result','Parcial','Resultado no garantiza clasificación correcta'),
      ('Análisis','Análisis fallidos','conteo','counter','EngineRunner errors','Parcial','Distinguir offline y fallos'),
      ('Análisis','Duración análisis','ms','histogram','SystemClock.elapsedRealtime','Parcial','Rango según fuente de tiempo'),
      ('Alertas','Resultados por color','conteo','counter','Decision finalized','Implementado','Color es veredicto, no verdad terreno'),
      ('Alertas','Alertas solicitadas','conteo','counter','Alerts invocation','Pendiente','Petición ≠ entrega al usuario'),
      ('Alertas','Alertas publicadas','conteo','counter','NotificationManager.notify','Pendiente','No garantiza lectura'),
      ('Alertas','Duración hasta alerta','ms','histogram','SystemClock elapsedRealtime','Parcial','Orden de callbacks'),
      ('Alertas','Alertas duplicadas evitadas','conteo','counter','Deduplication map','Pendiente','Los duplicados dependen de la fuente'),
      ('Firebase','Eventos generados','conteo','counter','Enqueue transaction','Parcial','No contar reintentos dos veces'),
      ('Firebase','ACK confirmados','conteo','counter','HTTP 2xx + idempotencia','Parcial','409/412 requieren confirmar existencia'),
      ('Firebase','Errores sincronización','conteo','counter','HTTP failures','Parcial','No confundir 403 con fallo red'),
      ('Firebase','Eventos pendientes','conteo','gauge','SQLite pending','Implementado','Cola local no visible sin telemetría'),
      ('Firebase','Reintentos de envío','conteo','counter','Retry loop','Parcial','No sumar a generados'),
      ('Android','Inicio de APK','ms','histogram','NativePerformance','Parcial','Firebase SDK requiere app Android registrada'),
      ('Android','Cierres inesperados','sesiones','counter','Crashlytics','Pendiente','No inferir de ausencia de reportes'),
      ('Android','ANR','sesiones','counter','Android Vitals','Pendiente','No disponible sin Play data'),
      ('Android','Memoria utilizada','MB','gauge','MemoryInfo sampled','Pendiente','Muestreo representativo'),
      ('Android','Tráfico de red','bytes','counter','TrafficStats UID delta','Pendiente','No contar tráfico de otros procesos'),
      ('Family','Salas creadas','conteo','counter','Firestore create','Parcial','Sin PII en admin global'),
      ('Family','Ingresos aceptados','conteo','counter','Firestore transactions','Parcial','Cuenta anónima ≠ persona única'),
      ('Family','Reportes rojos','conteo','counter','Consented family events','Parcial','No elevar a blacklist global'),
      ('Family','Coincidencia exacta','conteo','counter','registrable domain matching','Parcial','Mismo dominio ≠ mismo enlace'),
      ('Family','Coincidencia similar','conteo','counter','homoglyph matcher','Parcial','Similaridad ≠ confirmación')]
    assert len(cat)==30
    for ri,row in enumerate(cat,7):
        for ci,v in enumerate(row,1):txt(catalogue,ri,ci,v,fill=WHITE if ri%2 else 'F3F7FA')
    for c,w in {'A':17,'B':39,'C':20,'D':18,'E':35,'F':21,'G':66}.items():catalogue.column_dimensions[c].width=w
    verdict=sheets['00_VEREDICTO'];theme(verdict,'SMARTGUARD | CALIDAD TÉCNICA INTEGRAL','SIMULACIÓN DEMOSTRATIVA · 1.198 observaciones / 6 instalaciones · NO es evidencia real de Entrega 4',9)
    verdict.merge_cells('A4:C4');txt(verdict,4,1,'ÍNDICE ANDROID PROPIO / 100',fill=LIGHT,bold=True)
    verdict.merge_cells('A5:C6');txt(verdict,5,1,"='02_SUMATORIAS'!P14",fill=LIGHT,bold=True,fmt='0.00')
    verdict.merge_cells('D4:F4');txt(verdict,4,4,'METAS INTERNAS CUMPLIDAS',fill=LIGHT,bold=True)
    verdict.merge_cells('D5:F6');txt(verdict,5,4,"='02_SUMATORIAS'!O14&\" / 6\"",fill=LIGHT,bold=True)
    verdict.merge_cells('G4:I4');txt(verdict,4,7,'RÚBRICA OFICIAL VERIFICADA',fill=AMBER,bold=True)
    verdict.merge_cells('G5:I6');txt(verdict,5,7,"='04_RUBRICA_OFICIAL'!C14&\" / 4\"",fill=AMBER,bold=True)
    headers(verdict,8,['Indicador interno','Resultado','Unidad','Umbral propio','Margen','Estado','Peso','Fuente','Observación'])
    for j,(mid,label,unit,op,threshold,weight) in enumerate(METRICS,9):
        outcome=rep['global_summary']['metrics'][j-9]
        txt(verdict,j,1,label);sumcol=['I','J','K','L','M','N'][j-9]
        txt(verdict,j,2,f"='02_SUMATORIAS'!{sumcol}14",fmt='0.00%' if op=='>=' else '0" ms"')
        txt(verdict,j,3,unit)
        txt(verdict,j,4,f"='09_METODOLOGIA'!D{8+j-9}",fmt='0.00%' if op=='>=' else '0')
        txt(verdict,j,5,f'=IFERROR({"B" if op==">=" else "D"}{j}-{ "D" if op==">=" else "B"}{j},"")',fmt='0.00%' if op=='>=' else '0')
        txt(verdict,j,6,f'=IF(NOT(ISNUMBER(B{j})),"SIN DATOS",IF(B{j}{op}D{j},"CUMPLE","NO CUMPLE"))')
        txt(verdict,j,7,weight,fmt='0%')
        txt(verdict,j,8,'CSV · SIMULADO_NO_EVIDENCIA');txt(verdict,j,9,'Meta interna ≠ umbral oficial')
    txt(verdict,17,1,'CONCLUSIÓN INTERNA',fill=LIGHT,bold=True)
    verdict.merge_cells('B17:I17');txt(verdict,17,2,'=IF(COUNTIF(F9:F14,"NO CUMPLE")>0,"NO SE CUMPLEN TODAS LAS METAS INTERNAS",IF(COUNTIF(F9:F14,"CUMPLE")=6,"6/6 METAS INTERNAS CUMPLIDAS · SOLO SIMULACIÓN","FALTAN DATOS PARA EVALUAR"))',fill=LIGHT,bold=True)
    txt(verdict,19,1,'VEREDICTO RÚBRICA',fill=AMBER,bold=True)
    verdict.merge_cells('B19:I19');txt(verdict,19,2,'=\'04_RUBRICA_OFICIAL\'!C15',fill=AMBER,bold=True)
    txt(verdict,21,1,'NOTA DE EVIDENCIA',fill=AMBER,bold=True)
    verdict.merge_cells('B21:I22');txt(verdict,21,2,'Los indicadores Android calculados a partir de simulación no sustituyen una medición real de UptimeRobot, PageSpeed, login, aislamiento o README.',fill=AMBER)
    for c,w in {'A':35,'B':21,'C':13,'D':20,'E':18,'F':19,'G':13,'H':30,'I':40}.items():verdict.column_dimensions[c].width=w
    verdict.freeze_panes='B9';verdict.sheet_view.zoomScale=85
    path=outdir/'SMARTGUARD_CALIDAD_TECNICA_INTEGRAL.xlsx';wb.calculation.fullCalcOnLoad=True;wb.calculation.forceFullCalc=True;wb.calculation.calcMode='auto'
    wb.save(path)
    report_file=outdir/'SMARTGUARD_INFORME_SIMULACION.json';report_file.write_text(json.dumps(rep,ensure_ascii=False,indent=2,default=str),encoding='utf-8')
    g=rep['global_summary']
    lines=[]
    for x in g['metrics']:
        actual=x['actual'] if x['unit']=='ms' else (f"{100*x['actual']:.3f}%" if x['actual'] is not None else 'SIN DATOS')
        lines.append(f"|{x['label']}|{actual}|{x['op']} {x['threshold']}|{x['status']}|")
    table='\n'.join(lines)
    readme=(f'# Informe SmartGuard · SIMULADO_NO_EVIDENCIA\n\nPeríodo: {START.isoformat()} – {END.isoformat()}. 1.198 observaciones sintéticas, 6 dispositivos.\n\n'+
        f'Índice interno del escenario: {g["internal_index"]:.3f}/100 · {g["targets_met"]}/6 metas. **No es PageSpeed ni UptimeRobot.**\n\n'+
        '|Métrica|Resultado simulado|Meta interna|Estado|\n|---|---:|---|---|\n'+table+ '\n\n'+
        '## Evaluación oficial\n\n**0 de 4 condiciones acreditadas con esta simulación**; no equivale a 0/4 condiciones incumplidas. Falta evidencia real de UptimeRobot, PageSpeed, pruebas E2E con dos cuentas y revisión README.\n\n'+
        f'CSV SHA-256: `{rep["source"]["source_sha256"]}`\n\n'+
        'El índice pesa 20 % cada una de las cuatro tasas y 10 % cada P95 normalizado. Metas propuestas, no oficiales. No se imputan intervalos sin datos.\n')
    (outdir/'SMARTGUARD_INFORME_SIMULACION.md').write_text(readme,encoding='utf-8')
    return path,report_file

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--input',required=True);p.add_argument('--out-dir',default='reports/quality/local');args=p.parse_args()
    rows,source=load_simulated_csv(args.input);report=make_report(rows,source)
    paths=create(rows,report,args.out_dir)
    print(json.dumps({'files':[str(x) for x in paths],'rows':len(rows),'internal_index':report['global_summary']['internal_index'], 'targets_met':report['global_summary']['targets_met'], 'official_verified':0},ensure_ascii=False))
