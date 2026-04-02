# Motorcycle ERP, POS & Public Website

## Overview
A comprehensive multi-warehouse motorcycle dealership system with:
- **Public website** (`/`) — Bilingual (EN/AR) storefront with dynamic content from ERP
- **ERP admin** (`/admin/`) — Full-featured ERP & POS system

Built with React + Vite frontend, Express API backend, PostgreSQL + Drizzle ORM.

## Architecture
- **Public Website**: `artifacts/moto-website` - React + Vite (port 26117), bilingual EN/AR, RTL support
- **ERP Admin**: `artifacts/moto-erp` - React + Vite + TypeScript + Tailwind CSS + shadcn/ui (port 23231, base /admin/)
- **Backend**: `artifacts/api-server` - Express + TypeScript (port 8080)
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Routing**: Wouter (frontend), Express router (backend)
- **State**: React Query for server state, localStorage for auth

## Public Website Routes
- `/` — Home (hero, featured products, app download CTA)
- `/showroom` — Product grid (motorcycles + parts) with search & filters
- `/about` — About us with dynamic content from site settings
- `/contact` — Contact form (submits to `contactSubmissionsTable`)
- `/signin` — Admin login → redirects to `/admin/`

## Public API (no auth required)
- `GET /api/parts` — Parts list for website
- `GET /api/motorcycles` — Motorcycles list for website
- `GET /api/categories` — Parts categories
- `GET /api/motorcycle-brands` — Motorcycle brands
- `GET /api/motorcycle-categories` — Motorcycle categories
- `GET /api/site/settings` — Site settings (hero text, about, contact info)
- `POST /api/site/contact` — Contact form submission

## Auth
- JWT-based token auth (simple base64 encoding of userId:timestamp)
- Token stored in localStorage as `moto_erp_token`
- Default admin: `admin` / `admin123`
- Roles: `admin`, `storekeeper`, `technician`, `sales`

## Modules
1. **Dashboard** - KPIs + recharts analytics (revenue, inventory, service)
2. **Warehouses** - Multi-warehouse management with bin locations
3. **Categories** - Parts categories management with subcategory hierarchy view
4. **Subcategories** - Parts subcategories linked to categories (with category filter)
5. **Parts** - Parts inventory with SKU, stock levels, reorder points, and subcategory assignment
4. **Motorcycles** - New + pre-owned motorcycle inventory
5. **Vendors** - Supplier management
6. **Purchase Orders** - PO creation, confirmation workflow
7. **GRN** - Goods Received Notes with automatic stock increment
8. **Work Orders** - Service center job tracking with parts reservation
9. **POS** - Point of sale with cart, tax, and printable receipt
10. **Invoices** - Sales invoicing with line items
11. **Returns** - Invoice return processing
12. **Inspections** - Pre-owned motorcycle inspection reports
13. **Users** - User management (Admin only)
14. **Audit Log** - Full audit trail for all mutations

## RBAC
- **Admin**: Full access to all modules
- **Storekeeper**: Dashboard, Parts, Warehouses, Vendors, Purchase Orders, GRN
- **Technician**: Dashboard, Work Orders, Inspections
- **Sales**: Dashboard, Motorcycles, POS, Invoices, Returns

## API Endpoints
All under `/api/`:
- `POST /auth/login` → { user, token }
- `GET /auth/me`
- `GET/POST /users`, `GET/PUT/DELETE /users/:id`
- `GET/POST /warehouses`, `GET/PUT/DELETE /warehouses/:id`
- `GET/POST /warehouses/:id/bins`
- `GET/POST /parts`, `GET/PUT/DELETE /parts/:id`
- `GET/POST /motorcycles`, `GET/PUT/DELETE /motorcycles/:id`
- `GET/POST /vendors`, `GET/PUT/DELETE /vendors/:id`
- `GET/POST /purchase-orders`, `GET/PUT/DELETE /purchase-orders/:id`, `POST /purchase-orders/:id/confirm`
- `GET/POST /grn`, `GET /grn/:id`
- `GET/POST /work-orders`, `GET/PUT/DELETE /work-orders/:id`
- `GET/POST /invoices`, `GET/PUT /invoices/:id`
- `GET/POST /returns`, `GET /returns/:id`
- `GET/POST /inspections`, `GET/PUT/DELETE /inspections/:id`
- `GET /audit-logs`
- `GET /analytics/dashboard` - KPI summary
- `GET /analytics/sales?period=30d` - Sales trend
- `GET /analytics/inventory` - Parts + motorcycle breakdown
- `GET /analytics/service` - Work order status breakdown

## Database Schema (Drizzle)
Tables: users, warehouses, bins, parts, motorcycles, vendors, purchase_orders, purchase_order_lines, grn, grn_lines, work_orders, work_order_lines, invoices, invoice_lines, returns, inspections, audit_logs

## Seed Data
- 4 users (admin/store1/tech1/sales1)
- 2 warehouses, 12 bins
- 3 vendors, 7 parts, 6 motorcycles
- 1 PO (PO-0001), 2 work orders, 1 invoice (INV-0001)

## Workflows
- `artifacts/api-server: API Server` - Backend Express (port 8080)
- `artifacts/moto-erp: web` - React Vite frontend (port 23231)
- Vite proxies `/api` → port 8080

## Currency Format
Malaysian Ringgit (RM X,XXX.XX)

## Business Rules & Guardrails
- **Negative stock prevention**: Invoice creation checks stock availability; returns 422 "Insufficient Stock" if quantity would go negative (checked transactionally)
- **Work-order status transitions**: Enforced via allowlist
  - `draft` → `parts_reserved | cancelled`
  - `parts_reserved` → `ready_for_invoice | draft | cancelled`
  - `ready_for_invoice` → `invoiced | parts_reserved | cancelled`
  - `invoiced` → (final, no transitions)
  - `cancelled` → (final, no transitions)
  - Invalid transitions return 422 with descriptive message
- **Document numbers**: DB-backed via `document_sequences` table, prefix PO/GRN/WO/INV/RET, zero-padded 4 digits

## Additional Features
- **Dashboard widgets**: Low Stock Alerts, Stale Work Orders, Top Selling Parts
- **Settings page**: Account info, change password (PATCH /users/:id/password), theme toggle
- **Invoice QR code**: Print view with QRCodeSVG (qrcode.react)
- **Inspection form**: 6 condition dropdowns, image URLs input, print view with QR code
- **Audit logging**: Full trail for create/update/delete + PO confirm
- **P&L analytics**: Includes COGS calculation
