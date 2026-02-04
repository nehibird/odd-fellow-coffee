#!/usr/bin/env python3
"""
Odd Fellow Coffee — User Guide PDF Generator
=============================================
Generates a multi-page user guide covering:
- Customer-facing pages (shop, drops, cart, subscriptions)
- Admin panel (dashboard, products, orders, drops, slots, subscriptions)
- Sourdough Drops workflow (detailed walkthrough)

Style reference: D.A. Carson Bible Study handout template (Georgia serif, navy headers,
colored info boxes, two-column layout where appropriate).
"""

from weasyprint import HTML
from pathlib import Path
from datetime import datetime
import base64

PROJECT_DIR = Path(__file__).parent
SCREENSHOTS_DIR = PROJECT_DIR / "guide-screenshots"
OUTPUT_FILE = PROJECT_DIR / "Odd_Fellow_Coffee_User_Guide.pdf"

# =============================================================================
# COLOR THEME — Adapted from Bible Study template, using Odd Fellow brand
# =============================================================================

COLORS = {
    "brand": "#b91c1c",       # medium-carmine (Odd Fellow red)
    "navy": "#1a365d",
    "gray_light": "#f5f5f5",
    "gray_border": "#ccc",
    "blue_light": "#e8f4f8",
    "blue_border": "#b0d4e3",
    "green_light": "#f0f9f4",
    "green_border": "#a0d8b3",
    "green_text": "#276749",
    "gold_light": "#fff8e6",
    "gold_border": "#d69e2e",
    "gold_text": "#744210",
    "cream": "#fffbf0",
    "red_light": "#fef2f2",
    "red_border": "#fca5a5",
}


def img_tag(filename, max_width="100%"):
    """Embed a screenshot as base64 inline image."""
    path = SCREENSHOTS_DIR / filename
    if not path.exists():
        return f'<p style="color:#999;font-style:italic;">[Screenshot: {filename} not found]</p>'
    data = base64.b64encode(path.read_bytes()).decode()
    return f'<img src="data:image/png;base64,{data}" style="max-width:{max_width};border:1px solid #ddd;border-radius:6px;margin:6pt 0;" />'


def generate_css():
    return f"""
        @page {{
            size: letter;
            margin: 0.5in 0.6in;
            @bottom-center {{
                content: counter(page);
                font-family: 'Georgia', serif;
                font-size: 7pt;
                color: #999;
            }}
        }}

        body {{
            font-family: 'Georgia', serif;
            font-size: 9pt;
            line-height: 1.4;
            color: #222;
        }}

        h1 {{
            font-size: 20pt;
            color: {COLORS['navy']};
            margin: 0 0 4pt 0;
            border-bottom: 3px solid {COLORS['brand']};
            padding-bottom: 6pt;
        }}

        h2 {{
            font-size: 13pt;
            color: {COLORS['navy']};
            margin: 14pt 0 6pt 0;
            border-bottom: 2px solid {COLORS['navy']};
            padding-bottom: 3pt;
        }}

        h3 {{
            font-size: 10pt;
            color: {COLORS['navy']};
            margin: 10pt 0 4pt 0;
            border-bottom: 1px solid {COLORS['gray_border']};
            padding-bottom: 2pt;
        }}

        h4 {{
            font-size: 9pt;
            color: {COLORS['navy']};
            margin: 8pt 0 3pt 0;
        }}

        p {{
            margin: 0 0 6pt 0;
        }}

        .cover {{
            text-align: center;
            padding-top: 120pt;
        }}

        .cover h1 {{
            font-size: 28pt;
            border-bottom: none;
            color: {COLORS['brand']};
        }}

        .cover .subtitle {{
            font-size: 14pt;
            color: {COLORS['navy']};
            margin-top: 8pt;
        }}

        .cover .date {{
            font-size: 10pt;
            color: #777;
            margin-top: 20pt;
        }}

        .info-box {{
            background: {COLORS['blue_light']};
            border: 1px solid {COLORS['blue_border']};
            border-left: 4px solid {COLORS['navy']};
            padding: 6pt 10pt;
            margin: 8pt 0;
            font-size: 8.5pt;
        }}

        .tip-box {{
            background: {COLORS['green_light']};
            border: 1px solid {COLORS['green_border']};
            border-left: 4px solid {COLORS['green_text']};
            padding: 6pt 10pt;
            margin: 8pt 0;
            font-size: 8.5pt;
        }}

        .tip-box b {{
            color: {COLORS['green_text']};
        }}

        .warn-box {{
            background: {COLORS['gold_light']};
            border: 1px solid {COLORS['gold_border']};
            border-left: 4px solid {COLORS['gold_border']};
            padding: 6pt 10pt;
            margin: 8pt 0;
            font-size: 8.5pt;
        }}

        .warn-box b {{
            color: {COLORS['gold_text']};
        }}

        .critical-box {{
            background: {COLORS['red_light']};
            border: 1px solid {COLORS['red_border']};
            border-left: 4px solid {COLORS['brand']};
            padding: 6pt 10pt;
            margin: 8pt 0;
            font-size: 8.5pt;
        }}

        .critical-box b {{
            color: {COLORS['brand']};
        }}

        .step {{
            background: {COLORS['cream']};
            border-left: 3px solid {COLORS['gold_border']};
            padding: 5pt 8pt;
            margin: 6pt 0;
            break-inside: avoid;
        }}

        .step .step-num {{
            font-weight: bold;
            color: {COLORS['gold_text']};
            font-size: 9pt;
        }}

        .status-badge {{
            display: inline-block;
            padding: 1pt 6pt;
            border-radius: 8pt;
            font-size: 7.5pt;
            font-weight: bold;
        }}

        .badge-scheduled {{ background: #dbeafe; color: #1e40af; }}
        .badge-live {{ background: #dcfce7; color: #166534; }}
        .badge-sold-out {{ background: #fef2f2; color: #991b1b; }}
        .badge-closed {{ background: #f3f4f6; color: #374151; }}
        .badge-pending {{ background: #fef9c3; color: #854d0e; }}
        .badge-confirmed {{ background: #dbeafe; color: #1e40af; }}
        .badge-fulfilled {{ background: #dcfce7; color: #166534; }}

        ul {{
            margin: 2pt 0 6pt 0;
            padding-left: 16pt;
        }}

        li {{
            margin-bottom: 3pt;
        }}

        table {{
            border-collapse: collapse;
            width: 100%;
            margin: 6pt 0;
            font-size: 8.5pt;
        }}

        th {{
            background: {COLORS['navy']};
            color: white;
            padding: 4pt 8pt;
            text-align: left;
            font-size: 8pt;
        }}

        td {{
            padding: 4pt 8pt;
            border-bottom: 1px solid {COLORS['gray_border']};
        }}

        tr:nth-child(even) td {{
            background: {COLORS['gray_light']};
        }}

        .page-break {{
            page-break-before: always;
        }}

        .two-col {{
            column-count: 2;
            column-gap: 16pt;
        }}

        .toc a {{
            color: {COLORS['navy']};
            text-decoration: none;
        }}

        .toc ul {{
            list-style: none;
            padding-left: 0;
        }}

        .toc li {{
            padding: 3pt 0;
            border-bottom: 1px dotted {COLORS['gray_border']};
        }}

        .footer {{
            font-size: 7pt;
            color: #777;
            text-align: center;
            margin-top: 10pt;
            padding-top: 4pt;
            border-top: 1px solid #ddd;
        }}

        b {{ color: {COLORS['navy']}; }}

        img {{
            max-width: 100%;
        }}

        .flow-arrow {{
            text-align: center;
            font-size: 16pt;
            color: {COLORS['brand']};
            margin: 4pt 0;
        }}
    """


def generate_html():
    date_str = datetime.now().strftime("%B %d, %Y")

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>{generate_css()}</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
    <h1>Odd Fellow Coffee Roasters</h1>
    <p class="subtitle">Website User Guide & Admin Manual</p>
    <p class="date">{date_str}</p>
    <p style="margin-top:40pt;color:#999;font-size:9pt;">oddfellowcoffee.com</p>
</div>

<!-- TABLE OF CONTENTS -->
<div class="page-break">
    <h1>Table of Contents</h1>
    <div class="toc">
        <ul>
            <li><a href="#overview">1. Site Overview</a></li>
            <li><a href="#customer-pages">2. Customer Pages</a></li>
            <li style="padding-left:16pt;"><a href="#homepage">2.1 Homepage</a></li>
            <li style="padding-left:16pt;"><a href="#shop">2.2 Shop</a></li>
            <li style="padding-left:16pt;"><a href="#drops-customer">2.3 Drops (Customer View)</a></li>
            <li style="padding-left:16pt;"><a href="#cart-checkout">2.4 Cart & Checkout</a></li>
            <li style="padding-left:16pt;"><a href="#subscriptions">2.5 Subscriptions</a></li>
            <li><a href="#admin-panel">3. Admin Panel</a></li>
            <li style="padding-left:16pt;"><a href="#admin-login">3.1 Login</a></li>
            <li style="padding-left:16pt;"><a href="#admin-dashboard">3.2 Dashboard</a></li>
            <li style="padding-left:16pt;"><a href="#admin-products">3.3 Managing Products</a></li>
            <li style="padding-left:16pt;"><a href="#admin-orders">3.4 Managing Orders</a></li>
            <li style="padding-left:16pt;"><a href="#admin-drops-section">3.5 Managing Drops</a></li>
            <li style="padding-left:16pt;"><a href="#admin-slots">3.6 Time Slots</a></li>
            <li style="padding-left:16pt;"><a href="#admin-subs">3.7 Subscriptions</a></li>
            <li><a href="#drops-workflow">4. Sourdough Drops Workflow (Detailed)</a></li>
            <li style="padding-left:16pt;"><a href="#drops-concept">4.1 What Are Drops?</a></li>
            <li style="padding-left:16pt;"><a href="#drops-lifecycle">4.2 Drop Lifecycle</a></li>
            <li style="padding-left:16pt;"><a href="#drops-create">4.3 Creating a Drop (Step-by-Step)</a></li>
            <li style="padding-left:16pt;"><a href="#drops-orders">4.4 When Customers Order</a></li>
            <li style="padding-left:16pt;"><a href="#drops-fulfill">4.5 Fulfilling Drop Orders</a></li>
            <li style="padding-left:16pt;"><a href="#drops-close">4.6 Closing a Drop</a></li>
            <li><a href="#reference">5. Quick Reference</a></li>
        </ul>
    </div>
</div>

<!-- 1. SITE OVERVIEW -->
<div class="page-break" id="overview">
    <h1>1. Site Overview</h1>
    <p>Odd Fellow Coffee Roasters is a SvelteKit e-commerce website for a specialty coffee and sourdough bakery in Oklahoma. The site supports three sales channels:</p>

    <div class="two-col">
        <div class="info-box">
            <b>Regular Shop</b><br/>
            Browse and purchase coffee, bread, and hot plate items for pickup. Always available.
        </div>
        <div class="info-box">
            <b>Sourdough Drops</b><br/>
            Limited-inventory bake day pre-orders. Opens on a schedule, sells out fast.
        </div>
        <div class="info-box">
            <b>Subscriptions</b><br/>
            Weekly, biweekly, or monthly recurring coffee deliveries billed through Stripe.
        </div>
        <div class="info-box">
            <b>Reservations</b><br/>
            Book a table time slot for dine-in experiences.
        </div>
    </div>

    <h3>How Payments Work</h3>
    <p>All payments are processed through <b>Stripe</b>. When a customer clicks "Add to Cart" and checks out, they are redirected to Stripe's secure checkout page. After payment, Stripe sends a webhook back to the site confirming the order. The admin never handles credit card information directly.</p>

    {img_tag('homepage.png', '100%')}
</div>

<!-- 2. CUSTOMER PAGES -->
<div class="page-break" id="customer-pages">
    <h1>2. Customer Pages</h1>

    <h2 id="homepage">2.1 Homepage</h2>
    <p>The homepage (<b>/</b>) features:</p>
    <ul>
        <li><b>Hero section</b> — Brand name, tagline, and product images</li>
        <li><b>About section</b> — Story of Caleb & Deborah, accessible via the "About" nav link</li>
        <li><b>Gallery</b> — Photos of products and the bakery</li>
        <li><b>Navigation</b> — Links to Shop, Drops, Reservations, Cart, and Contact (footer)</li>
    </ul>

    <h2 id="shop">2.2 Shop</h2>
    <p>The shop page (<b>/shop</b>) displays all active products in a card grid. Products are organized by category with filter buttons:</p>
    <ul>
        <li><b>All</b> — Shows everything</li>
        <li><b>Coffee</b> — House Blend, Dark Roast, Decaf Blend</li>
        <li><b>Bakery</b> — Sourdough Loaf, etc.</li>
        <li><b>Hotplate</b> — Breakfast items</li>
    </ul>

    {img_tag('shop.png', '100%')}

    <p>Each product card shows the name, description, price, and variant selector (e.g., 8oz/16oz for coffee). Coffee products also have a <b>"Subscribe"</b> button for recurring orders.</p>

    <div class="tip-box">
        <b>Tip:</b> Only products marked as "active" in the admin panel appear in the shop. Deactivated products are hidden from customers.
    </div>

    <h2 id="drops-customer">2.3 Drops (Customer View)</h2>
    <p>The drops page (<b>/drops</b>) shows any currently active sourdough drops. When no drops are scheduled, customers see a friendly empty state:</p>

    {img_tag('drops-customer.png', '100%')}

    <p>When a drop is live, each item shows remaining inventory with an "Add to Cart" button. Items with 3 or fewer remaining show the count in red to create urgency. Sold-out items are grayed out.</p>

    <h2 id="cart-checkout">2.4 Cart & Checkout</h2>
    <p>The cart (<b>/cart</b>) uses browser localStorage to persist items between visits. Customers can adjust quantities or remove items. Clicking "Checkout" creates a Stripe checkout session and redirects to Stripe's payment page.</p>
    <ul>
        <li><b>/checkout/success</b> — Shown after successful payment</li>
        <li><b>/checkout/cancel</b> — Shown if customer cancels at Stripe</li>
    </ul>

    <div class="warn-box">
        <b>Important:</b> For drop items, inventory is atomically decremented when the Stripe checkout session is created (not when added to cart). If a customer abandons checkout, inventory is released when the Stripe session expires via the <code>checkout.session.expired</code> webhook.
    </div>

    <h2 id="subscriptions">2.5 Subscriptions</h2>
    <p>The subscriptions page (<b>/subscriptions</b>) allows existing subscribers to manage their recurring orders. Customers access it via an HMAC-signed email link (no password needed). They can view their active subscriptions and cancel if needed.</p>
</div>

<!-- 3. ADMIN PANEL -->
<div class="page-break" id="admin-panel">
    <h1>3. Admin Panel</h1>

    <h2 id="admin-login">3.1 Login</h2>
    <p>Navigate to <b>/admin</b> to access the admin panel. Enter your username and password.</p>

    {img_tag('admin-login.png', '100%')}

    <div class="critical-box">
        <b>Security:</b> The admin login has rate limiting (5 attempts per 15 minutes). After 5 failed attempts, the account is locked for 15 minutes. Sessions expire automatically, and cookies are scoped to <code>/admin</code> and <code>/api/admin</code> paths only.
    </div>

    <h2 id="admin-dashboard">3.2 Dashboard</h2>
    <p>After logging in, you see the dashboard with six sections:</p>

    {img_tag('admin-dashboard.png', '100%')}

    <table>
        <tr><th>Section</th><th>Path</th><th>What It Does</th></tr>
        <tr><td><b>Orders</b></td><td>/admin/orders</td><td>View all orders, update status (pending &rarr; confirmed &rarr; fulfilled), advance drop order stages</td></tr>
        <tr><td><b>Products</b></td><td>/admin/products</td><td>Add, edit, deactivate products. Set prices, categories, variants, subscribable flag</td></tr>
        <tr><td><b>Reservations</b></td><td>/admin/reservations</td><td>View all table reservations (read-only)</td></tr>
        <tr><td><b>Time Slots</b></td><td>/admin/slots</td><td>Add or remove available reservation time slots</td></tr>
        <tr><td><b>Subscriptions</b></td><td>/admin/subscriptions</td><td>View all active, canceled, and past-due subscriptions (read-only)</td></tr>
        <tr><td><b>Drops</b></td><td>/admin/drops</td><td>Create and close sourdough drops, track inventory</td></tr>
    </table>

    <h2 id="admin-products">3.3 Managing Products</h2>
    <p>The products page lists all products (active and inactive). Each product shows its name, category, price, and status.</p>

    {img_tag('admin-products.png', '100%')}

    <h3>Adding a New Product</h3>
    <ol>
        <li>Click <b>"+ New Product"</b></li>
        <li>Fill in: Name, Category, Description, Price (in cents, e.g., 1400 = $14.00)</li>
        <li>Optionally set Variants JSON, Image filename, and Subscribable checkbox</li>
        <li>Click <b>"Save"</b></li>
    </ol>

    <h3>Editing a Product</h3>
    <p>Click <b>"Edit"</b> next to any product. The same form appears pre-filled. Change what you need and save.</p>

    <h3>Deactivating a Product</h3>
    <p>Click <b>"Deactivate"</b> to hide a product from the shop. A confirmation dialog will ask you to confirm. Deactivated products show "(inactive)" in the admin list.</p>

    <div class="tip-box">
        <b>Tip:</b> Deactivating is not deleting. The product still exists in the database and can be reactivated by editing it and saving.
    </div>

    <h2 id="admin-orders">3.4 Managing Orders</h2>
    <p>The orders page shows all orders from newest to oldest. Each order displays the customer name/email, total, and creation date.</p>

    {img_tag('admin-orders.png', '90%')}

    <h3>Order Status Flow (Regular Orders)</h3>
    <div class="step">
        <span class="status-badge badge-pending">pending</span> &rarr;
        <span class="status-badge badge-confirmed">confirmed</span> &rarr;
        <span class="status-badge badge-fulfilled">fulfilled</span>
    </div>
    <p>Click <b>"Confirm"</b> to acknowledge an order, then <b>"Fulfill"</b> when it's been picked up or delivered.</p>

    <h3>Drop Order Stage Flow</h3>
    <p>Orders from drops have an additional stage tracker:</p>
    <div class="step">
        <span class="status-badge badge-confirmed">ordered</span> &rarr;
        <span class="status-badge badge-pending">baking</span> &rarr;
        <span class="status-badge badge-live">ready</span> &rarr;
        <span class="status-badge badge-closed">picked up</span>
    </div>
    <p>Click the <b>"&rarr; next stage"</b> button to advance each order through the workflow.</p>
</div>

<!-- 3.5 MANAGING DROPS (ADMIN) -->
<div class="page-break" id="admin-drops-section">
    <h2>3.5 Managing Drops</h2>
    <p>The drops admin page is where you create and manage bake day drops.</p>

    {img_tag('admin-drops.png', '100%')}

    <p>Each drop card shows:</p>
    <ul>
        <li><b>Title</b> and <b>date</b></li>
        <li><b>Status badge</b> — <span class="status-badge badge-scheduled">scheduled</span> <span class="status-badge badge-live">live</span> <span class="status-badge badge-sold-out">sold out</span> <span class="status-badge badge-closed">closed</span></li>
        <li><b>Item inventory</b> — "X/Y sold" for each product in the drop</li>
        <li><b>Close button</b> — Manually close a drop when finished</li>
    </ul>

    <h3>Creating a New Drop</h3>
    <p>Click <b>"New Drop"</b> to expand the creation form:</p>

    {img_tag('admin-drops-create.png', '100%')}

    <p>Details on each field and the full creation workflow are in <b>Section 4: Sourdough Drops Workflow</b>.</p>

    <h2 id="admin-slots">3.6 Time Slots</h2>
    <p>Time slots control when customers can book reservations. Click <b>"+ Add Slot"</b> and fill in:</p>
    <ul>
        <li><b>Day of week</b> — Sun through Sat</li>
        <li><b>Start / End time</b> — e.g., 07:00 to 08:00</li>
        <li><b>Capacity</b> — How many reservations per slot</li>
    </ul>
    <p>Click <b>"Remove"</b> (with confirmation) to delete a slot.</p>

    <h2 id="admin-subs">3.7 Subscriptions</h2>
    <p>The subscriptions page is read-only. It shows all subscriptions with:</p>
    <ul>
        <li>Product name and customer email</li>
        <li>Frequency (weekly / biweekly / monthly)</li>
        <li>Status badge (<span class="status-badge badge-live">active</span>, <span class="status-badge badge-sold-out">canceled</span>, <span class="status-badge badge-pending">past due</span>)</li>
        <li>Current period end date</li>
        <li>"Canceling" flag if the customer has scheduled a cancellation</li>
    </ul>

    <div class="info-box">
        <b>Note:</b> Subscription management (cancellation, plan changes) happens through Stripe. Customers can self-cancel via their HMAC-signed link at <b>/subscriptions</b>.
    </div>
</div>

<!-- 4. SOURDOUGH DROPS WORKFLOW -->
<div class="page-break" id="drops-workflow">
    <h1>4. Sourdough Drops Workflow</h1>

    <h2 id="drops-concept">4.1 What Are Drops?</h2>
    <p>A "drop" is a <b>limited-inventory bake day sale</b>. Think of it like a sneaker drop: you announce a date, open pre-orders for a limited time, customers grab what they want before it sells out, then you bake and they pick up.</p>

    <div class="info-box">
        <b>Example:</b> Every Monday, Deborah bakes 20 loaves of sourdough. On Sunday evening, you create a drop that opens at 6 PM. By Monday morning, 18 of the 20 loaves are claimed. You bake exactly what was ordered, and customers pick up Monday afternoon.
    </div>

    <h3>Why Drops Instead of Regular Shop Items?</h3>
    <ul>
        <li><b>Inventory control</b> — You set exactly how many are available. No overbaking, no waste.</li>
        <li><b>Urgency</b> — "Only 3 left!" drives customers to order quickly</li>
        <li><b>Scheduling</b> — Drops auto-open and close on your timeline</li>
        <li><b>Tracking</b> — Each order from a drop is linked to it, with stage tracking (ordered &rarr; baking &rarr; ready &rarr; picked up)</li>
    </ul>

    <h2 id="drops-lifecycle">4.2 Drop Lifecycle</h2>

    <div class="step">
        <span class="step-num">The Four Statuses of a Drop:</span>
    </div>

    <table>
        <tr><th>Status</th><th>What It Means</th><th>Customer Can Order?</th></tr>
        <tr>
            <td><span class="status-badge badge-scheduled">scheduled</span></td>
            <td>Drop has been created but hasn't opened yet. Customers see it listed but cannot buy.</td>
            <td>No</td>
        </tr>
        <tr>
            <td><span class="status-badge badge-live">live</span></td>
            <td>Drop is open for orders. The "Opens At" time has passed. Customers can add items to cart and checkout.</td>
            <td>Yes</td>
        </tr>
        <tr>
            <td><span class="status-badge badge-sold-out">sold out</span></td>
            <td>All items in the drop have sold out. Happens automatically when the last item is purchased.</td>
            <td>No</td>
        </tr>
        <tr>
            <td><span class="status-badge badge-closed">closed</span></td>
            <td>Drop is manually closed by admin. No more orders. This is final.</td>
            <td>No</td>
        </tr>
    </table>

    <div class="flow-arrow">
        scheduled &rarr; live &rarr; sold out / closed
    </div>

    <h2 id="drops-create">4.3 Creating a Drop (Step-by-Step)</h2>

    <div class="step">
        <span class="step-num">Step 1: Go to Admin &rarr; Drops</span><br/>
        Navigate to <b>/admin/drops</b> and click the <b>"New Drop"</b> button.
    </div>

    <div class="step">
        <span class="step-num">Step 2: Fill in the Drop Details</span><br/>
        <table>
            <tr><th>Field</th><th>Required?</th><th>Description</th></tr>
            <tr><td><b>Title</b></td><td>Yes</td><td>Name shown to customers, e.g., "Saturday Sourdough Bake"</td></tr>
            <tr><td><b>Drop Date</b></td><td>Yes</td><td>The actual date of the bake/sale, e.g., 2026-02-08</td></tr>
            <tr><td><b>Opens At</b></td><td>Yes</td><td>When customers can start ordering, e.g., Friday at 6 PM the day before</td></tr>
            <tr><td><b>Closes At</b></td><td>Optional</td><td>Auto-close time. If blank, stays open until sold out or manually closed.</td></tr>
            <tr><td><b>Pickup Start</b></td><td>Optional</td><td>When customers can pick up, e.g., Saturday 9 AM. Shown on customer page.</td></tr>
            <tr><td><b>Pickup End</b></td><td>Optional</td><td>End of pickup window, e.g., Saturday 12 PM</td></tr>
        </table>
    </div>

    <div class="step">
        <span class="step-num">Step 3: Add Items to the Drop</span><br/>
        <p>For each item in the drop:</p>
        <ol>
            <li>Select a <b>product</b> from the dropdown (these come from your product catalog)</li>
            <li>Set the <b>quantity available</b> (how many you'll bake)</li>
            <li>Optionally set a <b>$ override</b> price (if the drop price differs from the catalog price)</li>
            <li>Click <b>"+ Add item"</b> to add more products to the same drop</li>
        </ol>
    </div>

    <div class="step">
        <span class="step-num">Step 4: Click "Create Drop"</span><br/>
        The drop is created with status <span class="status-badge badge-scheduled">scheduled</span>. It will automatically become <span class="status-badge badge-live">live</span> when the "Opens At" time arrives.
    </div>

    <div class="warn-box">
        <b>Validation:</b> The form requires a title, drop date, opens-at time, and at least one item. You'll see an error toast if any of these are missing.
    </div>

    <h2 id="drops-orders">4.4 When Customers Order from a Drop</h2>

    <p>Here's what happens behind the scenes when a customer orders a drop item:</p>

    <div class="step">
        <span class="step-num">1. Customer adds item to cart</span><br/>
        The drop item is added to localStorage cart with the <code>dropId</code> and <code>dropItemId</code> attached. Inventory is NOT yet decremented.
    </div>

    <div class="step">
        <span class="step-num">2. Customer clicks "Checkout"</span><br/>
        The checkout API creates a Stripe session. At this moment, inventory is <b>atomically decremented</b> in the database. The <code>quantity_sold</code> on the drop item goes up by the order quantity.
    </div>

    <div class="step">
        <span class="step-num">3a. Customer completes payment</span><br/>
        Stripe sends a <code>checkout.session.completed</code> webhook. The order status is set to <b>"confirmed"</b> and the stage is set to <b>"ordered"</b>. A confirmation email is sent.
    </div>

    <div class="step">
        <span class="step-num">3b. Customer abandons checkout</span><br/>
        If the Stripe session expires (after ~24h), a <code>checkout.session.expired</code> webhook fires. The system <b>releases the inventory</b> back to the drop by decrementing <code>quantity_sold</code>.
    </div>

    <div class="critical-box">
        <b>Key Concept — Atomic Inventory:</b> Inventory is reserved at checkout creation, not at cart-add time. This means two customers can both add the last loaf to their cart, but only the first one to click "Checkout" gets it. The second customer will see a "sold out" error. Abandoned checkouts automatically release inventory.
    </div>

    <h2 id="drops-fulfill">4.5 Fulfilling Drop Orders</h2>

    <p>After customers have ordered and you've baked, use the <b>Orders</b> page to track each order through the fulfillment stages:</p>

    <div class="step">
        <span class="step-num">ordered</span> &mdash; Customer has paid. This is the initial stage.<br/>
        <span class="step-num">baking</span> &mdash; Click "&rarr; baking" when you start baking their order.<br/>
        <span class="step-num">ready</span> &mdash; Click "&rarr; ready" when it's done and waiting for pickup.<br/>
        <span class="step-num">picked up</span> &mdash; Click "&rarr; picked up" when the customer collects their order.
    </div>

    <p>Drop orders are identifiable in the orders list by the <span style="color:{COLORS['brand']};font-weight:bold;">(Drop #N)</span> tag next to the order number.</p>

    <h2 id="drops-close">4.6 Closing a Drop</h2>

    <p>When the bake day is over:</p>
    <ol>
        <li>Go to <b>/admin/drops</b></li>
        <li>Click <b>"Close"</b> next to the drop</li>
        <li>Confirm in the dialog</li>
    </ol>
    <p>The status changes to <span class="status-badge badge-closed">closed</span> and the drop disappears from the customer-facing page. This cannot be undone.</p>

    <div class="tip-box">
        <b>Tip:</b> You don't have to manually close a drop. If it sells out, it automatically shows as <span class="status-badge badge-sold-out">sold out</span>. But closing is good practice to keep the drops page clean for customers.
    </div>
</div>

<!-- 5. QUICK REFERENCE -->
<div class="page-break" id="reference">
    <h1>5. Quick Reference</h1>

    <h2>URL Reference</h2>
    <table>
        <tr><th>Page</th><th>URL</th><th>Who</th></tr>
        <tr><td>Homepage</td><td>/</td><td>Customer</td></tr>
        <tr><td>Shop</td><td>/shop</td><td>Customer</td></tr>
        <tr><td>Drops</td><td>/drops</td><td>Customer</td></tr>
        <tr><td>Cart</td><td>/cart</td><td>Customer</td></tr>
        <tr><td>Reservations</td><td>/reservations</td><td>Customer</td></tr>
        <tr><td>Subscriptions</td><td>/subscriptions</td><td>Customer</td></tr>
        <tr><td>Admin Login</td><td>/admin</td><td>Admin</td></tr>
        <tr><td>Orders</td><td>/admin/orders</td><td>Admin</td></tr>
        <tr><td>Products</td><td>/admin/products</td><td>Admin</td></tr>
        <tr><td>Reservations</td><td>/admin/reservations</td><td>Admin</td></tr>
        <tr><td>Time Slots</td><td>/admin/slots</td><td>Admin</td></tr>
        <tr><td>Subscriptions</td><td>/admin/subscriptions</td><td>Admin</td></tr>
        <tr><td>Drops</td><td>/admin/drops</td><td>Admin</td></tr>
    </table>

    <h2>Weekly Workflow Checklist</h2>
    <div class="step">
        <span class="step-num">Sunday Evening</span><br/>
        <ul>
            <li>Go to /admin/drops &rarr; "New Drop"</li>
            <li>Set title, Monday's date, opens-at (Sunday 6 PM), pickup window</li>
            <li>Add items: Sourdough Loaf x 20 (or whatever you're baking)</li>
            <li>Click "Create Drop"</li>
        </ul>
    </div>
    <div class="step">
        <span class="step-num">Sunday 6 PM</span><br/>
        Drop goes live automatically. Customers start ordering.
    </div>
    <div class="step">
        <span class="step-num">Monday Morning</span><br/>
        <ul>
            <li>Check /admin/orders for drop orders</li>
            <li>Advance stages: ordered &rarr; baking</li>
            <li>Bake what was ordered</li>
        </ul>
    </div>
    <div class="step">
        <span class="step-num">Monday Afternoon</span><br/>
        <ul>
            <li>Advance stages: baking &rarr; ready</li>
            <li>Customers pick up, advance to: picked up</li>
            <li>Close the drop when done</li>
        </ul>
    </div>

    <h2>Status Colors at a Glance</h2>
    <div class="two-col">
        <p><b>Order Status:</b><br/>
            <span class="status-badge badge-pending">pending</span> Payment not confirmed<br/>
            <span class="status-badge badge-confirmed">confirmed</span> Payment received<br/>
            <span class="status-badge badge-fulfilled">fulfilled</span> Order complete
        </p>
        <p><b>Drop Status:</b><br/>
            <span class="status-badge badge-scheduled">scheduled</span> Not yet open<br/>
            <span class="status-badge badge-live">live</span> Accepting orders<br/>
            <span class="status-badge badge-sold-out">sold out</span> All items claimed<br/>
            <span class="status-badge badge-closed">closed</span> Manually closed
        </p>
    </div>

    <div class="footer">
        Odd Fellow Coffee Roasters &mdash; User Guide &mdash; Generated {date_str} &mdash; oddfellowcoffee.com
    </div>
</div>

</body>
</html>
"""


if __name__ == "__main__":
    print(f"Generating user guide: {OUTPUT_FILE}")
    html_content = generate_html()
    HTML(string=html_content).write_pdf(str(OUTPUT_FILE))
    print(f"Done! PDF saved to: {OUTPUT_FILE}")
