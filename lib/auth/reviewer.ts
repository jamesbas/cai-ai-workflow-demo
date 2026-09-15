export interface Reviewer {
  name: string;
  authenticated: boolean;
}

interface ClientPrincipalClaim {
  typ?: string;
  val?: string;
}

interface ClientPrincipal {
  claims?: ClientPrincipalClaim[];
  userDetails?: string;
  auth_typ?: string;
}

const NAME_CLAIMS = [
  "name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "preferred_username",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];

/**
 * Reads the reviewer identity injected by Azure Container Apps built-in auth.
 * Falls back to a clearly labelled synthetic reviewer when auth is not enabled.
 */
export function getReviewer(headers: Headers): Reviewer {
  const direct = headers.get("x-ms-client-principal-name");
  if (direct) return { name: direct, authenticated: true };

  const encoded = headers.get("x-ms-client-principal");
  if (encoded) {
    try {
      const principal = JSON.parse(
        Buffer.from(encoded, "base64").toString("utf8"),
      ) as ClientPrincipal;
      const claim = principal.claims?.find(
        (entry) => entry.typ && NAME_CLAIMS.includes(entry.typ) && entry.val,
      );
      const name = claim?.val ?? principal.userDetails;
      if (name) return { name, authenticated: true };
    } catch {
      // Malformed header: fall through to the synthetic reviewer.
    }
  }

  return { name: "Demo Reviewer (synthetic)", authenticated: false };
}
