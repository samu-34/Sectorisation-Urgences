#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_ADDRESS_CSV = ROOT / "data_sources" / "montpellier_point_adresse.csv"
DEFAULT_SUBQUARTERS_JSON = ROOT / "data_sources" / "montpellier_sous_quartiers.json"
DEFAULT_DB_PATH = ROOT / "db" / "montpellier_addresses.sqlite"
DEFAULT_INDEX_JS_PATH = ROOT / "generated" / "montpellier_street_index.js"
SCHEMA_PATH = ROOT / "db" / "schema.sql"

OFFICIAL_SUBQUARTER_TO_SUBZONE = {
    "Aiguelongue": "mtp_hf",
    "Aiguerelles": "mtp_pres_arenes",
    "Alco": "mtp_cevennes",
    "Antigone": "mtp_port_marianne",
    "Boutonnet": "mtp_hf",
    "Celleneuve": "mtp_mosson",
    "Centre Historique": "mtp_centre_historique",
    "Comédie": "mtp_centre_historique",
    "Croix d'Argent": "mtp_croix_argent",
    "Estanove": "mtp_croix_argent",
    "Figuerolles": "mtp_centre_historique",
    "Gambetta": "mtp_arceaux_gambetta",
    "Gares": "mtp_centre_historique",
    "Grammont": "mtp_millenaire",
    "Hôpitaux-Facultés": "mtp_hf",
    "La Chamberte": "mtp_cevennes",
    "La Martelle": "mtp_cevennes",
    "La Paillade": "mtp_mosson",
    "La Pompignane": "mtp_port_marianne",
    "Lemasson": "mtp_croix_argent",
    "Les Arceaux": "mtp_arceaux_gambetta",
    "Les Aubes": "mtp_centre_historique",
    "Les Beaux-Arts": "mtp_hf",
    "Les Cévennes": "mtp_cevennes",
    "Les Hauts de Massane": "mtp_mosson",
    "Millénaire": "mtp_millenaire",
    "Pas du Loup": "mtp_croix_argent",
    "Plan des 4 Seigneurs": "mtp_hf",
    "Port Marianne": "mtp_port_marianne",
    "Prés d'Arènes": "mtp_pres_arenes",
    "Saint-Martin": "mtp_pres_arenes",
}

STREET_PREFIX_PATTERN = re.compile(
    r"^(?:rue|avenue|av|boulevard|bd|allee|impasse|chemin|route|place|pl|quai|cours|"
    r"esplanade|mail|passage|square|promenade|faubourg)\s+"
)
LEADING_CONNECTOR_PATTERN = re.compile(
    r"^(?:de la|de l'|de|du|des|d'|la|le|les|l')\s+"
)


def normalize_text(value: str) -> str:
    text = str(value or "").lower()
    text = text.replace("œ", "oe").replace("æ", "ae").replace("’", "'")
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[-/]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def street_key(street_name: str) -> str:
    key = normalize_text(street_name)
    key = STREET_PREFIX_PATTERN.sub("", key)
    key = LEADING_CONNECTOR_PATTERN.sub("", key)
    return key.strip()


def normalize_house_number(number: str, suffix: str = "") -> str:
    value = " ".join(part for part in [str(number or "").strip(), str(suffix or "").strip()] if part)
    return normalize_text(value)


def build_exact_address_key(number: str, street_name: str, suffix: str = "") -> str:
    normalized_number = normalize_house_number(number, suffix)
    normalized_street = street_key(street_name)
    if not normalized_number or not normalized_street:
        return ""
    return f"{normalized_number}|{normalized_street}"


def build_full_address(row: dict[str, str]) -> str:
    number = " ".join(part for part in [row.get("numero", ""), row.get("suffixe", "")] if part).strip()
    parts = [number, row.get("voie_nom", "").strip()]
    street = " ".join(part for part in parts if part).strip()
    locality = "Montpellier"
    return ", ".join(part for part in [street, locality] if part)


def iter_polygon_rings(geometry: dict) -> list[list[list[float]]]:
    if geometry["type"] == "Polygon":
        return geometry["coordinates"]
    if geometry["type"] == "MultiPolygon":
        rings: list[list[list[float]]] = []
        for polygon in geometry["coordinates"]:
            rings.extend(polygon)
        return rings
    return []


def geometry_bbox(geometry: dict) -> tuple[float, float, float, float]:
    coordinates = [
        point
        for ring in iter_polygon_rings(geometry)
        for point in ring
    ]
    xs = [point[0] for point in coordinates]
    ys = [point[1] for point in coordinates]
    return min(xs), min(ys), max(xs), max(ys)


def point_in_ring(lng: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    previous_index = len(ring) - 1

    for index, point in enumerate(ring):
        current_lng, current_lat = point
        previous_lng, previous_lat = ring[previous_index]
        crosses_lat = (current_lat > lat) != (previous_lat > lat)
        if crosses_lat:
            denominator = (previous_lat - current_lat) or 1e-12
            intersect_lng = (
                (previous_lng - current_lng) * (lat - current_lat) / denominator
                + current_lng
            )
            if lng < intersect_lng:
                inside = not inside
        previous_index = index

    return inside


def point_in_geometry(lng: float, lat: float, geometry: dict) -> bool:
    if geometry["type"] == "Polygon":
        rings = geometry["coordinates"]
        if not point_in_ring(lng, lat, rings[0]):
            return False
        return not any(point_in_ring(lng, lat, hole) for hole in rings[1:])

    if geometry["type"] == "MultiPolygon":
        return any(
            point_in_geometry(lng, lat, {"type": "Polygon", "coordinates": polygon})
            for polygon in geometry["coordinates"]
        )

    return False


def load_subquarter_shapes(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    shapes = []

    for feature in payload["features"]:
        properties = feature["properties"]
        name = properties["name"]
        subzone_id = OFFICIAL_SUBQUARTER_TO_SUBZONE.get(name)
        if not subzone_id:
            continue

        shapes.append(
            {
                "name": name,
                "quartier": properties["quartier"],
                "commune": properties["commune"],
                "subzone_id": subzone_id,
                "geometry": feature["geometry"],
                "bbox": geometry_bbox(feature["geometry"]),
            }
        )

    return shapes


def resolve_subquarter(lng: float, lat: float, shapes: list[dict]) -> dict | None:
    for shape in shapes:
        min_lng, min_lat, max_lng, max_lat = shape["bbox"]
        if not (min_lng <= lng <= max_lng and min_lat <= lat <= max_lat):
            continue
        if point_in_geometry(lng, lat, shape["geometry"]):
            return shape
    return None


def build_database(
    address_csv_path: Path,
    subquarters_json_path: Path,
    db_path: Path,
    index_js_path: Path,
) -> dict[str, int | str]:
    shapes = load_subquarter_shapes(subquarters_json_path)
    schema = SCHEMA_PATH.read_text(encoding="utf-8")

    db_path.parent.mkdir(parents=True, exist_ok=True)
    index_js_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(db_path)
    connection.executescript(schema)

    connection.execute("DELETE FROM source_metadata")
    connection.execute("DELETE FROM official_subquarters")
    connection.execute("DELETE FROM address_points")
    connection.execute("DELETE FROM street_index")

    connection.executemany(
        "INSERT INTO official_subquarters(name, quartier, commune, medimap_subzone_id, geometry_json) VALUES (?, ?, ?, ?, ?)",
        [
            (
                shape["name"],
                shape["quartier"],
                shape["commune"],
                shape["subzone_id"],
                json.dumps(shape["geometry"], ensure_ascii=False),
            )
            for shape in shapes
        ],
    )

    connection.executemany(
        "INSERT INTO source_metadata(key, value) VALUES (?, ?)",
        [
            ("address_csv_path", str(address_csv_path)),
            ("subquarters_json_path", str(subquarters_json_path)),
        ],
    )

    total_rows = 0
    mapped_rows = 0
    street_stats: dict[str, dict[str, Counter]] = defaultdict(
        lambda: {
            "label_counter": Counter(),
            "subzone_counter": Counter(),
            "subquarter_counter": Counter(),
            "lat_sum_by_subzone": defaultdict(float),
            "lng_sum_by_subzone": defaultdict(float),
            "count_by_subzone": defaultdict(int),
        }
    )
    exact_address_index: dict[str, dict] = {}

    with address_csv_path.open("r", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file, delimiter=";")
        for row in reader:
            total_rows += 1
            longitude = float(row["long"])
            latitude = float(row["lat"])
            shape = resolve_subquarter(longitude, latitude, shapes)
            subquarter_name = shape["name"] if shape else None
            subzone_id = shape["subzone_id"] if shape else None

            key = street_key(row["voie_nom"])
            full_address = build_full_address(row)
            connection.execute(
                """
                INSERT INTO address_points(
                  cle_interop, street_name, street_key, house_number, suffix, full_address,
                  latitude, longitude, official_subquarter_name, medimap_subzone_id,
                  lieudit_complement, source, source_updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["cle_interop"],
                    row["voie_nom"],
                    key,
                    row.get("numero", ""),
                    row.get("suffixe", ""),
                    full_address,
                    latitude,
                    longitude,
                    subquarter_name,
                    subzone_id,
                    row.get("lieudit_complement_nom", ""),
                    row.get("source", ""),
                    row.get("date_der_maj", ""),
                ),
            )

            if not subzone_id:
                continue

            mapped_rows += 1
            street_stats[key]["label_counter"][row["voie_nom"]] += 1
            street_stats[key]["subzone_counter"][subzone_id] += 1
            street_stats[key]["subquarter_counter"][subquarter_name] += 1
            street_stats[key]["lat_sum_by_subzone"][subzone_id] += latitude
            street_stats[key]["lng_sum_by_subzone"][subzone_id] += longitude
            street_stats[key]["count_by_subzone"][subzone_id] += 1

            exact_key = build_exact_address_key(
                row.get("numero", ""),
                row.get("voie_nom", ""),
                row.get("suffixe", ""),
            )
            if exact_key and row.get("numero", "") != "99999":
                exact_address_index[exact_key] = {
                    "label": full_address,
                    "subzoneId": subzone_id,
                    "officialSubquarter": subquarter_name,
                    "lat": round(latitude, 7),
                    "lng": round(longitude, 7),
                    "streetKey": key,
                }

    export_index: dict[str, dict] = {}
    ambiguous_street_count = 0

    for key, stats in street_stats.items():
        subzone_counter = stats["subzone_counter"]
        total_for_street = sum(subzone_counter.values())
        top_subzone_id, top_subzone_count = subzone_counter.most_common(1)[0]
        confidence = top_subzone_count / total_for_street if total_for_street else 0.0
        is_ambiguous = len(subzone_counter) > 1
        if is_ambiguous:
            ambiguous_street_count += 1

        street_label = stats["label_counter"].most_common(1)[0][0]
        official_subquarter_name = stats["subquarter_counter"].most_common(1)[0][0]
        alternatives_json = json.dumps(dict(subzone_counter), ensure_ascii=False, sort_keys=True)
        count_for_top_subzone = stats["count_by_subzone"][top_subzone_id]
        representative_lat = (
            stats["lat_sum_by_subzone"][top_subzone_id] / count_for_top_subzone
            if count_for_top_subzone
            else 0.0
        )
        representative_lng = (
            stats["lng_sum_by_subzone"][top_subzone_id] / count_for_top_subzone
            if count_for_top_subzone
            else 0.0
        )

        connection.execute(
            """
            INSERT INTO street_index(
              street_key, street_label, medimap_subzone_id, official_subquarter_name,
              address_count, confidence, is_ambiguous, alternatives_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                key,
                street_label,
                top_subzone_id,
                official_subquarter_name,
                total_for_street,
                confidence,
                1 if is_ambiguous else 0,
                alternatives_json,
            ),
        )

        export_index[key] = {
            "label": street_label,
            "subzoneId": top_subzone_id,
            "officialSubquarter": official_subquarter_name,
            "addressCount": total_for_street,
            "confidence": round(confidence, 4),
            "isAmbiguous": is_ambiguous,
            "lat": round(representative_lat, 7),
            "lng": round(representative_lng, 7),
        }

    connection.executemany(
        "INSERT INTO source_metadata(key, value) VALUES (?, ?)",
        [
            ("total_address_rows", str(total_rows)),
            ("mapped_address_rows", str(mapped_rows)),
            ("street_index_count", str(len(export_index))),
            ("ambiguous_street_count", str(ambiguous_street_count)),
            ("exact_address_index_count", str(len(exact_address_index))),
        ],
    )

    connection.commit()
    connection.close()

    index_js = (
        "globalThis.MTP_STREET_INDEX = Object.freeze("
        + json.dumps(export_index, ensure_ascii=False, sort_keys=True)
        + ");\n"
    )
    index_js += (
        "globalThis.MTP_ADDRESS_POINT_INDEX = Object.freeze("
        + json.dumps(exact_address_index, ensure_ascii=False, sort_keys=True)
        + ");\n"
    )
    index_js += (
        "globalThis.MTP_STREET_INDEX_META = Object.freeze("
        + json.dumps(
            {
                "totalAddressRows": total_rows,
                "mappedAddressRows": mapped_rows,
                "streetCount": len(export_index),
                "ambiguousStreetCount": ambiguous_street_count,
                "exactAddressCount": len(exact_address_index),
            },
            ensure_ascii=False,
            sort_keys=True,
        )
        + ");\n"
    )
    index_js_path.write_text(index_js, encoding="utf-8")

    return {
        "total_rows": total_rows,
        "mapped_rows": mapped_rows,
        "street_count": len(export_index),
        "ambiguous_street_count": ambiguous_street_count,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Construit la base SQLite et l'index rues -> sous-zone pour Montpellier intramuros."
    )
    parser.add_argument("--address-csv", type=Path, default=DEFAULT_ADDRESS_CSV)
    parser.add_argument("--subquarters-json", type=Path, default=DEFAULT_SUBQUARTERS_JSON)
    parser.add_argument("--db-path", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--index-js-path", type=Path, default=DEFAULT_INDEX_JS_PATH)
    args = parser.parse_args()

    stats = build_database(
        address_csv_path=args.address_csv,
        subquarters_json_path=args.subquarters_json,
        db_path=args.db_path,
        index_js_path=args.index_js_path,
    )

    print("Base adresse Montpellier construite.")
    print(f"- adresses lues: {stats['total_rows']}")
    print(f"- adresses rattachees a une sous-zone MediMap: {stats['mapped_rows']}")
    print(f"- rues indexees: {stats['street_count']}")
    print(f"- rues ambiguës: {stats['ambiguous_street_count']}")


if __name__ == "__main__":
    main()
