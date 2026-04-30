# Product Overview

## Product Name
[TBD — working name: PropIQ / NovaProp / Estatelytics]

## One-Line Description
The AI-powered operations platform for real estate businesses —
connecting your data, automating your workflows, and letting you
query your entire business in plain language.

## What It Is Not
- Not a listings platform
- Not a CRM replacement
- Not another property management tool
- Not a chatbot

## What It Is
A unified intelligence layer for real estate businesses that:
1. Connects all fragmented data sources into one Supabase backend
2. Automates operational workflows via n8n
3. Makes all documents and data queryable via RAG (documents + Excel)
4. Surfaces real-time alerts, dashboards, and insights
5. Handles lead qualification, lease tracking, maintenance, invoices

## Target Users
- Property managers (managing 20–500 units)
- Real estate agencies (5–100 agents)
- Property investment companies (managing portfolios)
- Individual landlords (owning 5+ properties)

## Core Differentiator
Every existing tool forces you to work inside their system.
This platform works with your existing tools and makes them intelligent.
You own the data. You own the system. No lock-in.

## Tech Stack
- Frontend: Built on Antigravity
- Backend: Supabase (PostgreSQL + Storage + Auth)
- Automation: n8n (self-hosted or cloud)
- RAG — Documents: LlamaParse → Gemini Embeddings → Qdrant (Hybrid Search)
- RAG — Excel/Tables: Custom pipeline → Qdrant (Hybrid Search)
- Notifications: WhatsApp Business API + Email (SMTP/SendGrid)
- Subscription: Stripe

## Pricing Tiers
- Starter: Up to 50 units — $49/month
- Growth: Up to 200 units — $149/month
- Agency: Up to 500 units — $349/month
- Enterprise: 500+ units — Custom