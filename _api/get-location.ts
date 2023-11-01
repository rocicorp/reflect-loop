import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = {
  runtime: "edge",
};

export default function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const country = (request.headers["x-vercel-ip-country"] as string) ?? "";
  const city = (request.headers["x-vercel-ip-city"] as string) ?? "";
  const region =
    (request.headers["x-vercel-ip-country-region"] as string) ?? "";

  if (!country || !city || !region) {
    return response.json(null);
  }

  return response.json({
    country,
    city,
    region,
  });
}
