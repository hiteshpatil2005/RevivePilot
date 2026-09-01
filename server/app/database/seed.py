"""
Seed database module entrypoint callable via:
python -m app.database.seed
"""
import asyncio
from scripts.seed import seed_database

if __name__ == "__main__":
    asyncio.run(seed_database(force=True))
