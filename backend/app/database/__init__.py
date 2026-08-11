"""Re-exports so `from app.database import client` (used across the app) keeps
working now that `database` is a package. This was the source of the original
ImportError: main.py did `from app.database import client`, but nothing in
this package ever exposed `client` at the package level.
"""

from app.database.database import client, db, get_client, get_database, users_collection

__all__ = ["client", "db", "get_client", "get_database", "users_collection"]
