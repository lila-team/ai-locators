# AI Locators for Playwright

By [<img src="assets/logo.png" height=30>](https://github.com/lila-team/lila)

[![NPM Version](https://img.shields.io/npm/v/ai-locators?color=blue)](https://www.npmjs.com/package/ai-locators)
[![PyPI - Version](https://img.shields.io/pypi/v/ai-locators?color=blue)](https://pypi.org/project/ai-locators/)
[![CI](https://github.com/lila-team/ai-locators/actions/workflows/test.yml/badge.svg)](https://github.com/lila-team/ai-locators/actions/workflows/test.yml)[![Twitter](https://img.shields.io/twitter/follow/lila__dev?style=social)](https://twitter.com/lila__dev)
[![Discord](https://img.shields.io/discord/1303067047931936809?label=Discord)](https://discord.gg/kZ7TEmxH)
![GitHub Repo stars](https://img.shields.io/github/stars/lila-team/ai-locators)

AI-powered selectors for Playwright, available for both Python and Node.js. These packages allow you to use natural language descriptions to locate elements on a webpage using LLM (Large Language Model) technology.

```javascript
// 👎 Complex XPath with multiple conditions
page.locator("//div[contains(@class, 'header')]//button[contains(@class, 'login') and not(@disabled) and contains(text(), 'Sign In')]");

// 😎 Using ai-locators
page.locator("ai=the login button in the header that says Sign In");
```

Why?

* `ai-locators` do not require maintenance
* native integration with Playwright

## Node.js Package

### Installation

```bash
npm install ai-locators
```

### Usage

```javascript
const { chromium } = require('playwright');
const { registerAISelector } = require('ai-locators');

const apiKey = process.env.OPENAI_API_KEY;
const baseUrl = process.env.OPENAI_BASE_URL;
const model = "gpt-4o";

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-web-security"]  // Disable CORS to make LLM request. Use at own risk.
  });
  const page = await browser.newPage();
  
    await registerAISelector({
      apiKey: apiKey,
      model: model,
      baseUrl: baseUrl,
    });
    console.log("Registered AI selector");
  
  // Navigate to a page
  await page.goto("https://playwright.dev/")
  
  // Use the AI selector with natural language
  const element = page.locator("ai=get started button")
  await element.click();
  console.log("Clicked get started button");
  
  await browser.close();
})();
```

## Python Package

### Installation

```bash
pip install ai-locators
```

### Usage

```python
from playwright.sync_api import sync_playwright
from ai_locators import register_ai_selector

api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL")
model = "gpt-4o"

with sync_playwright() as p:
    # Need to disable web security for browser to make LLM requests work
    browser = p.chromium.launch(headless=False, args=["--disable-web-security"])  # Disable CORS to make LLM request. Use at own risk.
    page = browser.new_page()
    
    # Register the AI selector
    register_ai_selector(p, api_key, base_url, model)
    
    # Navigate to a page
    page.goto("https://playwright.dev/")
    
    # Use the AI selector with natural language
    element = page.locator("ai=get started button")
    element.click()
    
    browser.close()
```

## Custom Prefix

You can customize the prefix used for AI selectors. By default, it's `ai=`, but you can change it to anything you prefer.

### In Node.js

```javascript
await registerAISelector({
  apiKey: "...",
  baseUrl: "...",
  model: "...",
  selectorPrefix: "find"  // Now you can use "find=the login button"
});
```

### In Python

```python
register_ai_selector(p,
    api_key="...",
    base_url="...",
    model="...",
    selector_prefix="find"  # Now you can use "find=the login button"
)
```

## Plug in your LLM

The packages work with any OpenAI-compatible LLM endpoint. You just need to pass `model`, `api_key` and `base_url` when registering the selector.

For example:

### In Node.js

```javascript
// OpenAI
await registerAISelector({
    apiKey: "sk-...",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4"
});

// Anthropic
await registerAISelector({
    apiKey: "sk-ant-...",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-sonnet-20240229"
});

// Ollama
await registerAISelector({
    apiKey: "ollama",  // not used but required
    baseUrl: "http://localhost:11434/v1",
    model: "llama2"
});

// Basically any OpenAI compatible endpoint
```

### In Python

```python
# OpenAI
register_ai_selector(p, 
    api_key="sk-...",
    base_url="https://api.openai.com/v1",
    model="gpt-4"
)

# Anthropic
register_ai_selector(p,
    api_key="sk-ant-...",
    base_url="https://api.anthropic.com/v1",
    model="claude-3-sonnet-20240229"
)

# Ollama
register_ai_selector(p,
    api_key="ollama",  # not used but required
    base_url="http://localhost:11434/v1",
    model="llama2"
)

# Basically any OpenAI compatible endpoint
```

## How it works

`ai-locators` uses the custom selector engine feature from Playwright: https://playwright.dev/docs/extensibility 
Each time a locator needs to be resolved, an LLM call is used to generate the appropriate selector.
