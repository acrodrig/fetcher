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
  if (url.pathname === "/object") return Response.json({ x: 1, y: 42 });
  if (url.pathname === "/upload") return new Response((await request.arrayBuffer()).byteLength.toString());
  if (url.pathname === "/throw") throw new Error("Error");
  return new Response("Not Found", { status: 404 });
});

// Dumb logger that stores logs instead of printing them
class Logger {
  static LEVELS = ["debug", "info", "warn", "error", "off"];
  level: number;
  logs: { level: string; args: unknown[] }[] = [];
  constructor(l = "info") {
    this.level = Logger.LEVELS.indexOf(l);
  }
  reset(l: string) {
    this.level = Logger.LEVELS.indexOf(l);
    this.logs = [];
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
  const fetcher = new Fetcher(ENDPOINT);

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
  const fetcher = new Fetcher(ENDPOINT);

  const string = "Hello World!";
  const textResponse = await fetcher.post("/upload", undefined, string, { headers: { "Content-Type": "text/plain" } });
  assertEquals(textResponse.data, string.length.toString());

  // See https://www.fredlich.com/works/smallest-base64-image
  const bytes = decodeBase64("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==");
  const bytesResponse = await fetcher.post("/upload", undefined, bytes.buffer, { headers: { "Content-Type": "image/gif" } });
  assertEquals(bytesResponse.data, bytes.byteLength.toString());
});

Deno.test("log", async function () {
  const logger = new Logger();
  const fetcher = new Fetcher(ENDPOINT, {}, logger);

  // Default logger will capture one entry (generated error)
  await fetcher.get("/hello");
  await fetcher.get("/foo");
  assertEquals(logger.logs.length, 1);

  // Off fetcher will capture none
  logger.reset("off");
  await fetcher.get("/hello");
  await fetcher.get("/foo");
  assertEquals(logger.logs.length, 0);

  // Debug fetcher will capture all entries
  logger.reset("debug");
  await fetcher.get("/hello");
  await fetcher.get("/foo");
  assertEquals(logger.logs.length, 4);

  // Finally default logger with higher 'minError' will not capture any entries
  logger.reset("info");
  fetcher.minError = 500;
  await fetcher.get("/hello");
  await fetcher.get("/foo");
  assertEquals(logger.logs.length, 0);
});
