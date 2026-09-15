# Foundry RBAC for the Container App managed identity

The application authenticates to Microsoft Foundry with Microsoft Entra ID only.
There is no API key anywhere in the codebase, the container image, or the
Container App configuration.

## What needs access

| Identity | Used for | Required role |
|---|---|---|
| Container App system-assigned managed identity | Model inference from the deployed app | `Foundry User` on the Foundry resource |
| Your developer identity (`az login`) | Local `npm run verify:ai` and `npm run dev` | `Foundry User` on the same scope |

`Foundry User` is the role this project was verified against. Role names vary
by tenant: if `Foundry User` is not present, use `Cognitive Services OpenAI User`
(or `Azure AI User` in tenants that expose it). Confirm what your tenant offers:

```bash
az role definition list --scope $FOUNDRY_ID --query "[].roleName" -o tsv
```

The deployment scripts try `Foundry User` first, then
`Cognitive Services OpenAI User`, and report which roles ended up assigned.

> **Data-plane role assignments are not immediate.** Expect a few minutes
> between assigning the role and inference succeeding. Until then the app
> returns `403 status code (no body)` from Foundry. This is propagation, not a
> configuration error — do not start changing endpoints or scopes.

## Assign to the Container App

`infra/deploy.ps1` and `infra/deploy.sh` do this automatically. To do it by hand:

```bash
SUBSCRIPTION_ID=<your-subscription-id>
RESOURCE_GROUP=rgCAI
APP_NAME=ca-cai-demo2
FOUNDRY_ACCOUNT=jamesbas-demo-project-resource

az account set --subscription $SUBSCRIPTION_ID

PRINCIPAL_ID=$(az containerapp show -n $APP_NAME -g $RESOURCE_GROUP \
  --query identity.principalId -o tsv)

FOUNDRY_ID=$(az resource list --name $FOUNDRY_ACCOUNT \
  --resource-type "Microsoft.CognitiveServices/accounts" --query "[0].id" -o tsv)

az role assignment create \
  --assignee-object-id $PRINCIPAL_ID \
  --assignee-principal-type ServicePrincipal \
  --role "Foundry User" \
  --scope $FOUNDRY_ID
```

Note that the Foundry resource is often in a different resource group from the
Container App. The command above looks it up by name across the subscription.

## Assign to your developer identity

```bash
USER_ID=$(az ad signed-in-user show --query id -o tsv)

az role assignment create \
  --assignee-object-id $USER_ID \
  --assignee-principal-type User \
  --role "Foundry User" \
  --scope $FOUNDRY_ID
```

## Verify

```bash
npm run verify:ai
```

The script acquires an Entra token for the `https://ai.azure.com/.default`
scope, then checks text input, image input, and strict structured output.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `403 status code (no body)` shortly after deploying | Role assignment has not propagated to the data plane | Wait a few minutes and retry. Verify with `az role assignment list --assignee $PRINCIPAL_ID --all -o table` |
| `Role 'X' doesn't exist` | Role name differs in this tenant | List available roles at the scope and pick the Foundry/OpenAI user role |
| `AuthorizationFailed` / 403 that persists | Role assignment missing or on the wrong scope | Assign at the Foundry account scope, not the Container App resource group |
| `AADSTS500011` or wrong-tenant token | Azure CLI signed into a different tenant | `az login --tenant <your-tenant-id>` and set `AZURE_TENANT_ID` |
| 401 `audience is incorrect` | Wrong token scope | The audience must be `https://ai.azure.com`, not `cognitiveservices.azure.com` |
| 404 on `/openai/v1/responses` | Wrong endpoint or deployment name | Confirm `FOUNDRY_PROJECT_ENDPOINT` and `FOUNDRY_MODEL` |
| Image input rejected | Deployment is not vision-capable | Deploy a vision model in the same project and set `FOUNDRY_VISION_MODEL` |

## Rules that must not be relaxed

- Never set `OPENAI_API_KEY` or `AZURE_OPENAI_API_KEY`.
- Never place a Foundry key in `.env`, the image, or Container App secrets.
- All model calls stay server-side. The browser never receives a Foundry token.
