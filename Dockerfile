FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin app

COPY app.py gunicorn.conf.py ./
COPY templates templates
COPY static static

USER 10001
EXPOSE 8000

CMD ["gunicorn", "app:app"]
