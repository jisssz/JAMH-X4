import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./reports.db")

# SQLite requires check_same_thread=False for multithreaded access in FastAPI
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency to yield a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes the database schema if tables do not exist."""
    # Ensure parent directory exists for SQLite files (e.g. ./data/reports.db or /var/data/reports.db)
    if DATABASE_URL.startswith("sqlite:///"):
        raw_path = DATABASE_URL.replace("sqlite:///", "")
        dir_name = os.path.dirname(raw_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

    Base.metadata.create_all(bind=engine)

    # Auto-migrate SQLite schema if new columns were added to model
    if DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            try:
                result = conn.execute(text("PRAGMA table_info(reports)"))
                columns = [row[1] for row in result.fetchall()]
                if "local_report_id" not in columns:
                    conn.execute(text("ALTER TABLE reports ADD COLUMN local_report_id VARCHAR"))
                    conn.commit()
            except Exception:
                pass

