#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = REPO_ROOT / "data_sources" / "sectorization.json"
DEFAULT_OUTPUT = REPO_ROOT / "generated" / "sectorization-data.js"
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


def load_sectorization_source(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))

    missing_keys = [key for key in REQUIRED_TOP_LEVEL_KEYS if key not in data]
    if missing_keys:
        raise ValueError(
            f"Missing required keys in {path}: {', '.join(missing_keys)}"
        )

    return data


def build_js_bundle(data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False, indent=None, separators=(", ", ": "))
    return (
        "globalThis.MEDIMAP_SECTORIZATION_DATA = Object.freeze("
        f"{payload}"
        ");\n"
    )


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

    print(f"Generated {output_path} from {source_path}")


if __name__ == "__main__":
    main()
