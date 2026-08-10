# Cyber Safety Platform — Infrastructure Cost & Service Analysis

## Deployment Cost Classification

> **DEVELOPMENT & PROTOTYPE DEPLOYMENT COST CLASSIFICATION**
>
> **Zero-cost prototype/development deployment is possible using available free tiers.**
>
> Actual production operation may require paid infrastructure depending on traffic, availability requirements, storage, bandwidth, and external API usage.

---

## Free Tier vs. Production Scale Analysis

| Service / Layer | Free Tier Option | Free Tier Capabilities | Production Limitations & Paid Upgrade Considerations |
| :--- | :--- | :--- | :--- |
| **Express Node.js API** | Render / Railway / Fly.io Free Web Service | 750 free instance hours/mo, basic HTTP handling. | Render Free instances spin down (sleep) after 15 minutes of inactivity, introducing cold-start latency. Production-grade always-on workloads require paid instances ($7+/mo). |
| **MongoDB Database** | MongoDB Atlas M0 Shared Cluster | 512MB storage, automated TLS/SSL encryption, shared RAM. | Suitable for small development/POC workloads. Limited storage volume, no point-in-time recovery backups, shared CPU. Production scale requires M10+ dedicated clusters ($57+/mo). |
| **React Frontend** | Vercel / Netlify / Cloudflare Pages | 100GB bandwidth/mo, global CDN, automated SSL. | Sufficient for small to medium scale. High bandwidth or enterprise SSO features require paid team plans ($20+/mo). |
| **Google Web Risk** | GCP Free Allowance | 100,000 free Lookup API queries per month. | Usage beyond 100,000 queries per month is billable under GCP Web Risk pricing ($0.0005 per request). Optional signal; fallback operates if unconfigured. |
| **Reddit Search API** | Reddit Developer OAuth2 | 100 requests per minute free rate limit. | Adequate for context lookups. Commercial usage or higher query volumes require Reddit API enterprise licensing. Optional signal; fallback operates if unconfigured. |
| **Wikipedia API** | MediaWiki REST API | 100% free open public REST API. | Requires respectful rate limiting and user-agent identification. No direct cost. |

---

## Key Infrastructure Summary

1. **Development & Prototyping**: Can be operated at **$0 / month** using MongoDB Atlas M0, Render Free, and Vercel.
2. **Production-Grade Scale**: Scaled deployments requiring 99.9% uptime, zero cold starts, automated database backups, high query volumes, or custom domain SSL require paid cloud tiers.
3. **Core Application Decoupling**: The core platform operates independently of paid third-party threat APIs.
