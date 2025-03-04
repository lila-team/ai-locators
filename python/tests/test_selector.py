import os
import pytest
from playwright.sync_api import sync_playwright
from ai_locators import register_ai_selector
from openai import OpenAI


MODERN_CSS = """
    :root {
        --primary-color: #4a90e2;
        --secondary-color: #f5f5f5;
        --success-color: #2ecc71;
        --warning-color: #e67e22;
        --error-color: #e74c3c;
        --text-color: #333;
        --border-radius: 4px;
    }
    
    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        line-height: 1.6;
        color: var(--text-color);
        margin: 0;
        padding: 20px;
    }
    
    button {
        padding: 8px 16px;
        border: none;
        border-radius: var(--border-radius);
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .primary-button {
        background: var(--primary-color);
        color: white;
    }
    
    .secondary-button {
        background: var(--secondary-color);
        color: var(--text-color);
    }
    
    .card {
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        padding: 20px;
    }
    
    .product-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
    }
    
    .product {
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: var(--border-radius);
    }
    
    .notification {
        background: var(--success-color);
        color: white;
        padding: 15px;
        border-radius: var(--border-radius);
        margin: 10px 0;
    }
    
    .shipping-form .field {
        margin-bottom: 15px;
    }
    
    .shipping-form input,
    .shipping-form textarea,
    .shipping-form select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: var(--border-radius);
    }
    
    .data-grid {
        width: 100%;
        border-collapse: collapse;
    }
    
    .data-grid th,
    .data-grid td {
        padding: 12px;
        border-bottom: 1px solid #ddd;
        text-align: left;
    }
    
    .status {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 0.9em;
    }
    
    .status.active {
        background: var(--success-color);
        color: white;
    }
    
    .status.inactive {
        background: var(--secondary-color);
        color: var(--text-color);
    }
    
    .user-card {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: var(--border-radius);
        margin-bottom: 10px;
    }
    
    .payment-form .method {
        display: block;
        padding: 15px;
        border: 1px solid #ddd;
        border-radius: var(--border-radius);
        margin-bottom: 10px;
    }
    
    [role="dialog"] {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
"""


def apply_styles(content: str) -> str:
    return f"""
        <html>
            <head>
                <style>{MODERN_CSS}</style>
            </head>
            <body>
                {content}
            </body>
        </html>
    """

def test_basic_button_location(page):
    """Test locating a simple button with clear text and attributes."""
    content = """
        <button id="login" class="primary-button">Log In</button>
        <button id="signup" class="secondary-button">Sign Up</button>
    """
    page.set_content(apply_styles(content))
    element = page.locator("ai=the main login button")
    assert element.get_attribute("id") == "login"

def test_nested_element_location(page):
    """Test locating elements within complex nested structures."""
    content = """
        <div class="card">
            <div class="header">
                <h2>Product Details</h2>
                <div class="actions">
                    <button class="edit">
                        <span class="icon">✏️</span>
                        <span class="text">Edit Item</span>
                    </button>
                </div>
            </div>
        </div>
    """
    page.set_content(apply_styles(content))
    edit_button = page.locator("ai=the edit button inside the product details card")
    assert edit_button.get_attribute("class") == "edit"

def test_multiple_similar_elements(page):
    """Test filtering between similar elements based on context."""
    content = """
        <div class="product-list">
            <div class="product">
                <h3>Laptop</h3>
                <button class="buy">Buy Now</button>
            </div>
            <div class="product">
                <h3>Phone</h3>
                <button class="buy">Buy Now</button>
            </div>
            <div class="product">
                <h3>Tablet</h3>
                <button class="buy">Buy Now</button>
            </div>
        </div>
    """
    page.set_content(apply_styles(content))
    phone_buy_button = page.locator("ai=the buy button for the Phone product")
    assert phone_buy_button.evaluate("el => el.closest('.product').querySelector('h3').textContent") == "Phone"

def test_dynamic_content_waiting(page):
    """Test waiting for dynamic content to appear."""
    content = """
        <div id="container"></div>
        <script>
            setTimeout(() => {
                document.getElementById('container').innerHTML = `
                    <div class="notification">
                        <p>Operation completed successfully!</p>
                        <button class="close">✕</button>
                    </div>
                `;
            }, 1000);
        </script>
    """
    page.set_content(apply_styles(content))
    success_message = page.locator("ai=the success notification message text")
    success_message.wait_for(state="attached")
    assert success_message.inner_text() == "Operation completed successfully!"

def test_form_interaction(page):
    """Test complex form interactions."""
    content = """
        <form class="shipping-form">
            <div class="field">
                <label>Full Name</label>
                <input type="text" name="name" placeholder="Enter your full name"/>
            </div>
            <div class="field">
                <label>Shipping Address</label>
                <textarea name="address" placeholder="Enter your shipping address"></textarea>
            </div>
            <div class="field">
                <label>Shipping Method</label>
                <select name="shipping">
                    <option value="standard">Standard Shipping (5-7 days)</option>
                    <option value="express">Express Shipping (2-3 days)</option>
                </select>
            </div>
        </form>
    """
    page.set_content(apply_styles(content))
    name_input = page.locator("ai=the full name input field in the shipping form")
    address_input = page.locator("ai=the shipping address textarea")
    shipping_select = page.locator("ai=the dropdown for selecting shipping method")
    
    name_input.fill("John Doe")
    address_input.fill("123 Main St")
    shipping_select.select_option("express")
    
    assert name_input.input_value() == "John Doe"
    assert shipping_select.evaluate("el => el.value") == "express"

def test_table_interaction(page):
    """Test interactions with table structures."""
    content = """
        <table class="data-grid">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Project A</td>
                    <td><span class="status active">Active</span></td>
                    <td><button class="edit">Edit</button></td>
                </tr>
                <tr>
                    <td>Project B</td>
                    <td><span class="status inactive">Inactive</span></td>
                    <td><button class="edit">Edit</button></td>
                </tr>
            </tbody>
        </table>
    """
    page.set_content(apply_styles(content))
    active_project_edit = page.locator("ai=the edit button for the active project")
    assert active_project_edit.evaluate("el => el.closest('tr').querySelector('td').textContent") == "Project A"

def test_aria_accessibility(page):
    """Test locating elements using ARIA attributes."""
    content = """
        <div role="dialog" aria-label="Cookie Preferences">
            <h2>Cookie Settings</h2>
            <div role="group" aria-label="Cookie Options">
                <label>
                    <input type="checkbox" aria-label="Accept Essential Cookies"/>
                    Essential Cookies
                </label>
                <label>
                    <input type="checkbox" aria-label="Accept Marketing Cookies"/>
                    Marketing Cookies
                </label>
            </div>
            <button aria-label="Save Cookie Preferences">Save Settings</button>
        </div>
    """
    page.set_content(apply_styles(content))
    marketing_checkbox = page.locator("ai=the checkbox for marketing cookies")
    save_button = page.locator("ai=the button to save cookie preferences")
    
    marketing_checkbox.check()
    assert marketing_checkbox.is_checked()
    assert save_button.get_attribute("aria-label") == "Save Cookie Preferences"

def test_multiple_conditions(page):
    """Test locating elements with multiple conditions."""
    content = """
        <div class="user-list">
            <div class="user-card">
                <img src="avatar1.jpg" alt="John's avatar"/>
                <h3>John Doe</h3>
                <span class="status online">Online</span>
                <button class="message">Message</button>
            </div>
            <div class="user-card">
                <img src="avatar2.jpg" alt="Jane's avatar"/>
                <h3>Jane Smith</h3>
                <span class="status offline">Offline</span>
                <button class="message" disabled>Message</button>
            </div>
        </div>
    """
    page.set_content(apply_styles(content))
    online_user_message = page.locator("ai=the message button for the online user")
    assert online_user_message.evaluate("el => el.closest('.user-card').querySelector('h3').textContent") == "John Doe"
    assert not online_user_message.is_disabled()

def test_state_based_selection(page):
    """Test locating elements based on their state."""
    content = """
        <form class="payment-form">
            <div class="payment-methods">
                <label class="method">
                    <input type="radio" name="payment" value="credit"/>
                    <span>Credit Card</span>
                    <div class="details">
                        <input type="text" class="card-number" placeholder="Card Number" disabled/>
                    </div>
                </label>
                <label class="method">
                    <input type="radio" name="payment" value="paypal" checked/>
                    <span>PayPal</span>
                    <div class="details">
                        <input type="email" class="paypal-email" placeholder="PayPal Email"/>
                    </div>
                </label>
            </div>
        </form>
    """
    page.set_content(apply_styles(content))
    credit_card_input = page.locator("ai=the disabled credit card input field")
    paypal_input = page.locator("ai=the enabled PayPal email input")
    
    assert credit_card_input.is_disabled()
    assert not paypal_input.is_disabled()
    assert paypal_input.get_attribute("class") == "paypal-email"

def test_ai_selector_not_found(page):
    """Test handling of non-existent elements."""
    page.set_content(apply_styles("<div></div>"))
    element = page.locator("ai=a button that doesn't exist")
    with pytest.raises(Exception):
        element.click(timeout=4000)
