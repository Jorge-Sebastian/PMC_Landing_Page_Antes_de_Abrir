# Reproducible quality pipeline

`core.py`: CSV parser with strict simulation stamp, weighted sums, nearest-rank P95, checks for six installations, 1,198 unique IDs and timestamps.

`generate_report.py`: creates workbook (12 visible tabs + one hidden helper), JSON summary and Markdown explanation, with no Firebase access and no invented production measurements.

Run:

```bash
python -m pip install 'openpyxl>=3.1,<4'
python -m unittest discover -s tests/quality -v
python scripts/quality/generate_report.py --input SmartGuard_1198_CORREGIDO_EXCEL_ES.csv --out-dir reports/quality/local
```

The input CSV is external to the Git repository: don't upload data for real users to a public repository. The script will reject relabeling of synthetic input and verifies 1,198 rows and six synthetic IDs.
