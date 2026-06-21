FROM python:3.9-slim

ENV DEBIAN_FRONTEND=noninteractive

# system deps required by Playwright browsers and building some wheels
RUN apt-get update \
     && apt-get install -y --no-install-recommends \
         wget curl ca-certificates gnupg build-essential libpq-dev \
         libnss3 libatk1.0-0 libatk-bridge2.0-0 libx11-xcb1 libxcb1 libxcomposite1 libxdamage1 \
         libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libcups2 libxss1 fonts-liberation \
         libgtk-3-0 libx11-6 libxext6 libdbus-1-3 libdrm2 libexpat1 libxrender1 libxfixes3 libxi6 libxtst6 \
     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt

RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install -r /app/requirements.txt

COPY . /app

# Install Playwright browsers (with required system deps)
RUN python -m playwright install --with-deps

CMD ["scrapy", "crawl", "proloco"]
