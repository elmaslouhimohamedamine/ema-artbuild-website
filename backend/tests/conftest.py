import os
from pathlib import Path

import pytest
import requests


def _load_frontend_backend_url() -> str:
    env_path = Path("/app/frontend/.env")
    if not env_path.exists():
        pytest.fail("/app/frontend/.env missing; cannot resolve REACT_APP_BACKEND_URL")

    for raw in env_path.read_text().splitlines():
        line = raw.strip()
        if line.startswith("REACT_APP_BACKEND_URL="):
            value = line.split("=", 1)[1].strip()
            if value:
                return value.rstrip("/")
    pytest.fail("REACT_APP_BACKEND_URL not found in /app/frontend/.env")


@pytest.fixture(scope="session")
def base_url() -> str:
    # Public app URL source-of-truth from frontend env
    return os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or _load_frontend_backend_url()


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Accept": "application/json"})
    return session