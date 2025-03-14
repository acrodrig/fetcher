type QueryString = Record<string, boolean | Date | number | string> | undefined;

// Simplified version of Console
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export class Fetcher {
  sequence = 0;
  endpoint: string;
  headers: Headers;
  logger?: Logger;

  // TODO: Enable only in development?

  constructor(headers: HeadersInit, endpoint = "", logger?: Logger) {
    this.headers = new Headers(headers);
    this.endpoint = endpoint;
    this.logger = logger;
  }

  // See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#setting_a_body
  static #isValidBody(data: unknown) {
    return typeof data === "string" ||
      data instanceof ArrayBuffer ||
      data instanceof Blob ||
      data instanceof DataView ||
      data instanceof File ||
      data instanceof FormData ||
      data instanceof ReadableStream ||
      data instanceof URLSearchParams;
  }

  // deno-lint-ignore no-explicit-any
  delete<T = any>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit): Promise<Response & { data: T }> {
    return this.op<T>("DELETE", path, qs, data, options);
  }

  // deno-lint-ignore no-explicit-any
  get<T = any>(path: string, qs?: QueryString, data?: undefined, options?: RequestInit): Promise<Response & { data: T }> {
    return this.op<T>("GET", path, qs, data, options);
  }

  // deno-lint-ignore no-explicit-any
  head<T = any>(path: string, qs?: QueryString, data?: undefined, options?: RequestInit): Promise<Response & { data: T }> {
    return this.op<T>("HEAD", path, qs, data, options);
  }

  // deno-lint-ignore no-explicit-any
  patch<T = any>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit): Promise<Response & { data: T }> {
    return this.op<T>("PATCH", path, qs, data, options);
  }

  // deno-lint-ignore no-explicit-any
  post<T = any>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit): Promise<Response & { data: T }> {
    return this.op<T>("POST", path, qs, data, options);
  }

  // deno-lint-ignore no-explicit-any
  put<T = any>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit): Promise<Response & { data: T }> {
    return this.op<T>("PUT", path, qs, data, options);
  }

  // deno-lint-ignore no-explicit-any
  report<T = any>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit): Promise<Response & { data: T }> {
    return this.op<T>("REPORT", path, qs, data, options);
  }

  // deno-lint-ignore no-explicit-any
  propfind<T = any>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit): Promise<Response & { data: T }> {
    return this.op<T>("PROPFIND", path, qs, data, options);
  }

  // deno-lint-ignore no-explicit-any
  private op<T = any>(method: string, path: string, qs?: QueryString, data?: unknown, options: RequestInit = { method }) {
    options.method = method;
    const url = path.startsWith("http") ? path : this.endpoint + path;
    return this.fetch<T>(new URL(url), options, qs, data, new Headers(options?.headers));
  }

  // deno-lint-ignore no-explicit-any
  private async fetch<T = any>(url: URL, options: RequestInit, qs: QueryString, data: unknown, headers: Headers, _auth = false): Promise<Response & { data: T }> {
    // Attached passed in headers to the base headers (only if they are not already set)
    for (const [k, v] of this.headers.entries()) if (!headers.has(k)) headers.append(k, v);

    // Set search params (cleaning undefined values before)
    if (qs) Object.keys(qs).forEach((k) => qs[k] === undefined && delete qs[k]);
    if (qs) Object.keys(qs).forEach((k) => qs[k] = qs[k] instanceof Date ? qs[k].toISOString() : qs[k]);
    if (qs) url.search = new URLSearchParams(qs as Record<string, string>).toString();

    // Set default content type (JSON)
    const contentType = headers.get("Content-Type");
    if (!contentType) headers.set("Content-Type", "application/json");

    // In case we need to transform the data to a form
    if (contentType?.startsWith("application/x-www-form-urlencoded")) data = new URLSearchParams(data as Record<string, string>).toString();

    // Set the body
    options.body = Fetcher.#isValidBody(data) ? data : JSON.stringify(data);

    // NOTE: Paramount for Apple Servers - it will return 500 is sent a default 'Accept-Language: *' :(
    headers.set("Accept-Language", "en");

    // Accept compressed answers
    headers.set("Accept-Encoding", "gzip");

    // Only log debug if not console
    this.logger?.debug({ method: "fetch:request", path: options.method + " " + url.pathname, qs, data });

    // Fetch
    options.headers = headers;
    const response = await fetch(url.toString(), options);
    this.sequence += 1;

    // Read body
    if (response.status === 204) data = "";
    else if (response.headers.get("Content-Type")?.includes("application/json")) data = await response.json();
    else data = await response.text();

    if (response.status >= 400) {
      // Even if there is no logger, we should not eat the error
      (this.logger ?? console).error({ method: "fetch:response", url: options.method + " " + url, headers: Object.fromEntries(headers), status: response.status, error: data });
    }

    this.logger?.debug({ method: "fetch:response", url: options.method + " " + url, headers, status: response.status, data: data });
    return Object.assign(response, { data: data as T });
  }
}
