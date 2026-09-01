# Phase 4 — Product Discovery, Recommendations Input, Cart & Commerce Core

## Goal
Create a trustworthy commerce foundation for the AI agent.

## Part 1 — Product catalog

Customer capabilities:
- Browse products.
- Search products.
- Filter by category.
- View product details.
- See price and stock status.

Merchant capabilities:
- View products.
- Basic enable/disable status.
- Review catalog.

## Part 2 — Server-side search

Search should query actual database fields.

The AI must not invent:
- product names;
- prices;
- inventory;
- product specifications.

## Part 3 — Cart

Customer can:
- Add item.
- Remove item.
- Change quantity.
- View subtotal.
- View final estimated total.

Server recalculates prices from the database.

## Part 4 — Cart validation

Before checkout:
- product exists;
- product is active;
- quantity is valid;
- sufficient stock exists;
- price is read from server;
- cart belongs to current customer/session.

## Part 5 — Growth primitives

Implement simple growth actions:
- complementary product suggestion;
- bundle suggestion;
- threshold-based recommendation.

Example:
If laptop is selected:
→ recommend mouse/headset/monitor.

Growth rules should be configurable enough for demo purposes but remain deterministic.

## Part 6 — Completion demo

A user should be able to:
1. search;
2. open product;
3. add to cart;
4. modify cart;
5. receive a growth suggestion;
6. accept/reject suggestion;
7. proceed to checkout.
