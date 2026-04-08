# Deployment Guide: NGO Impact Platform on Render

This project is a monorepo containing multiple services. The most efficient way to deploy it to Render is using a **Blueprint (render.yaml)** file, which I have created for you in the root directory.

## Prerequisites

1.  **GitHub Repository**: Ensure your code is pushed to a GitHub repository.
2.  **External Services**:
    *   **Supabase**: Have your `DATABASE_URL` and `DIRECT_URL` ready (if not using Render's built-in Postgres).
    *   **Upstash/Redis**: Have your `REDIS_URL` ready.
    *   **Google Cloud/Gemini**: Have your `GEMINI_API_KEY` and project details ready.

---

## Step 1: Prepare your Code

I have added a `render.yaml` file to your project root. This file tells Render how to build and run all 4 services:
1.  **api-server**: The Fastify backend.
2.  **donor-portal**: The Next.js frontend for donors.
3.  **web-admin**: The Next.js frontend for admins.
4.  **queue-worker**: The background job processors.

Make sure to **commit and push** this file to your GitHub repository before proceeding.

---

## Step 2: Create a Blueprint on Render

1.  Log in to your [Render Dashboard](https://dashboard.render.com/).
2.  Click the **"New +"** button and select **"Blueprint"**.
3.  Connect your GitHub account and select your repository (`NGO-Project`).
4.  Render will automatically detect the `render.yaml` file.
5.  Give your Blueprint a name (e.g., `ngo-impact-platform`).
6.  Click **"Apply"**.

---

## Step 3: Configure Environment Variables

During the Blueprint application, Render will ask you for values for the environment variable groups. You should also verify these in the individual service settings after the initial setup attempt:

### Common Variables (Apply to all services)
| Key | Example/Source |
| :--- | :--- |
| `NODE_VERSION` | `20.11.0` (Recommended) |
| `DATABASE_URL` | Your Supabase connection string |
| `REDIS_URL` | Your Upstash/Redis connection string |
| `JWT_SECRET` | A long random string (64+ chars) |
| `GEMINI_API_KEY` | Your Google AI API key |
| `GCP_PROJECT` | Your GCP project ID |

### Important Build Commands
The Blueprint is configured to use `pnpm`. Render supports `pnpm` automatically if it's listed in your `package.json`.

*   **API Build**: `pnpm install && pnpm --filter @ngo/api-server build`
*   **Donor Build**: `pnpm install && pnpm --filter donor-portal build`
*   **Admin Build**: `pnpm install && pnpm --filter web-admin build`
*   **Worker Build**: `pnpm install && pnpm --filter @ngo/queue build`

---

## Step 4: Handle Prisma Migrations

Since your project uses Prisma, you need to ensure the database schema is generated. The build commands in the Blueprint include `pnpm install`, which should trigger the `postinstall` scripts to run `prisma generate`.

If you need to run migrations, you can add a script to the `api-server` build command:
`pnpm install && pnpm --filter @ngo/database prisma migrate deploy && pnpm --filter @ngo/api-server build`

---

## Step 5: Update Frontend URLs

Once the `api-server` is deployed, it will have a URL like `https://api-server.onrender.com`.
1.  In the Render Dashboard, go to **donor-portal** and **web-admin**.
2.  Update the `NEXT_PUBLIC_API_URL` environment variable to point to your deployed API URL.
3.  Trigger a new deploy for the frontends so they pick up the correct API URL.

---

## Troubleshooting

-   **Memory Issues**: If the Next.js build fails, you might need to upgrade from the "Free" plan to a "Starter" plan, as Next.js builds are memory-intensive.
-   **pnpm Versions**: If you see errors about `pnpm`, set the `PNPM_VERSION` environment variable to `10.7.0` (as specified in your root `package.json`).
-   **CORS**: Ensure that the `ALLOWED_ORIGINS` in your `api-server` environment variables include your Render frontend URLs (e.g., `https://donor-portal.onrender.com`).
