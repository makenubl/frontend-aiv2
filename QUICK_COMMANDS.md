# Quick Commands - PVARA Storage System

## Deployment Status
- **Production Frontend**: https://pvara.team (frontend-aiv2)
- **Frontend Staging**: https://frontend-aiv2i.vercel.app
- **Backend API**: https://backend-aiv2.vercel.app

## Local Development

### Frontend
```bash
cd /Users/ubl/Desktop/PVARA-Frontend
npm install
npm start                    # Dev server on localhost:3000
npm run build                # Production build
npm test                     # Run tests
```

### Backend
```bash
cd /Users/ubl/Desktop/PVARA-Backend
npm install
npm run dev                  # Dev server on localhost:3001
npm run build                # TypeScript compile
npm start                    # Production server
```

## Git Workflow

### Frontend (frontend-aiv2)
```bash
cd /Users/ubl/Desktop/PVARA-Frontend
git status
git add .
git commit -m "feat: your message"
git push origin main         # Auto-deploys to Vercel
```

### Backend (backend-aiv2)
```bash
cd /Users/ubl/Desktop/PVARA-Backend
git status
git add .
git commit -m "feat: your message"
git push origin main         # Auto-deploys to Vercel
```

## Latest Commits
- **Frontend**: 03cc9051 - Production StorageManager with delete, modals, toasts
- **Backend**: e7606a8 - Storage features with rate-limit, email, chat

## Feature Testing Checklist

### Storage UI (StorageManager.tsx)
- [ ] Create folder (valid name: letters, numbers, _, -)
- [ ] Delete folder (confirmation modal + toast)
- [ ] Upload files (max 50MB/file, 20 files total)
- [ ] File type validation (PDF, DOCX, TXT, JPG, PNG, XLSX, CSV)
- [ ] Delete file (per-entry with confirmation)
- [ ] View recommendations trail
- [ ] Select/accept pending recommendations
- [ ] Empty states (no folders, no files)
- [ ] Loading spinners during operations
- [ ] Permission controls (canDelete flag)

### API Endpoints (Backend)
```bash
# Test folder operations
curl -X POST https://backend-aiv2.vercel.app/api/storage/folders \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-12345" \
  -d '{"name":"test-folder"}'

curl https://backend-aiv2.vercel.app/api/storage/folders \
  -H "x-api-key: dev-key-12345"

curl -X DELETE https://backend-aiv2.vercel.app/api/storage/folders \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-12345" \
  -d '{"folder":"test-folder","requesterEmail":"user@example.com"}'
```

## Edge Cases to Verify
- [ ] Upload >50MB file (should reject)
- [ ] Upload >20 files (should reject)
- [ ] Upload unsupported file type (should reject)
- [ ] Delete folder with active files
- [ ] Network failure handling (API errors)
- [ ] Null/empty states gracefully handled
- [ ] Permission denied scenarios

## Troubleshooting

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Vercel Deploy Stuck
- Check https://vercel.com/dashboard for build logs
- Manually trigger redeploy if needed
- Verify GitHub webhook is active

### API Errors
- Check x-api-key header is set
- Verify CORS headers in middleware
- Check rate limits (5 auth/15min, 10 upload/min, 100 API/15min)

## Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=https://backend-aiv2.vercel.app/api
REACT_APP_API_KEY=your-api-key
```

### Backend (.env)
```
MONGODB_URI=your-mongodb-connection-string
EMAIL_USER=your-smtp-email
EMAIL_PASS=your-smtp-password
OPENAI_API_KEY=your-openai-key
```

## Quick Fixes

### Rebuild Both Repos
```bash
cd /Users/ubl/Desktop/PVARA-Frontend && npm run build && git push origin main
cd /Users/ubl/Desktop/PVARA-Backend && npm run build && git push origin main
```

### Check Deployment Status
```bash
# Frontend
curl -I https://pvara.team

# Backend
curl https://backend-aiv2.vercel.app/api/health
```
