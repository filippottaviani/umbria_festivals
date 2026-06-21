import scrapy

class FestivalItem(scrapy.Item):
    name = scrapy.Field()
    city = scrapy.Field()
    province = scrapy.Field()
    latitude = scrapy.Field()
    longitude = scrapy.Field()
    start_date = scrapy.Field()
    end_date = scrapy.Field()
    source_url = scrapy.Field()