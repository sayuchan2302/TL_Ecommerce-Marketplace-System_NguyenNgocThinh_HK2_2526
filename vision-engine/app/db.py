from __future__ import annotations

from contextlib import contextmanager
from threading import Lock

import psycopg
from pgvector.psycopg import register_vector
from psycopg_pool import ConnectionPool

from .config import settings


BOOTSTRAP_SQL = f"""
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS vision;

CREATE TABLE IF NOT EXISTS vision.product_image_embeddings (
    id uuid PRIMARY KEY,
    backend_product_id uuid NOT NULL,
    product_slug text,
    store_id uuid NOT NULL,
    store_slug text,
    category_slug text,
    image_url text NOT NULL,
    image_index integer NOT NULL DEFAULT 0,
    is_primary boolean NOT NULL DEFAULT false,
    available_stock integer NOT NULL DEFAULT 0,
    source_updated_at timestamptz,
    embedding vector({settings.embedding_dimension}) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    model_name text NOT NULL,
    model_pretrained text NOT NULL,
    sync_token text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (backend_product_id, image_url)
);

ALTER TABLE vision.product_image_embeddings
    ADD COLUMN IF NOT EXISTS source_updated_at timestamptz;

ALTER TABLE vision.product_image_embeddings
    ADD COLUMN IF NOT EXISTS available_stock integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS product_image_embeddings_product_idx
    ON vision.product_image_embeddings (backend_product_id);

CREATE INDEX IF NOT EXISTS product_image_embeddings_active_product_idx
    ON vision.product_image_embeddings (backend_product_id)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS product_image_embeddings_active_idx
    ON vision.product_image_embeddings (is_active);

CREATE INDEX IF NOT EXISTS product_image_embeddings_store_slug_idx
    ON vision.product_image_embeddings (store_slug);

CREATE INDEX IF NOT EXISTS product_image_embeddings_active_store_slug_idx
    ON vision.product_image_embeddings (store_slug)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS product_image_embeddings_category_slug_idx
    ON vision.product_image_embeddings (category_slug);

CREATE INDEX IF NOT EXISTS product_image_embeddings_active_category_slug_idx
    ON vision.product_image_embeddings (category_slug)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS product_image_embeddings_source_updated_at_idx
    ON vision.product_image_embeddings (source_updated_at);

CREATE INDEX IF NOT EXISTS product_image_embeddings_active_source_updated_at_idx
    ON vision.product_image_embeddings (source_updated_at)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS product_image_embeddings_embedding_hnsw_idx
    ON vision.product_image_embeddings
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS product_image_embeddings_active_embedding_hnsw_idx
    ON vision.product_image_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WHERE is_active = true;
"""


_pool: ConnectionPool | None = None
_pool_lock = Lock()


def _configure_connection(connection: psycopg.Connection) -> None:
    register_vector(connection)


def initialize_database_pool() -> None:
    global _pool
    if _pool is not None:
        return

    with _pool_lock:
        if _pool is not None:
            return

        min_size = max(1, settings.db_pool_min_size)
        max_size = max(min_size, settings.db_pool_max_size)
        _pool = ConnectionPool(
            conninfo=settings.vision_database_url,
            min_size=min_size,
            max_size=max_size,
            kwargs={"autocommit": False},
            configure=_configure_connection,
        )
        _pool.wait()


def close_database_pool() -> None:
    global _pool
    with _pool_lock:
        if _pool is None:
            return
        _pool.close()
        _pool = None


@contextmanager
def get_connection():
    if _pool is None:
        initialize_database_pool()

    if _pool is None:
        raise RuntimeError("Database pool is not initialized")

    with _pool.connection() as connection:
        yield connection


def bootstrap_database() -> None:
    with psycopg.connect(settings.vision_database_url) as conn:
        register_vector(conn)
        with conn.cursor() as cur:
            cur.execute(BOOTSTRAP_SQL)
        conn.commit()
