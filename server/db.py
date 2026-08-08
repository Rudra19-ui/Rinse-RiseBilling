"""Database connection layer — PostgreSQL (Railway) or local SQLite."""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "rinse_rise.db"

# Railway / cloud Postgres variable names (first match wins)
PG_ENV_KEYS = (
    "DATABASE_URL",
    "DATABASE_PRIVATE_URL",
    "DATABASE_PUBLIC_URL",
    "POSTGRES_URL",
    "POSTGRESQL_URL",
)


def _resolve_database_url() -> str:
    for key in PG_ENV_KEYS:
        value = os.environ.get(key, "").strip()
        if value.startswith(("postgres://", "postgresql://")):
            return value
    return ""


def is_postgres() -> bool:
    return bool(_resolve_database_url())


def is_railway() -> bool:
    return bool(os.environ.get("RAILWAY_ENVIRONMENT", "").strip())


def _postgres_url() -> str:
    url = _resolve_database_url()
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    return url


def database_config_status() -> dict[str, Any]:
    backend = "postgresql" if is_postgres() else "sqlite"
    status: dict[str, Any] = {
        "backend": backend,
        "railway": is_railway(),
        "postgresConfigured": is_postgres(),
    }
    if is_postgres():
        for key in PG_ENV_KEYS:
            if os.environ.get(key, "").strip().startswith(("postgres://", "postgresql://")):
                status["postgresEnvVar"] = key
                break
    elif is_railway():
        status["warning"] = (
            "PostgreSQL is not linked. In Railway: open Rinse-RiseBilling → Variables → "
            "New Variable → Reference → select Postgres → DATABASE_URL (or DATABASE_PRIVATE_URL)."
        )
    return status


def database_backend_name() -> str:
    return "postgresql" if is_postgres() else "sqlite"


def date_gte(column: str) -> str:
    if is_postgres():
        return f"{column}::date >= %s::date"
    return f"date({column}) >= date(?)"


def date_lte(column: str) -> str:
    if is_postgres():
        return f"{column}::date <= %s::date"
    return f"date({column}) <= date(?)"


class DbCursor:
    def __init__(self, cursor: Any, is_pg: bool) -> None:
        self._cursor = cursor
        self._is_pg = is_pg
        self._insert_id: int | None = None

    def fetchone(self) -> Any:
        return self._cursor.fetchone()

    def fetchall(self) -> list[Any]:
        return self._cursor.fetchall()

    @property
    def lastrowid(self) -> int | None:
        if self._is_pg:
            return self._insert_id
        return self._cursor.lastrowid

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount


class DbConnection:
    def __init__(self, conn: Any, is_pg: bool) -> None:
        self._conn = conn
        self._is_pg = is_pg

    def _adapt_sql(self, sql: str) -> str:
        return sql.replace("?", "%s") if self._is_pg else sql

    def execute(self, sql: str, params: tuple | list = ()) -> DbCursor:
        sql = self._adapt_sql(sql)
        cur = self._conn.cursor()
        cur.execute(sql, params)
        wrapper = DbCursor(cur, self._is_pg)
        if self._is_pg and sql.strip().upper().startswith("INSERT") and "RETURNING" in sql.upper():
            row = cur.fetchone()
            if row:
                wrapper._insert_id = row["id"] if isinstance(row, dict) else row[0]
        return wrapper

    def insert_returning_id(self, sql: str, params: tuple | list) -> int:
        if self._is_pg:
            base = self._adapt_sql(sql).rstrip().rstrip(";")
            cur = self._conn.cursor()
            cur.execute(base + " RETURNING id", params)
            row = cur.fetchone()
            if not row:
                raise RuntimeError("Insert did not return id")
            return int(row["id"] if isinstance(row, dict) else row[0])
        cur = self._conn.cursor()
        cur.execute(sql, params)
        return int(cur.lastrowid)

    def commit(self) -> None:
        self._conn.commit()

    def executescript(self, script: str) -> None:
        if self._is_pg:
            statements = [s.strip() for s in script.split(";") if s.strip()]
            cur = self._conn.cursor()
            for statement in statements:
                cur.execute(statement)
        else:
            self._conn.executescript(script)

    def table_columns(self, table: str) -> set[str]:
        allowed = {"bills", "bill_items", "customers", "expenditures", "settings"}
        if table not in allowed:
            raise ValueError(f"Unknown table: {table}")
        if self._is_pg:
            cur = self._conn.cursor()
            cur.execute(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = %s
                """,
                (table,),
            )
            return {row["column_name"] for row in cur.fetchall()}
        rows = self.execute(f"PRAGMA table_info({table})").fetchall()
        return {row["name"] for row in rows}


@contextmanager
def get_connection() -> Iterator[DbConnection]:
    if is_postgres():
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(_postgres_url(), cursor_factory=RealDictCursor)
        wrapper = DbConnection(conn, True)
        try:
            yield wrapper
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        raw = sqlite3.connect(DB_PATH)
        raw.row_factory = sqlite3.Row
        raw.execute("PRAGMA foreign_keys = ON")
        wrapper = DbConnection(raw, False)
        try:
            yield wrapper
        finally:
            raw.close()
