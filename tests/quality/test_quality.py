"""Run: python -m unittest discover -s tests/quality -v (stdlib only)."""
import sys,unittest,tempfile
from pathlib import Path
from datetime import timedelta
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts'/'quality'))
from core import ratio,nearest_rank_p95,aggregate,load_simulated_csv,ValidationError,make_report

class QualityTests(unittest.TestCase):
 def sample(self,**values):
  return dict(id='SIM-001',date=None,uid='SG-SIM-01',android='Android 10',risk='rojo',service=1,analysis=1,alert=1,ack=1,analysis_ms=100,alert_ms=200,**values)
 def test_ratios_missing(self):
  self.assertIsNone(ratio(0,0));self.assertAlmostEqual(ratio(335,350),.9571428571428572)
 def test_percentile_is_nearest_rank(self):
  self.assertEqual(nearest_rank_p95([1,2,3,4,5,6,7,8,9,10]),10)
  self.assertIsNone(nearest_rank_p95([]))
 def test_true_weighting(self):
  base={k:v for k,v in self.sample().items() if k not in ('service','analysis','alert','ack')}
  a=dict(base,service=1,analysis=1,alert=1,ack=1)
  b=dict(base,service=0,analysis=0,alert=0,ack=0)
  out=aggregate([a]*99+[b])
  self.assertAlmostEqual(out['scores']['service_health'],.99)
  self.assertAlmostEqual(out['scores']['ack_success'],.99)
 def test_missing_not_100(self):
  out=aggregate([])
  self.assertTrue(all(x['status']=='SIN DATOS' for x in out['metrics']))
  self.assertIsNone(out['internal_index'])
 def test_partial_coverage_not_scored_as_perfect(self):
  v=self.sample()
  v['alert']=None
  v['alert_ms']=None
  result=aggregate([v])
  self.assertIsNone(result['internal_index'])
  self.assertTrue(any(x['status']=='SIN DATOS' for x in result['metrics']))
 def test_no_alert_denominator_for_green(self):
  x=self.sample();x['risk']='verde';x['alert']=None;x['alert_ms']=None
  out=aggregate([x]);self.assertIsNone(out['scores']['alert_success'])
 def test_simulation_strict(self):
  p=Path('/mnt/data/SmartGuard_1198_CORREGIDO_EXCEL_ES.csv')
  if not p.exists():self.skipTest('Original source is not available in CI')
  rows,source=load_simulated_csv(p);self.assertEqual(len(rows),1198)
  self.assertEqual(source['provenance'],'SIMULADO_NO_EVIDENCIA')
  self.assertEqual(len(set(x['uid'] for x in rows)),6)
  self.assertEqual(len(set(x['id'] for x in rows)),1198)
  report=make_report(rows,source);self.assertEqual(report['official_verified_count'],0)
  self.assertTrue(all(x['status']=='PENDIENTE DE EVIDENCIA REAL' for x in report['rubric']))
 def test_no_label_switch(self):
  # Validation refuses untrusted replacement labels: sim importer needs exact stamp.
  p=Path('/mnt/data/SmartGuard_1198_CORREGIDO_EXCEL_ES.csv')
  if not p.exists():self.skipTest('Original source is not available in CI')
  content=p.read_text(encoding='utf-8-sig')
  with tempfile.TemporaryDirectory() as d:
   f=Path(d)/'modified.csv';f.write_text(content.replace('SIMULADO_NO_EVIDENCIA','PRODUCCION_VERIFICADA'))
   with self.assertRaises(ValidationError):load_simulated_csv(f)
if __name__=='__main__':unittest.main()
