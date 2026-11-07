#!/usr/bin/env python3
"""Generate an offline per-100-g reference catalog from USDA FDC SR Legacy 2018-04.

Data source: https://fdc.nal.usda.gov/download-datasets/
USDA FoodData Central CC0 public-domain data.
No nutrients are inferred: unreported values remain null.
"""
import csv
import io
import json
import os
import sys
import urllib.request
import zipfile
from collections import defaultdict

URL = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip"
DEST = "src/data/usdaSrLegacy.json"
NUTRIENTS = {
    "energyKcal": (1008, "KCAL"),
    "proteinG": (1003, "G"),
    "carbohydratesG": (1005, "G"),
    "fatG": (1004, "G"),
    "saturatedFatG": (1258, "G"),
    "fiberG": (1079, "G"),
    "sugarsG": (2000, "G"),
    "sodiumMg": (1093, "MG"),
    "potassiumMg": (1092, "MG"),
}
FIELDS = list(NUTRIENTS)
print("Downloading USDA SR Legacy official CSV archive...", flush=True)
with urllib.request.urlopen(
    urllib.request.Request(URL, headers={"User-Agent": "HealthTracker/0.1.0 offline ingredient reference generator"}),
    timeout=120
) as response:
    archive = response.read()
print("USDA download bytes:", len(archive), flush=True)
z = zipfile.ZipFile(io.BytesIO(archive))
paths = {p.rsplit("/", 1)[-1].lower(): p for p in z.namelist() if p.lower().endswith(".csv")}
print("CSV files:", sorted(paths), flush=True)
def records(name):
    path = paths.get(name)
    if not path:
        raise ValueError("Required USDA table missing: " + name)
    return csv.DictReader(io.TextIOWrapper(z.open(path), encoding="utf-8-sig", newline=""))
nutrient_metadata = {int(row["id"]): row for row in records("nutrient.csv")}
for field, (nid, unit) in NUTRIENTS.items():
    nutrient = nutrient_metadata.get(nid)
    if nutrient is None or nutrient["unit_name"].upper() != unit:
        raise ValueError("USDA nutrient mismatch: %s [%s] expected %s" % (field, nutrient, unit))
print("Verified USDA nutrient fields:", [(k, nutrient_metadata[v[0]]["name"]) for k,v in NUTRIENTS.items()], flush=True)
foods = {}
for row in records("food.csv"):
    if row.get("data_type") != "sr_legacy_food":
        continue
    desc = row.get("description", "").strip()
    if desc:
        foods[int(row["fdc_id"])] = desc
print("SR Legacy food descriptions:",len(foods),flush=True)
nutrient_ids = {nid: field for field, (nid, _) in NUTRIENTS.items()}
values = defaultdict(dict)
for row in records("food_nutrient.csv"):
    fdc_id = int(row["fdc_id"])
    if fdc_id not in foods:
        continue
    field = nutrient_ids.get(int(row["nutrient_id"]))
    if field and row.get("amount") not in (None, ""):
        amount = float(row["amount"])
        if 0 <= amount < 100000:
            values[fdc_id][field] = amount

# Keep the complete SR Legacy reference subset with usable macro or energy
# data. This includes raw, boiled, steamed, cooked and other explicitly
# described variants. It is static and does not include health records.
catalog = [[fdc_id, description] + [values[fdc_id].get(field) for field in FIELDS]
           for fdc_id, description in sorted(foods.items())
           if values[fdc_id].get("energyKcal") is not None]
assert len(catalog) > 5000, "USDA dataset unexpectedly small"
def find(text):
    return [record for record in catalog if text in record[1].lower()]
cabbage = find("cabbage, cooked, boiled, drained, without salt")
raw_cabbage = find("cabbage, raw")
rice = find("rice, brown")
white_rice = find("rice, white")
if not cabbage or not raw_cabbage or not rice or not white_rice:
    raise ValueError("Cabbage or rice variants missing from USDA data")
print("USDA cabbage cooked sample:", cabbage[:2], flush=True)
print("USDA cabbage raw sample:", raw_cabbage[:2], flush=True)
print("USDA rice brown sample:", rice[:4], flush=True)
print("USDA rice white sample:", white_rice[:4], flush=True)
assert any(row[0] == 169976 and row[2] == 23 for row in cabbage), "Reference cooked cabbage ID/kcal mismatch"
payload = {
    "dataset": "USDA FoodData Central SR Legacy",
    "release": "2018-04",
    "source": URL,
    "fields": FIELDS,
    "records": catalog,
}
os.makedirs(os.path.dirname(DEST), exist_ok=True)
with open(DEST, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
size = os.path.getsize(DEST)
print("Generated:", DEST, "records:", len(catalog), "bytes:", size, flush=True)
if size > 4000000:
    raise ValueError("Catalog unexpectedly large for offline PWA")
