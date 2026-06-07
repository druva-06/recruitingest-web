# RecruitIngest Web

Responsive React client for uploading recruiter PDFs and monitoring ingestion progress.

## Development

```bash
npm install
npm run dev
```

The Vite development server proxies `/api` requests to `http://localhost:8080`.

## Production configuration

Set `VITE_API_BASE_URL` to the backend API prefix before building:

```bash
VITE_API_BASE_URL=https://api.example.com/api/v1 npm run build
```
