#!/usr/bin/env bash
# Deploys the CAI Demo 2 application to Azure Container Apps.
# Idempotent. Builds the image in ACR, so no local Docker is required.
# No API keys are created, stored, or configured anywhere in this script.
set -euo pipefail

SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-$(az account show --query id -o tsv)}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rgCAI}"
ACR_NAME="${ACR_NAME:-}"
ENVIRONMENT_NAME="${ENVIRONMENT_NAME:-cae-cai-demo2}"
APP_NAME="${APP_NAME:-ca-cai-demo2}"
IMAGE_REPO="${IMAGE_REPO:-cai-demo2}"
FOUNDRY_PROJECT_ENDPOINT="${FOUNDRY_PROJECT_ENDPOINT:-https://jamesbas-demo-project-resource.services.ai.azure.com/api/projects/jamesbas-demo-project}"
FOUNDRY_MODEL="${FOUNDRY_MODEL:-gpt-5.6-terra}"
FOUNDRY_VISION_MODEL="${FOUNDRY_VISION_MODEL:-}"
FOUNDRY_ACCOUNT_NAME="${FOUNDRY_ACCOUNT_NAME:-jamesbas-demo-project-resource}"
FOUNDRY_ROLES=("Foundry User" "Cognitive Services OpenAI User")

cd "$(dirname "$0")/.."
step() { printf '\n==> %s\n' "$1"; }

step "Selecting subscription $SUBSCRIPTION_ID"
az account set --subscription "$SUBSCRIPTION_ID"

step "Confirming resource group $RESOURCE_GROUP"
LOCATION="$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)"
echo "    location: $LOCATION"

step "Ensuring an Azure Container Registry exists"
if [[ -z "$ACR_NAME" ]]; then
  ACR_NAME="$(az acr list -g "$RESOURCE_GROUP" --query "[0].name" -o tsv || true)"
fi
if [[ -z "$ACR_NAME" ]]; then
  ACR_NAME="acrcaidemo2$(tr -dc 'a-z' </dev/urandom | head -c 6)"
fi
if ! az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" -o none 2>/dev/null; then
  echo "    creating $ACR_NAME"
  az acr create -n "$ACR_NAME" -g "$RESOURCE_GROUP" --sku Basic --location "$LOCATION" --admin-enabled false -o none
fi
ACR_ID="$(az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query id -o tsv)"
LOGIN_SERVER="$(az acr show -n "$ACR_NAME" -g "$RESOURCE_GROUP" --query loginServer -o tsv)"
echo "    registry: $LOGIN_SERVER"

step "Ensuring Container Apps environment $ENVIRONMENT_NAME"
az extension add --name containerapp --upgrade -o none 2>/dev/null || true
ENV_STATE="$(az containerapp env show -n "$ENVIRONMENT_NAME" -g "$RESOURCE_GROUP" --query properties.provisioningState -o tsv 2>/dev/null || true)"
if [[ -n "$ENV_STATE" && "$ENV_STATE" != "Succeeded" ]]; then
  # A half-provisioned environment can never host an app, so replace it.
  echo "    existing environment state is '$ENV_STATE'; deleting it"
  az containerapp env delete -n "$ENVIRONMENT_NAME" -g "$RESOURCE_GROUP" --yes -o none
  ENV_STATE=""
fi
if [[ -z "$ENV_STATE" ]]; then
  echo "    creating $ENVIRONMENT_NAME in $LOCATION"
  az containerapp env create -n "$ENVIRONMENT_NAME" -g "$RESOURCE_GROUP" --location "$LOCATION" -o none
fi

TAG="$(date -u +%Y%m%d%H%M%S)"
IMAGE="$LOGIN_SERVER/$IMAGE_REPO:$TAG"
step "Building $IMAGE in ACR (no local Docker required)"
az acr build --registry "$ACR_NAME" --image "$IMAGE_REPO:$TAG" --image "$IMAGE_REPO:latest" --file Dockerfile . -o none

step "Ensuring Container App $APP_NAME"
if ! az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" -o none 2>/dev/null; then
  az containerapp create -n "$APP_NAME" -g "$RESOURCE_GROUP" \
    --environment "$ENVIRONMENT_NAME" \
    --image mcr.microsoft.com/k8se/quickstart:latest \
    --target-port 3000 --ingress external \
    --min-replicas 1 --max-replicas 1 \
    --cpu 1.0 --memory 2.0Gi \
    --system-assigned -o none
else
  az containerapp identity assign -n "$APP_NAME" -g "$RESOURCE_GROUP" --system-assigned -o none
fi

PRINCIPAL_ID="$(az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" --query identity.principalId -o tsv)"
echo "    managed identity principal: $PRINCIPAL_ID"

step "Granting the managed identity AcrPull on $ACR_NAME"
az role assignment create --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
  --role AcrPull --scope "$ACR_ID" -o none 2>/dev/null || true

step "Granting the managed identity Foundry access"
FOUNDRY_ID="$(az resource list --name "$FOUNDRY_ACCOUNT_NAME" --resource-type "Microsoft.CognitiveServices/accounts" --query "[0].id" -o tsv || true)"
if [[ -z "$FOUNDRY_ID" ]]; then
  echo "    WARNING: Foundry account '$FOUNDRY_ACCOUNT_NAME' not found. See infra/configure-foundry-rbac.md."
else
  echo "    scope: $FOUNDRY_ID"
  for role in "${FOUNDRY_ROLES[@]}"; do
    if az role assignment create --assignee-object-id "$PRINCIPAL_ID" --assignee-principal-type ServicePrincipal \
      --role "$role" --scope "$FOUNDRY_ID" -o none 2>/dev/null; then
      echo "    granted '$role'"
    else
      echo "    skipped '$role' (role not available in this tenant, or already assigned)"
    fi
  done
  echo "    current roles: $(az role assignment list --assignee "$PRINCIPAL_ID" --scope "$FOUNDRY_ID" --query "[].roleDefinitionName" -o tsv | tr '\n' ' ')"
  echo "    note: new Foundry role assignments can take a few minutes to become effective"
fi

step "Updating the Container App image and configuration"
az containerapp registry set -n "$APP_NAME" -g "$RESOURCE_GROUP" --server "$LOGIN_SERVER" --identity system -o none
az containerapp update -n "$APP_NAME" -g "$RESOURCE_GROUP" \
  --image "$IMAGE" \
  --min-replicas 1 --max-replicas 1 \
  --set-env-vars \
    "AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID" \
    "AZURE_RESOURCE_GROUP=$RESOURCE_GROUP" \
    "FOUNDRY_PROJECT_ENDPOINT=$FOUNDRY_PROJECT_ENDPOINT" \
    "FOUNDRY_MODEL=$FOUNDRY_MODEL" \
    "FOUNDRY_VISION_MODEL=$FOUNDRY_VISION_MODEL" \
    "DATABASE_PATH=/app/data/cai-demo2.db" \
    "DEMO_MODE=true" \
    "DEMO_EXTERNAL_DISPATCH=false" \
    "DEMO_AI_TIMEOUT_MS=20000" \
    "DEMO_FIXTURE_MODE=false" \
    "NEXT_PUBLIC_APP_TITLE=CAI Connected Maintenance Demo" \
  -o none

FQDN="$(az containerapp show -n "$APP_NAME" -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)"
URL="https://$FQDN"

step "Checking $URL/api/health"
for _ in $(seq 1 12); do
  if curl -fsS --max-time 20 "$URL/api/health"; then echo; break; fi
  sleep 10
done

step "Resetting demo state"
curl -fsS -X POST --max-time 30 "$URL/api/demo/reset" || echo "    reset call failed (expected if inbound Entra auth is enabled)"
echo

printf '\nApplication URL: %s\n' "$URL"
echo "Optional next step: enable Entra sign-in — see infra/configure-entra-auth.md"
