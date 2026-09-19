import os
import sys

# Support deployments where Vercel project Root Directory is set to repository root
current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.dirname(current_dir)
backend_dir = os.path.join(repo_root, "lmcc-backend")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

from app.main import app
