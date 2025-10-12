#!/bin/bash

# Register mech-llms service with mech-compute service registry
# This script registers an already-deployed service

SERVICE_NAME="mech-llms"
SERVICE_ID="${SERVICE_NAME}-prod-$(date +%s)"
VM_IP="${VM_IP:-174.138.68.108}"  # Your production VM IP
INTERNAL_PORT="3008"
EXTERNAL_DOMAIN="${EXTERNAL_DOMAIN:-llm.mechdna.net}"
VERSION="1.2.0"
ENVIRONMENT="${ENVIRONMENT:-production}"
REGION="${REGION:-nyc1}"
MECH_COMPUTE_URL="${MECH_COMPUTE_URL:-http://localhost:3013}"

# Service registry endpoint (using manual registration for simplicity)
REGISTRY_URL="${MECH_COMPUTE_URL}/api/v2/services/registry/register-manual"

echo "🔧 Registering ${SERVICE_NAME} service..."
echo "   VM IP: ${VM_IP}"
echo "   Domain: ${EXTERNAL_DOMAIN}"
echo "   Port: ${INTERNAL_PORT}"
echo "   Environment: ${ENVIRONMENT}"
echo ""

# Make the registration request (manual endpoint requires fewer fields)
RESPONSE=$(curl -s -X POST "${REGISTRY_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Registry-API-Key: ${REGISTRY_API_KEY:-}" \
  -d "{
    \"serviceName\": \"${SERVICE_NAME}\",
    \"vmIp\": \"${VM_IP}\",
    \"internalPort\": ${INTERNAL_PORT},
    \"externalDomain\": \"${EXTERNAL_DOMAIN}\",
    \"version\": \"${VERSION}\",
    \"environment\": \"${ENVIRONMENT}\",
    \"region\": \"${REGION}\",
    \"capabilities\": [
      \"llm\",
      \"openai\",
      \"anthropic\",
      \"google\",
      \"together\",
      \"streaming\",
      \"function-calling\",
      \"multimodal\"
    ],
    \"healthCheckEndpoint\": \"/health\",
    \"metadata\": {
      \"providers\": [\"openai\", \"anthropic\", \"google\", \"together\"],
      \"features\": [\"thinking\", \"caching\", \"grounding\", \"structured-outputs\"],
      \"openapi\": \"https://${EXTERNAL_DOMAIN}/v1/docs\",
      \"registeredBy\": \"manual-script\"
    },
    \"requiredEnvironmentVars\": [
      {
        \"name\": \"OPENAI_API_KEY\",
        \"description\": \"OpenAI API key\",
        \"type\": \"secret\",
        \"required\": true
      },
      {
        \"name\": \"ANTHROPIC_API_KEY\",
        \"description\": \"Anthropic API key\",
        \"type\": \"secret\",
        \"required\": true
      },
      {
        \"name\": \"GOOGLE_API_KEY\",
        \"description\": \"Google API key\",
        \"type\": \"secret\",
        \"required\": true
      },
      {
        \"name\": \"TOGETHER_API_KEY\",
        \"description\": \"Together AI API key\",
        \"type\": \"secret\",
        \"required\": true
      },
      {
        \"name\": \"MONGODB_URI\",
        \"description\": \"MongoDB connection string\",
        \"type\": \"secret\",
        \"required\": true
      },
      {
        \"name\": \"REDIS_URL\",
        \"description\": \"Redis connection URL\",
        \"type\": \"secret\",
        \"required\": true
      }
    ]
  }")

# Check response
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Service registered successfully!"
  echo ""
  echo "$RESPONSE" | jq '.'
else
  echo "❌ Registration failed!"
  echo ""
  echo "$RESPONSE" | jq '.'
  exit 1
fi
