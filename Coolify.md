# Coolify Deployment Guide

This document provides step-by-step instructions for deploying the **Warehouse Asset, Tool, and Employee Management System** using **Coolify** (Self-hosted open source PaaS alternative to Heroku/Vercel).

---

## 1. Prerequisites

Before starting deployment:
1. Active **Coolify** instance (v4.0+) running on your server with Docker installed.
2. A **Supabase** project (cloud or self-hosted) with your database credentials.
3. Access to your GitHub / Git repository containing this codebase.

---

## 2. Supabase Setup & Database Migration

1. Connect to your Supabase PostgreSQL database using your preferred SQL client or Supabase Query Editor.
2. Run the SQL script from `supabase/migrations/01_init.sql` to create all 15 tables, indexes, triggers, and functions.
3. Run `supabase/rls_policies.sql` to enforce Row Level Security.
4. Create the following Supabase Storage Buckets in your Supabase Dashboard -> Storage:
   - `asset-documents` (Public / Authenticated)
   - `service-documents` (Authenticated)
   - `calibration-certificates` (Public / Authenticated)
   - `inventory-documents` (Authenticated)

---

## 3. Coolify Application Deployment Steps

### Step 1: Create a New Resource in Coolify
1. Open your Coolify Dashboard.
2. Navigate to **Projects** -> Select your Project -> Select Environment (e.g., `production`).
3. Click **+ Add New Resource**.
4. Choose **Public / Private Repository (GitHub/GitLab/Bitbucket)**.

### Step 2: Configure Repository & Build Settings
1. Select your repository: `warehouse-asset-management`.
2. Set the **Branch**: `main`.
3. Set **Build Pack**: Select **Dockerfile**.
4. Specify **Dockerfile location**: `/Dockerfile`.
5. Set **Exposed Port**: `80`.

### Step 3: Configure Environment Variables
In the **Environment Variables** tab of your application in Coolify, add the variables from `.env.example`:

```env
VITE_SUPABASE_URL=https://your-supabase-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
DATABASE_URL=postgresql://postgres:password@db.your-supabase-id.supabase.co:5432/postgres
JWT_SECRET=your-production-jwt-secret-key
```

### Step 4: Deploy & Domain Setup
1. In the **General** tab, set your custom domain (e.g., `https://warehouse.yourcompany.com`).
2. Turn on **Generate SSL Certificate (Let's Encrypt)**.
3. Click **Deploy**.

---

## 4. Automatic CI/CD with GitHub Actions

To enable automatic deployment upon pushing to `main`, add your Coolify Deploy Webhook URL to GitHub Secrets:
1. In Coolify, go to Application settings -> **Webhooks** -> copy the **Deploy Webhook URL**.
2. In GitHub, go to Repository Settings -> **Secrets and variables** -> **Actions** -> Add `COOLIFY_WEBHOOK`.
3. The workflow file at `.github/workflows/coolify-deploy.yml` will automatically trigger builds on Coolify.

---

## 5. Verification & Health Monitoring

Coolify monitors container health via the healthcheck defined in `docker-compose.yml`:
- Health endpoint: `http://localhost:80/`
- Interval: Every 30 seconds.
- Logs can be inspected directly under **Coolify -> Application -> Logs**.
