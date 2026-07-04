import createClient from "openapi-fetch";

import type { components, paths } from "~/lib/api/schema";

export type ApiSchema<Name extends keyof components["schemas"]> =
  components["schemas"][Name];

export type ApiResult<T> = {
  data: T;
  source: "api" | "fallback";
  error?: string;
};

type FetchLike<T> = Promise<{
  data?: T;
  error?: unknown;
}>;

const DEFAULT_API_BASE_URL = "http://localhost:8000";

export function getApiBaseUrl() {
  return process.env.KOMBU_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export function createKombuClient() {
  return createClient<paths>({
    baseUrl: getApiBaseUrl(),
    headers: {
      Accept: "application/json",
    },
  });
}

export async function withFallback<T>(
  request: FetchLike<T>,
  fallback: T,
): Promise<ApiResult<T>> {
  try {
    const response = await request;
    if (response.data !== undefined && response.error === undefined) {
      return { data: response.data, source: "api" };
    }

    return {
      data: fallback,
      source: "fallback",
      error: stringifyError(response.error),
    };
  } catch (error) {
    return {
      data: fallback,
      source: "fallback",
      error: stringifyError(error),
    };
  }
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error === undefined || error === null) {
    return "API unavailable";
  }

  return "API returned an unexpected response";
}
