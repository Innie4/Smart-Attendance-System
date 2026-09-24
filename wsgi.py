"""Root entrypoint for hosts that build/run from the repo root.

The real application lives in backend/ (see backend/wsgi.py). This shim
puts backend/ on sys.path and exposes the same ``app`` object so a
root-level start command like ``gunicorn wsgi:app`` works.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=os.environ.get("FLASK_DEBUG", "0") == "1",
    )
