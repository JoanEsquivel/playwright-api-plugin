import type { APIResponse } from '@playwright/test';
import { z } from 'zod';
import { ErrorResponseSchema, type ErrorResponse } from '@/api/schemas/common.schema';

/**
 * An `APIResponse` that knows the contract of the endpoint it came from.
 * Status, headers and text stay available; `data()` and `error()` replace `json()`.
 */
export type TypedResponse<S extends z.ZodType> = APIResponse & {
  /** The body, validated against the endpoint's success schema. The type is inferred from that schema. */
  data(): Promise<z.output<S>>;
  /** The body, validated against the API's error envelope. */
  error(): Promise<ErrorResponse>;
};

/**
 * Binds a request to the zod schema of its success response. It never looks at the status and never
 * throws on its own: a body is validated only when the spec asks for it with `data()` or `error()`.
 * This file is the one place where JSON from the network goes from `unknown` to a type.
 */
export async function typed<S extends z.ZodType>(pending: Promise<APIResponse>, schema: S): Promise<TypedResponse<S>> {
  const response = await pending;

  const parseAs = async <T extends z.ZodType>(target: T, contract: string, hint: string): Promise<z.output<T>> => {
    const answered = `${response.url()} answered ${response.status()}`;
    const result = target.safeParse(await jsonOf(response, answered));
    if (!result.success) {
      throw new Error(`${answered} with a body that does not match ${contract}${hint}:\n${z.prettifyError(result.error)}`);
    }
    return result.data;
  };

  return Object.assign(response, {
    data: () => parseAs(schema, "the endpoint's response schema", response.status() >= 400 ? ' (for a non-2xx answer read error())' : ''),
    error: () => parseAs(ErrorResponseSchema, 'the error envelope', response.status() < 400 ? ' (for a 2xx answer read data())' : ''),
  });
}

/** The id of a just-created resource, read without validating the rest of the body. For cleanup bookkeeping in fixtures. */
export async function idOf(response: APIResponse): Promise<string | undefined> {
  const text = await response.text();
  const result = z.object({ id: z.string().min(1) }).safeParse(safeJson(text));
  return result.success ? result.data.id : undefined;
}

async function jsonOf(response: APIResponse, answered: string): Promise<unknown> {
  const text = await response.text();
  const body = safeJson(text);
  if (body === NOT_JSON) {
    throw new Error(`${answered} with a body that is not JSON: ${text ? text.slice(0, 200) : '(empty)'}`);
  }
  return body;
}

const NOT_JSON = Symbol('not json');

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return NOT_JSON;
  }
}
