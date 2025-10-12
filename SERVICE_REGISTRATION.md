# Service Registration Guide for mech-llms

This guide explains how to register mech-llms with the mech-compute service registry for service discovery and health monitoring.

## Why Register a Service?

The service registry enables:
- **Service Discovery**: Other services can find mech-llms by name
- **Health Monitoring**: Automatic health checks and status tracking
- **Load Balancing**: Route traffic to healthy instances
- **Environment Isolation**: Separate prod/staging/dev registrations

## Registration Methods

### Method 1: Automatic Registration via Deployment

The **recommended** approach is to deploy using mech-compute, which automatically registers the service:

```bash
# Deploy mech-llms using mech-compute API
curl -X POST http://localhost:3013/api/v2/services/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "mech-llms",
    "serviceConfig": "../../service-configs/mech-llms.yaml",
    "environmentConfig": {
      "OPENAI_API_KEY": "sk-...",
      "ANTHROPIC_API_KEY": "sk-ant-...",
      "GOOGLE_API_KEY": "AIza...",
      "TOGETHER_API_KEY": "...",
      "MONGODB_URI": "mongodb+srv://...",
      "REDIS_URL": "redis://..."
    },
    "vmConfig": {
      "provider": "digitalocean",
      "region": "nyc1",
      "size": "s-1vcpu-1gb"
    }
  }'
```

The deployment process will:
1. Create/configure the VM
2. Deploy the Docker container
3. Configure Nginx with SSL
4. **Automatically register the service in the registry**
5. Start health monitoring

### Method 2: Manual Registration Script

If you've already deployed mech-llms manually, use the registration script:

```bash
# From mech-llms directory
./register-service.sh

# Or with custom settings
VM_IP="174.138.68.108" \
EXTERNAL_DOMAIN="llm.mechdna.net" \
ENVIRONMENT="production" \
./register-service.sh
```

### Method 3: Direct API Call

Register directly via the service registry API:

```bash
curl -X POST http://localhost:3013/api/v2/services/registry/register \
  -H "Content-Type: application/json" \
  -H "X-Registry-Token: your-registry-token" \
  -d '{
    "serviceName": "mech-llms",
    "serviceId": "mech-llms-prod-$(date +%s)",
    "vmIp": "174.138.68.108",
    "internalPort": 3008,
    "externalDomain": "llm.mechdna.net",
    "version": "1.2.0",
    "deploymentId": "manual-registration",
    "environment": "production",
    "region": "nyc1",
    "capabilities": [
      "llm",
      "openai",
      "anthropic",
      "google",
      "together",
      "streaming",
      "function-calling",
      "multimodal"
    ],
    "healthCheckEndpoint": "/health",
    "metadata": {
      "providers": ["openai", "anthropic", "google", "together"],
      "features": ["thinking", "caching", "grounding", "structured-outputs"],
      "openapi": "https://llm.mechdna.net/v1/docs"
    },
    "requiredEnvironmentVars": [
      {
        "name": "OPENAI_API_KEY",
        "type": "secret",
        "required": true
      },
      {
        "name": "ANTHROPIC_API_KEY",
        "type": "secret",
        "required": true
      }
    ]
  }'
```

## Verify Registration

### Check if Service is Registered

```bash
# List all registered services
curl http://localhost:3013/api/v2/services/registry/services

# Check specific service by name
curl http://localhost:3013/api/v2/services/registry/discover/mech-llms?environment=production

# Get service details by ID
curl http://localhost:3013/api/v2/services/registry/services/mech-llms-prod-123456
```

### Service Discovery

Other services can discover mech-llms using:

```bash
# Discover healthy instance
curl http://localhost:3013/api/v2/services/registry/discover/mech-llms

# Response format:
{
  "success": true,
  "service": {
    "serviceName": "mech-llms",
    "serviceId": "mech-llms-prod-123456",
    "internalUrl": "http://174.138.68.108:3008",
    "externalUrl": "https://llm.mechdna.net",
    "status": "healthy",
    "version": "1.2.0",
    "capabilities": ["llm", "streaming", "multimodal"],
    "lastSeen": "2025-01-15T10:30:00Z"
  }
}
```

## Health Monitoring

Once registered, the service participates in automated health monitoring:

### Heartbeat Updates

The service should send heartbeats to stay registered:

```bash
# From within mech-llms service
curl -X POST http://localhost:3013/api/v2/services/registry/mech-llms-prod-123456/heartbeat \
  -H "Content-Type: application/json" \
  -H "X-Registry-Token: your-token" \
  -d '{
    "metadata": {
      "requestsPerMinute": 45,
      "averageLatency": 250,
      "errorRate": 0.01
    }
  }'
```

### Health Status Updates

Update service health status:

```bash
# Mark as healthy
curl -X PUT http://localhost:3013/api/v2/services/registry/mech-llms-prod-123456/status \
  -H "Content-Type: application/json" \
  -H "X-Registry-Token: your-token" \
  -d '{"status": "healthy"}'

# Status options: healthy, degraded, unhealthy, offline
```

### Health Check Execution

The registry automatically performs health checks every 5 minutes:

```bash
# Manually trigger health checks (admin only)
curl -X POST http://localhost:3013/api/v2/services/registry/health-checks \
  -H "X-Admin-Token: admin-token"
```

## Service Registry Schema

### Required Fields

- `serviceName` (string): Service identifier (e.g., "mech-llms")
- `serviceId` (string): Unique instance ID (e.g., "mech-llms-prod-1736958000")
- `vmIp` (string): VM IP address (e.g., "174.138.68.108")
- `internalPort` (number): Internal service port (e.g., 3008)
- `externalDomain` (string): Public domain (e.g., "llm.mechdna.net")
- `version` (string): Service version (e.g., "1.2.0")
- `deploymentId` (string): Deployment identifier
- `environment` (string): "production" | "staging" | "development"
- `region` (string): Deployment region (e.g., "nyc1")

### Optional Fields

- `capabilities` (string[]): Service capabilities
- `healthCheckEndpoint` (string): Health check path (default: "/health")
- `metadata` (object): Additional service information
- `requiredEnvironmentVars` (array): Environment variable requirements

### URLs Generated Automatically

The registry automatically generates:
- `internalUrl`: `http://{vmIp}:{internalPort}`
- `externalUrl`: `https://{externalDomain}`

## Unregister a Service

```bash
# Remove from registry
curl -X DELETE http://localhost:3013/api/v2/services/registry/services/mech-llms-prod-123456 \
  -H "X-Registry-Token: your-token"
```

## Troubleshooting

### Service Not Appearing in Registry

1. Check if mech-compute is running:
   ```bash
   curl http://localhost:3013/health
   ```

2. Verify registration was successful:
   ```bash
   curl http://localhost:3013/api/v2/services/registry/services | jq '.services[] | select(.serviceName=="mech-llms")'
   ```

3. Check service health:
   ```bash
   curl https://llm.mechdna.net/health
   ```

### Service Shows as Unhealthy

1. Check last heartbeat time:
   ```bash
   curl http://localhost:3013/api/v2/services/registry/services/mech-llms-prod-123456
   ```

2. Verify health endpoint responds:
   ```bash
   curl http://174.138.68.108:3008/health
   ```

3. Update status manually:
   ```bash
   curl -X PUT http://localhost:3013/api/v2/services/registry/mech-llms-prod-123456/status \
     -H "Content-Type: application/json" \
     -d '{"status": "healthy"}'
   ```

### Service Discovery Fails

1. Check service status in registry
2. Verify environment filter matches
3. Ensure service is marked as "healthy" or "degraded"

## Integration with Other Services

Other mech services can discover and use mech-llms:

```typescript
// Example: mech-chat discovering mech-llms
import axios from 'axios';

const discoverService = async (serviceName: string) => {
  const response = await axios.get(
    `${MECH_COMPUTE_URL}/api/v2/services/registry/discover/${serviceName}`,
    {
      params: { environment: process.env.NODE_ENV }
    }
  );

  return response.data.service;
};

// Use discovered service
const llmService = await discoverService('mech-llms');
const llmUrl = llmService.externalUrl; // https://llm.mechdna.net

// Make LLM request
const completion = await axios.post(
  `${llmUrl}/v1/chat/completions`,
  {
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }]
  }
);
```

## Environment Variables for Registration

Set these in your deployment environment:

```bash
# Service Registry Settings
export SERVICE_REGISTRY_URL=http://localhost:3013
export SERVICE_REGISTRY_TOKEN=your-registry-token

# Service Information
export VM_IP=174.138.68.108
export EXTERNAL_DOMAIN=llm.mechdna.net
export SERVICE_ENVIRONMENT=production
export SERVICE_REGION=nyc1
```

## Next Steps

1. Register mech-llms using one of the methods above
2. Verify registration with discovery endpoint
3. Configure other services to use service discovery
4. Monitor service health in mech-compute dashboard
5. Set up automated heartbeat from mech-llms service
