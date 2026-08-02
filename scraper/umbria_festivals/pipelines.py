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
                    ALTER TABLE festivals ADD COLUMN IF NOT EXISTS program_info TEXT;
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

        if not self.cursor:
            logging.warning("No DB cursor available, skipping item insert")
            return item

        name = adapter.get("name").strip()
        city = adapter.get("city").strip()
        source_url = adapter.get("source_url").strip()

        # Check if festival already exists by source_url OR by (LOWER(name), LOWER(city))
        try:
            self.cursor.execute(
                "SELECT id, name, city, province, latitude, longitude, start_date, end_date, source_url, cultural_info, dish_info, image_url, description, menu_info, program_info FROM festivals WHERE source_url = %s OR (LOWER(name) = LOWER(%s) AND LOWER(city) = LOWER(%s))",
                (source_url, name, city)
            )
            existing = self.cursor.fetchone()

            if existing:
                # NON-DESTRUCTIVE ENRICHMENT: Only fill in fields that are currently NULL or empty in the existing record!
                f_id = existing[0]
                cultural_info = existing[9] or adapter.get("cultural_info")
                dish_info = existing[10] or adapter.get("dish_info")
                image_url = existing[11] if (existing[11] and existing[11].strip()) else adapter.get("image_url")
                description = existing[12] or adapter.get("description")
                menu_info = existing[13] or adapter.get("menu_info")
                program_info = existing[14] or adapter.get("program_info")

                update_query = """
                    UPDATE festivals
                    SET cultural_info = %s,
                        dish_info = %s,
                        image_url = %s,
                        description = %s,
                        menu_info = %s,
                        program_info = %s
                    WHERE id = %s
                """
                self.cursor.execute(update_query, (cultural_info, dish_info, image_url, description, menu_info, program_info, f_id))
                self.connection.commit()
                logging.info("Enriched existing festival without overwriting: %s (%s)", name, city)
            else:
                # INSERT NEW FESTIVAL
                insert_query = """
                    INSERT INTO festivals (id, name, city, province, latitude, longitude, start_date, end_date, source_url, cultural_info, dish_info, image_url, description, menu_info, program_info)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                self.cursor.execute(
                    insert_query,
                    (
                        str(uuid.uuid4()),
                        name,
                        city,
                        adapter.get("province"),
                        adapter.get("latitude"),
                        adapter.get("longitude"),
                        adapter.get("start_date"),
                        adapter.get("end_date"),
                        source_url,
                        adapter.get("cultural_info"),
                        adapter.get("dish_info"),
                        adapter.get("image_url"),
                        adapter.get("description"),
                        adapter.get("menu_info"),
                        adapter.get("program_info")
                    )
                )
                self.connection.commit()
                logging.info("Inserted new festival: %s (%s)", name, city)
        except Exception as exc:
            if self.connection:
                self.connection.rollback()
            logging.warning("Failed to process festival item %s: %s", adapter.asdict(), exc)

        return item