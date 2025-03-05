import os
import pytest
from playwright.sync_api import sync_playwright
from ai_locators import register_ai_selector


@pytest.fixture(scope="module")
def browser():
    api_key = os.getenv("LLM_API_KEY")
    base_url = os.getenv("LLM_BASE_URL")
    model = os.getenv("LLM_MODEL")
    with sync_playwright() as p:
        register_ai_selector(p, api_key, base_url, model)
        browser = p.chromium.launch(args=["--no-sandbox", "--disable-web-security"])
        yield browser
        browser.close()


@pytest.fixture
def page(browser):
    context = browser.new_context(bypass_csp=True)
    page = context.new_page()
    yield page
    page.close() 
