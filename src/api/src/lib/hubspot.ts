import type { Env } from "../index";

interface HubSpotContactPayload {
  email: string;
  name?: string | null;
  phone?: string | null;
  source?: string;
}

export async function pushLeadToHubSpot(
  env: Env,
  payload: HubSpotContactPayload
): Promise<void> {
  if (!env.HUBSPOT_TOKEN) {
    console.warn("hubspot: HUBSPOT_TOKEN not configured — skipping push");
    return;
  }

  const [firstName, ...rest] = (payload.name ?? "").trim().split(" ");
  const lastName = rest.join(" ") || undefined;

  const body = {
    properties: {
      email:      payload.email,
      firstname:  firstName || undefined,
      lastname:   lastName,
      phone:      payload.phone ?? undefined,
      hs_lead_status: "NEW",
      lifecyclestage: "lead",
    },
  };

  try {
    const res = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.HUBSPOT_TOKEN}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 409) {
        console.info("hubspot: contact already exists", payload.email);
        return;
      }
      console.error("hubspot: contact creation failed", res.status, text);
    }
  } catch (e) {
    console.error("hubspot: fetch error", e);
  }
}
