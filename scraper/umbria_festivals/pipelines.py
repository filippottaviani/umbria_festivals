import os
import logging
import psycopg2
from itemadapter import ItemAdapter

class PostgreSQLPipeline:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.connection = None
        self.cursor = None

    @classmethod
    def from_crawler(cls, crawler):
        # prefer explicit DATABASE_URL, otherwise build from individual env vars
        db_url = crawler.settings.get("DATABASE_URL") or os.getenv("DATABASE_URL")
        if not db_url:
            user = os.getenv("POSTGRES_USER", "postgres")
            password = os.getenv("POSTGRES_PASSWORD", "postgres")
            db = os.getenv("POSTGRES_DB", "postgres")
            host = os.getenv("POSTGRES_HOST", "db")
            port = os.getenv("POSTGRES_PORT", "5432")
            db_url = f"postgresql://{user}:{password}@{host}:{port}/{db}"
        return cls(db_url=db_url)

    def open_spider(self, spider):
        try:
            self.connection = psycopg2.connect(self.db_url)
            self.cursor = self.connection.cursor()
        except Exception as e:
            logging.error("PostgreSQL connection failed: %s", e)
            self.connection = None
            self.cursor = None

    def close_spider(self, spider):
        if self.connection:
            try:
                self.connection.commit()
            except Exception:
                pass
            try:
                if self.cursor:
                    self.cursor.close()
            except Exception:
                pass
            try:
                self.connection.close()
            except Exception:
                pass

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        query = """
            INSERT INTO festivals (name, city, province, latitude, longitude, start_date, end_date, source_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source_url) DO UPDATE
            SET name = EXCLUDED.name, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date;
        """
        if not self.cursor:
            logging.warning("No DB cursor available, skipping item insert")
            return item

        self.cursor.execute(
            query,
            (
                adapter.get("name"),
                adapter.get("city"),
                adapter.get("province"),
                adapter.get("latitude"),
                adapter.get("longitude"),
                adapter.get("start_date"),
                adapter.get("end_date"),
                adapter.get("source_url")
            )
        )
        self.connection.commit()
        return item