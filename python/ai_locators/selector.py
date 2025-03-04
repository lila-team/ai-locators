import re
from typing import Union, Optional
from playwright.sync_api import Playwright
from playwright.async_api import Playwright as AsyncPlaywright
from loguru import logger
from pathlib import Path

PlaywrightT = Union[Playwright, AsyncPlaywright]

def _replace_content(js_content: str, api_key: str, base_url: str, model: str) -> str:
    js_content = re.sub(
        r'LLM_API_URL:\s*[\'"].*[\'"]',
        f'LLM_API_URL: "{base_url}/chat/completions"',
        js_content
    )
    js_content = re.sub(
        r'LLM_MODEL:\s*[\'"].*[\'"]',
        f'LLM_MODEL: "{model}"',
        js_content
    )
    js_content = re.sub(
        r'LLM_API_KEY:\s*[\'"].*[\'"]',
        f'LLM_API_KEY: "{api_key}"',
        js_content
    )
    return js_content


def register_ai_selector(playwright: PlaywrightT, api_key: str, base_url: str, model: str, selector_prefix: str = "ai") -> None:
    logger.debug("Registering AI selector engine")
    
    # Read the selector.js file
    selector_js_path = Path(__file__).parent.parent / "assets/selector.js"
    with open(selector_js_path, 'r') as f:
        js_content = f.read()
    
    js_content = _replace_content(js_content, api_key, base_url, model)
    playwright.selectors.register(
        selector_prefix,
        script=js_content
    )
    logger.debug(f"AI selector engine registered with prefix: {selector_prefix}")
