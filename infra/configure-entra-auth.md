# Optional: Microsoft Entra sign-in in front of the demo app

This is separate from the managed identity used for Foundry inference. It
controls who can open the web application, and supplies the human reviewer
identity that appears in the audit trail.

## Enable

```bash
SUBSCRIPTION_ID=<your-subscription-id>
RESOURCE_GROUP=rgCAI
APP_NAME=ca-cai-demo2

az account set --subscription $SUBSCRIPTION_ID

FQDN=$(az containerapp show -n $APP_NAME -g $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

# 1. Register the application
APP_ID=$(az ad app create \
  --display-name "CAI Demo 2 Maintenance Workflow" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "https://$FQDN/.auth/login/aad/callback" \
  --query appId -o tsv)

# 2. Attach Entra auth to the Container App
az containerapp auth microsoft update -n $APP_NAME -g $RESOURCE_GROUP \
  --client-id $APP_ID \
  --issuer "https://login.microsoftonline.com/$TENANT_ID/v2.0" \
  --allowed-token-audiences "api://$APP_ID"

# 3. Require sign-in for every request
az containerapp auth update -n $APP_NAME -g $RESOURCE_GROUP \
  --enabled true \
  --action RedirectToLoginPage \
  --redirect-provider azureactivedirectory
```

A client secret is required by the auth provider for the authorization-code
flow. Create it once and store it in a Container Apps secret:

```bash
SECRET=$(az ad app credential reset --id $APP_ID --append \
  --display-name containerapps --query password -o tsv)

az containerapp secret set -n $APP_NAME -g $RESOURCE_GROUP \
  --secrets microsoft-provider-authentication-secret=$SECRET

az containerapp auth microsoft update -n $APP_NAME -g $RESOURCE_GROUP \
  --client-secret-name microsoft-provider-authentication-secret
```

This secret authenticates the sign-in flow only. It is never used for Foundry
inference, which remains managed-identity based.

## How the app uses it

`lib/auth/reviewer.ts` reads the principal injected by Container Apps:

- `X-MS-CLIENT-PRINCIPAL-NAME`, or
- the base64 `X-MS-CLIENT-PRINCIPAL` claims payload.

That name is written to `cases.reviewer_name` and to every
`HUMAN_REVIEW_STARTED`, `HUMAN_OVERRIDE_APPLIED`, `HUMAN_APPROVED`,
`HUMAN_REJECTED`, and `HUMAN_REROUTED` audit event.

If auth is not enabled, the reviewer is recorded as
`Demo Reviewer (synthetic)` and the UI labels it as such.

## Before the keynote

1. Sign in on the presentation laptop and leave the session active.
2. Confirm the header shows the expected reviewer name.
3. Run `Reset Demo` while signed in — reset is behind the same auth boundary.
4. Confirm `/api/health` still returns `ok` in the signed-in browser session.

## Disable

```bash
az containerapp auth update -n $APP_NAME -g $RESOURCE_GROUP --enabled false
```

Disabling returns the app to the synthetic reviewer identity. Everything else
in the workflow, including the human approval gate, is unchanged.
