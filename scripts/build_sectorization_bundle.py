#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = REPO_ROOT / "data_sources" / "sectorization.json"
DEFAULT_OUTPUT = REPO_ROOT / "generated" / "sectorization-data.js"
BOOTSTRAP_PATH = REPO_ROOT / "bootstrap.js"
INDEX_PATH = REPO_ROOT / "index.html"
REQUIRED_TOP_LEVEL_KEYS = (
    "cityAreas",
    "mtpSubareas",
    "mapCloudAreaIds",
    "clouds",
    "cloudStyle",
    "cloudAnchors",
    "rules",
    "mtpRules",
    "areaSpecialtyRules",
)
BEZIERS_REFERENCE_REQUIRED_KEYS = (
    "perimetre",
    "structures",
    "filieres",
    "sectorisationCommunes",
    "regleLittoral",
    "ehpad",
)


def load_sectorization_source(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))

    missing_keys = [key for key in REQUIRED_TOP_LEVEL_KEYS if key not in data]
    if missing_keys:
        raise ValueError(
            f"Missing required keys in {path}: {', '.join(missing_keys)}"
        )

    references = data.get("references")
    if references is not None and not isinstance(references, dict):
        raise ValueError("'references' must be an object when provided")

    beziers_reference = (references or {}).get("beziers_ouest_herault")
    if beziers_reference is not None:
        missing_reference_keys = [
            key for key in BEZIERS_REFERENCE_REQUIRED_KEYS if key not in beziers_reference
        ]
        if missing_reference_keys:
            raise ValueError(
                "Missing required keys in references.beziers_ouest_herault: "
                + ", ".join(missing_reference_keys)
            )

    return data


def build_js_bundle(data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False, indent=None, separators=(", ", ": "))
    return (
        "globalThis.MEDIMAP_SECTORIZATION_DATA = Object.freeze("
        f"{payload}"
        ");\n"
    )


def update_bootstrap_cache_buster(path: Path, version: str) -> bool:
    source = path.read_text(encoding="utf-8")
    marker = '"generated/sectorization-data.js?v='
    start = source.find(marker)
    if start < 0:
        return False

    version_start = start + len(marker)
    version_end = source.find('"', version_start)
    if version_end < 0:
        return False

    updated = f"{source[:version_start]}{version}{source[version_end:]}"
    if updated == source:
        return True

    path.write_text(updated, encoding="utf-8")
    return True


def update_index_cache_buster(path: Path, version: str) -> bool:
    source = path.read_text(encoding="utf-8")
    marker = '<script src="generated/sectorization-data.js?v='
    updated = source
    changed = False
    search_start = 0

    while True:
        start = updated.find(marker, search_start)
        if start < 0:
            break

        version_start = start + len(marker)
        version_end = updated.find('"', version_start)
        if version_end < 0:
            return False

        updated = f"{updated[:version_start]}{version}{updated[version_end:]}"
        changed = True
        search_start = version_start + len(version)

    if changed and updated != source:
        path.write_text(updated, encoding="utf-8")
    return changed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate the sectorization bundle consumed by the MediMap front-end."
    )
    parser.add_argument(
        "--source",
        default=str(DEFAULT_SOURCE),
        help="JSON source file for sectorization data.",
    )
    parser.add_argument(
        "--output",
        default=str(DEFAULT_OUTPUT),
        help="Generated JavaScript bundle path.",
    )
    args = parser.parse_args()

    source_path = Path(args.source).resolve()
    output_path = Path(args.output).resolve()

    data = load_sectorization_source(source_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(build_js_bundle(data), encoding="utf-8")

    version = output_path.stat().st_mtime_ns
    update_bootstrap_cache_buster(BOOTSTRAP_PATH, str(version))
    update_index_cache_buster(INDEX_PATH, str(version))

    print(f"Generated {output_path} from {source_path}")


if __name__ == "__main__":
    main()
