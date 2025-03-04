import pytest
from playwright.sync_api import expect


def test_example_org(page):
    page.goto("https://example.org")

    assert page.title() == "Example Domain"

    title = page.locator("ai=the main title")
    assert title.inner_text() == "Example Domain"


def test_playwright_site(page):
    page.goto("https://playwright.dev/")

    # Click the get started link.
    page.locator("ai=get started link").click()

    # Expects page to have a heading with the name of Installation.
    expect(page.get_by_role("heading", name="Installation")).to_be_visible()


def test_github_repo(page):
    page.goto("https://github.com/microsoft/playwright")

    header = page.locator("#repository-container-header")
    header.locator("ai=issues tab").click()

    # wait for page to load
    page.wait_for_load_state("networkidle")

    # Search by attribute data-listview-component="items-list"
    issues = page.locator("[data-listview-component='items-list']")
    assert issues.locator("ai=issue item").count() > 0


def test_todo_mvc(page):
    page.goto("https://demo.playwright.dev/todomvc/#/")

    # Add a new todo item
    new_todo_input = page.locator("ai=new todo input")
    new_todo_input.fill("Buy Milk")
    new_todo_input.press("Enter")

    new_todo_input.fill("Buy Eggs")
    new_todo_input.press("Enter")

    assert page.locator("ai=todo item").count() == 2


def test_hacker_news(page):
    page.goto("https://news.ycombinator.com/news")

    search = page.locator("ai=search bar")
    search.fill("Playwright")
    search.press("Enter")

    expect(page.locator("ai=search result number")).to_be_visible(timeout=10000)

    share_button = page.locator("ai=share button")
    share_button.click()

    assert page.locator("ai=share option").count() > 0
