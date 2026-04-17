# alembic/env.py
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.db.models import Base
from app.db.database import DATABASE_URL

config = context.config

# Convert async URL to sync URL for Alembic
if "aiosqlite" in DATABASE_URL:
    sync_url = DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
else:
    sync_url = DATABASE_URL.replace("asyncpg", "psycopg2")

config.set_main_option("sqlalchemy.url", sync_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with connection."""
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    # For SQLite, use sync engine since async drivers can be problematic
    if "sqlite" in DATABASE_URL:
        from sqlalchemy import create_engine
        sync_url = DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
        connectable = create_engine(sync_url, poolclass=pool.NullPool)

        with connectable.connect() as connection:
            do_run_migrations(connection)
    else:
        # Use async URL for connection, sync URL for schema generation
        async_connectable = async_engine_from_config(
            config.get_section(config.config_ini_section, {}),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        async with async_connectable.connect() as connection:
            await connection.run_sync(do_run_migrations)

        await async_connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
