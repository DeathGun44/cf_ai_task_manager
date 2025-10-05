# Deployment Guide - AI Task Manager

## 🚀 Quick Deployment Steps

### 1. Prerequisites
- Cloudflare account with Workers AI enabled
- Node.js 18+ installed
- Git installed

### 2. Initial Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-task-manager

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login
```

### 3. Configure Cloudflare Services

```bash
# Create Vectorize index for semantic search
npx wrangler vectorize create task-memory-index --dimensions=1024 --metric=cosine

# Create KV namespace for additional storage
npx wrangler kv:namespace create TASK_STORE
npx wrangler kv:namespace create TASK_STORE --preview
```

### 4. Update Configuration

After creating the services, update `wrangler.toml` with the actual IDs:

```toml
# Replace these placeholder IDs with your actual IDs
[[kv_namespaces]]
binding = "TASK_STORE"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"

[[vectorize]]
binding = "TASK_MEMORY"
index_name = "task-memory-index"
```

### 5. Deploy

```bash
# Deploy the Worker
npm run deploy

# Deploy the frontend (optional)
npm run pages:deploy
```

## 🔧 Configuration Details

### Required Cloudflare Services

1. **Workers AI** - Already enabled by default
2. **Durable Objects** - Automatically configured
3. **Vectorize** - For semantic search and memory
4. **KV Storage** - For additional data storage

### Environment Variables

Set these in your Cloudflare dashboard or via Wrangler:

```bash
# Optional: For enhanced voice features
wrangler secret put DEEPGRAM_API_KEY    # Speech-to-text
wrangler secret put ELEVENLABS_API_KEY  # Text-to-speech
```

### Custom Domain (Optional)

```bash
# Add a custom domain
wrangler route add "yourdomain.com/*" ai-task-manager
```

## 📊 Service Configuration

### Vectorize Index Setup
```bash
# Create the index
npx wrangler vectorize create task-memory-index --dimensions=1024 --metric=cosine

# Verify the index was created
npx wrangler vectorize list
```

### KV Namespace Setup
```bash
# Create production namespace
npx wrangler kv:namespace create TASK_STORE

# Create preview namespace
npx wrangler kv:namespace create TASK_STORE --preview

# List namespaces to get IDs
npx wrangler kv:namespace list
```

## 🧪 Testing Deployment

### 1. Health Check
```bash
curl https://your-worker.your-subdomain.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-05T12:00:00.000Z"
}
```

### 2. Chat API Test
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, create a test task"}'
```

### 3. Tasks API Test
```bash
curl https://your-worker.your-subdomain.workers.dev/tasks
```

## 🔍 Troubleshooting

### Common Issues

1. **"AI binding not found"**
   - Ensure Workers AI is enabled in your Cloudflare account
   - Check that the binding is correctly configured in wrangler.toml

2. **"Durable Object not found"**
   - Verify the class name matches in both agent.js and wrangler.toml
   - Ensure migrations are properly configured

3. **"Vectorize index not found"**
   - Check that the index name matches exactly
   - Verify the index was created successfully

4. **"KV namespace not found"**
   - Ensure the namespace IDs are correct in wrangler.toml
   - Check that both production and preview namespaces exist

### Debug Commands

```bash
# Check Worker logs
npx wrangler tail

# Test locally
npm run dev

# Verify configuration
npx wrangler whoami
```

## 📈 Performance Optimization

### Production Settings

1. **Enable Analytics**
   ```toml
   [analytics_engine_datasets]
   binding = "ANALYTICS"
   dataset = "ai_task_manager_analytics"
   ```

2. **Configure Caching**
   ```javascript
   // Add to your Worker
   const cache = caches.default;
   ```

3. **Optimize AI Calls**
   - Use appropriate model sizes for different tasks
   - Implement request caching where possible
   - Monitor usage and costs

## 🔐 Security Considerations

### API Security
- Implement rate limiting for production use
- Add authentication if needed
- Validate all input data

### Data Privacy
- Review data retention policies
- Implement data encryption for sensitive information
- Consider GDPR compliance for EU users

## 📊 Monitoring

### Cloudflare Analytics
- Monitor Worker invocations
- Track AI model usage
- Monitor error rates

### Custom Metrics
```javascript
// Add custom metrics to your Worker
env.ANALYTICS.writeDataPoint({
  'blobs': ['task_created'],
  'doubles': [1],
  'indexes': ['user_id']
});
```

## 🚀 Scaling

### Automatic Scaling
- Workers automatically scale with traffic
- Durable Objects scale per user session
- Vectorize handles large datasets efficiently

### Cost Optimization
- Monitor AI model usage
- Use appropriate model sizes
- Implement caching strategies

## 📝 Post-Deployment Checklist

- [ ] Health check endpoint responding
- [ ] Chat API working
- [ ] Tasks API functional
- [ ] WebSocket connections working
- [ ] Voice input operational (if configured)
- [ ] Database tables created
- [ ] Vectorize index populated
- [ ] Analytics configured
- [ ] Error monitoring set up
- [ ] Performance metrics tracked

## 🔄 Updates and Maintenance

### Regular Updates
```bash
# Update dependencies
npm update

# Redeploy with updates
npm run deploy
```

### Database Maintenance
- Monitor database size
- Clean up old conversations periodically
- Optimize queries as needed

### Model Updates
- Stay updated with latest Llama models
- Test new models before production deployment
- Monitor performance improvements

---

**Your AI Task Manager is now ready for production use! 🎉**
