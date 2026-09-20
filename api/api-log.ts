import type { APIRequestContext, Page } from '@playwright/test';
import { pwApi } from 'pw-api-plugin';
import { env } from '@/utils/env';

/**
 * The part of `APIRequestContext` the clients use. Playwright's own context satisfies it,
 * and so does the logged wrapper below, so a client never knows which one it received.
 */
export type ApiRequest = Pick<APIRequestContext, 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head'>;

// pw-api-plugin reads its own switches on every call. API_LOG is the only switch this framework exposes.
process.env.LOG_API_UI = String(env.API_LOG === 'ui');
process.env.LOG_API_REPORT = String(env.API_LOG !== 'off');

/**
 * `API_LOG=off` returns the context untouched: the plugin is never called.
 * Otherwise every request goes through pw-api-plugin, which attaches a request/response card
 * to the HTML report and, when it gets a `page` (`API_LOG=ui`), draws it in UI mode and the trace viewer.
 */
export function withApiLog(request: APIRequestContext, page?: Page): ApiRequest {
  if (env.API_LOG === 'off') return request;
  const target = { request, page };
  return {
    get: (url, options) => pwApi.get(target, url, options),
    post: (url, options) => pwApi.post(target, url, options),
    put: (url, options) => pwApi.put(target, url, options),
    patch: (url, options) => pwApi.patch(target, url, options),
    delete: (url, options) => pwApi.delete(target, url, options),
    head: (url, options) => pwApi.head(target, url, options),
  };
}
