import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def export_openapi(destination: Path) -> None:
    """Write the FastAPI OpenAPI schema to a JSON file."""
    from api.app.main import app

    destination.write_text(
        json.dumps(app.openapi(), indent=2, sort_keys=True), encoding="utf-8"
    )


if __name__ == "__main__":
    export_openapi(Path("openapi.json"))
