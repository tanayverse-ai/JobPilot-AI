"""MongoDB connection setup (PyMongo, synchronous driver).

Note: database-design.md mentions the async Motor driver; this project's
requirements.txt already pins the sync `pymongo` driver and FastAPI route
handlers here are sync `def`s, which is the simpler and consistent choice for
this stage. Swapping to Motor later means changing this module and marking
routes `async def` — nothing else needs to change.
"""

from functools import lru_cache

from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import get_settings


@lru_cache
def get_client() -> MongoClient:
    settings = get_settings()
    return MongoClient(settings.mongodb_url)


def get_database() -> Database:
    """FastAPI dependency: yields the app's database handle."""
    settings = get_settings()
    return get_client()[settings.database_name]


# Module-level handles kept for convenience / backwards compatibility with
# code that imports `client`, `db`, or the collections directly instead of
# using the `get_database` dependency.
client = get_client()
db = get_database()
users_collection = db["users"]
jobs_collection = db["jobs"]
