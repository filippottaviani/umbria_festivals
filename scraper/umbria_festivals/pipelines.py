import os
import uuid
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
            if self.cursor:
                self.cursor.execute("""
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS cultural_info TEXT;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS dish_info TEXT;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS image_url VARCHAR;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS description TEXT;
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS menu_info TEXT;
                """)
                self.connection.commit()
        except Exception as e:
            logging.error("PostgreSQL connection or table migration failed: %s", e)
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
        if not adapter.get("name") or not adapter.get("city") or not adapter.get("province") or not adapter.get("start_date") or not adapter.get("end_date") or not adapter.get("source_url"):
            logging.debug("Skipping incomplete festival item: %s", adapter.asdict())
            return item

        query = """
            INSERT INTO festivals (id, name, city, province, latitude, longitude, start_date, end_date, source_url, cultural_info, dish_info, image_url, description, menu_info)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source_url) DO UPDATE
            SET name = EXCLUDED.name, city = EXCLUDED.city, province = EXCLUDED.province,
                start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date, 
                cultural_info = EXCLUDED.cultural_info, dish_info = EXCLUDED.dish_info, image_url = EXCLUDED.image_url,
                latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                description = EXCLUDED.description, menu_info = EXCLUDED.menu_info;
        """
        if not self.cursor:
            logging.warning("No DB cursor available, skipping item insert")
            return item

        try:
            self.cursor.execute(
                query,
                (
                    str(uuid.uuid4()),
                    adapter.get("name"),
                    adapter.get("city"),
                    adapter.get("province"),
                    adapter.get("latitude"),
                    adapter.get("longitude"),
                    adapter.get("start_date"),
                    adapter.get("end_date"),
                    adapter.get("source_url"),
                    adapter.get("cultural_info"),
                    adapter.get("dish_info"),
                    adapter.get("image_url"),
                    adapter.get("description"),
                    adapter.get("menu_info")
                )
            )
            self.connection.commit()
        except Exception as exc:
            if self.connection:
                self.connection.rollback()
            logging.warning("Failed to insert festival item %s: %s", adapter.asdict(), exc)

        return item