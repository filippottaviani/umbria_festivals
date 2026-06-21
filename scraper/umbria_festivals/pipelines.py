import psycopg2
from itemadapter import ItemAdapter

class PostgreSQLPipeline:
    def __init__(self, db_url: str):
        self.db_url = db_url
        self.connection = None
        self.cursor = None

    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            db_url=crawler.settings.get("DATABASE_URL")
        )

    def open_spider(self, spider):
        self.connection = psycopg2.connect(self.db_url)
        self.cursor = self.connection.cursor()

    def close_spider(self, spider):
        self.connection.commit()
        self.cursor.close()
        self.connection.close()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        query = """
            INSERT INTO festivals (name, city, province, latitude, longitude, start_date, end_date, source_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source_url) DO UPDATE
            SET name = EXCLUDED.name, start_date = EXCLUDED.start_date, end_date = EXCLUDED.end_date;
        """
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