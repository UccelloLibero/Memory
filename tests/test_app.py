import json
import re
import runpy
from pathlib import Path

import pytest

import app as memory

ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture
def client():
    memory.app.config["TESTING"] = True
    return memory.app.test_client()


def card_urls(client):
    page = client.get("/game").get_data(as_text=True)
    return json.loads(re.search(r"data-images='([^']*)'", page).group(1))


@pytest.mark.parametrize("path", ["/", "/game", "/about"])
def test_pages_render(client, path):
    assert client.get(path).status_code == 200


def test_unknown_page_404(client):
    assert client.get("/nope").status_code == 404


def test_favicon_at_root(client):
    resp = client.get("/favicon.ico")
    assert resp.status_code == 200
    assert resp.data == (ROOT / "static/favicon/favicon.ico").read_bytes()


def test_game_offers_every_card(client):
    assert len(card_urls(client)) == len(list((ROOT / "static/images").glob("*.jpg")))


def test_versioned_static_cached_for_a_year(client):
    resp = client.get(card_urls(client)[0])
    assert resp.status_code == 200
    assert resp.cache_control.max_age == 60 * 60 * 24 * 365
    assert resp.cache_control.immutable


def test_unversioned_static_cached_for_a_day(client):
    resp = client.get("/static/icons/brain.svg")
    assert resp.status_code == 200
    assert resp.cache_control.max_age == 60 * 60 * 24
    assert not resp.cache_control.immutable


def test_gunicorn_keeps_no_access_log():
    assert runpy.run_path(str(ROOT / "gunicorn.conf.py"))["accesslog"] is None
