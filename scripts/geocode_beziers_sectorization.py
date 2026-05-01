#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = REPO_ROOT / "data_sources" / "sectorization.json"
DEFAULT_CACHE = REPO_ROOT / "generated" / "beziers_geocode_cache.json"
DEFAULT_OUTPUT = REPO_ROOT / "generated" / "beziers_geocoded_entities.json"
USER_AGENT = "MediMap/1.0 (internal data preparation)"


def simplify(text: str) -> str:
    value = str(text or "").lower()
    value = value.replace("’", "'").replace("‘", "'").replace("`", "'")
    return " ".join(value.strip().split())


def geocode(query: str) -> dict | None:
    params = urllib.parse.urlencode(
        {
            "format": "jsonv2",
            "q": query,
            "countrycodes": "fr",
            "limit": 1,
        }
    )
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
        if not payload:
            return None
        row = payload[0]
        return {
            "lat": float(row["lat"]),
            "lng": float(row["lon"]),
            "display_name": row.get("display_name", ""),
        }


def load_source(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    ref = ((data.get("references") or {}).get("beziers_ouest_herault") or {})
    if not ref:
        raise ValueError("Missing references.beziers_ouest_herault in source JSON")
    return ref


def collect_queries(ref: dict) -> list[tuple[str, str, str]]:
    queries: list[tuple[str, str, str]] = []
    seen = set()

    def add(kind: str, label: str, city_hint: str = "") -> None:
        query = ", ".join(part for part in [label, city_hint, "Hérault", "France"] if part)
        key = f"{kind}:{simplify(label)}:{simplify(city_hint)}"
        if key in seen:
            return
        seen.add(key)
        queries.append((key, query, simplify(city_hint)))

    for structure in ref.get("structures", []):
        add("structure", structure.get("nom", ""), structure.get("commune", ""))

    for ehpad_list in (ref.get("ehpad") or {}).values():
        for raw in ehpad_list:
            if not isinstance(raw, str):
                continue
            parts = [item.strip() for item in raw.split("—")]
            label = parts[0]
            commune = parts[1] if len(parts) > 1 else ""
            add("ehpad", label, commune)

    for cities in (ref.get("sectorisationCommunes") or {}).values():
        for city in cities:
            add("commune", city, "")

    return queries


def main() -> None:
    parser = argparse.ArgumentParser(description="Geocode Beziers/Ouest Herault entities with local cache.")
    parser.add_argument("--source", default=str(DEFAULT_SOURCE))
    parser.add_argument("--cache", default=str(DEFAULT_CACHE))
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between uncached requests in seconds.")
    args = parser.parse_args()

    source_path = Path(args.source).resolve()
    cache_path = Path(args.cache).resolve()
    output_path = Path(args.output).resolve()

    ref = load_source(source_path)
    queries = collect_queries(ref)

    cache = {}
    if cache_path.exists():
        cache = json.loads(cache_path.read_text(encoding="utf-8"))

    out = {}
    commune_center_by_key: dict[str, dict | None] = {}
    for key, query, city_hint in queries:
        if key not in cache:
            cache[key] = geocode(query)
            time.sleep(max(args.delay, 0))

        result = cache.get(key)
        if result:
            result = dict(result)
            result["precision"] = "entity"
            out_item = result
        else:
            out_item = None
            if city_hint:
                if city_hint not in commune_center_by_key:
                    commune_query = ", ".join([city_hint, "Hérault", "France"])
                    commune_center_by_key[city_hint] = geocode(commune_query)
                    time.sleep(max(args.delay, 0))
                fallback = commune_center_by_key.get(city_hint)
                if fallback:
                    out_item = dict(fallback)
                    out_item["precision"] = "commune_fallback"
        out[key] = out_item

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    output_path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output_path} ({len(out)} entries), cache: {cache_path}")


if __name__ == "__main__":
    main()
