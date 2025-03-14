#!/usr/bin/env -S deno test -A

import { assertEquals } from "@std/assert";
import { decodeBase64 } from "@std/encoding";
import { Fetcher } from "../src/fetcher.ts";

const ENDPOINT = "http://localhost:8378";
const CONSOLE_ERROR = console.error;

interface Point {
  x: number;
  y: number;
}

// Starts a Deno server that responds "Hello Word!" to everything except /sse
Deno.serve({ port: 8378 }, async (request) => {
  const url = new URL(request.url);
  if (url.pathname === "/hello") return new Response("Hello World!");
  if (url.pathname === "/object") return new Response(JSON.stringify({ x: 1, y: 42 }), { headers: { "Content-Type": "application/json" } });
  if (url.pathname === "/upload") return new Response((await request.arrayBuffer()).byteLength.toString());
  return new Response("Not Found", { status: 404 });
});

// Dumb logger that stores logs
class Logger {
  static LEVELS = ["debug", "info", "warn", "error"];
  level: number;
  logs: { level: string; args: unknown[] }[] = [];
  constructor(l = "info") {
    this.level = Logger.LEVELS.indexOf(l);
  }
  log(l: number, ...args: unknown[]) {
    if (this.level <= l) this.logs.push({ level: "debug", args });
  }
  debug = this.log.bind(this, 0);
  info = this.log.bind(this, 1);
  warn = this.log.bind(this, 2);
  error = this.log.bind(this, 3);
}

Deno.test("simple", async function () {
  const fetcher = new Fetcher({}, ENDPOINT);

  const stringResponse = await fetcher.get<string>("/hello");
  assertEquals(stringResponse.data, "Hello World!");

  const pointResponse = await fetcher.get<Point>("/object");
  assertEquals(pointResponse.data.x, 1);

  // Eat the error to have a clean test output
  console.error = () => {};
  const failedResponse = await fetcher.get<unknown>("/foo");
  assertEquals(failedResponse.status, 404);
  assertEquals(failedResponse.data, "Not Found");
  console.error = CONSOLE_ERROR;
});

Deno.test("upload", async function () {
  const fetcher = new Fetcher({}, ENDPOINT);

  const string = "Hello World!";
  const textResponse = await fetcher.post("/upload", undefined, string, { headers: { "Content-Type": "text/plain" } });
  assertEquals(textResponse.data, string.length.toString());

  // See https://www.fredlich.com/works/smallest-base64-image
  const bytes = decodeBase64("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==");
  const bytesResponse = await fetcher.post("/upload", undefined, bytes.buffer, { headers: { "Content-Type": "image/gif" } });
  assertEquals(bytesResponse.data, bytes.byteLength.toString());
});

Deno.test("log", async function () {
  // Patch console.error to make sure it is called
  let count = 0;
  console.error = () => count++ && CONSOLE_ERROR("HEY");

  // Will not log errors
  const plainFetcher = new Fetcher({}, ENDPOINT, undefined);
  await plainFetcher.get("/hello");
  assertEquals(count, 0);

  // Log error to console
  const consoleFetcher = new Fetcher({}, ENDPOINT);
  await consoleFetcher.get("/foo");
  assertEquals(count, 1);

  // Unconstrained logger will log everything
  const logger = new Logger("debug");
  const loggerFetcher = new Fetcher({}, ENDPOINT, logger);
  await loggerFetcher.get("/foo");
  assertEquals(logger.logs.length, 3);

  // Make sure the rest of the tests NEVER called console.error
  assertEquals(count, 1);
  console.error = CONSOLE_ERROR;
});
