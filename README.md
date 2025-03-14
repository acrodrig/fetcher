# Fetcher

A lightweight flexible TypeScript class for making HTTP requests with built-in logging and request sequence tracking.

## Features

- Supports all major HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `REPORT`, `PROPFIND`).
- Allows query string parameters in requests.
- Handles JSON and URL-encoded form data.
- Customizable headers and base endpoint.
- Optional logging support for debugging requests and responses.

## Usage

### Basic Example

```typescript
import { Fetcher } from "@acr/fetcher";

const fetcher = new Fetcher({ Authorization: "Bearer YOUR_TOKEN" }, "https://api.example.com");

const response = await fetcher.get("/users");
console.log(response.data);
```

### Advanced Usage

```typescript
import { Fetcher } from "@acr/fetcher";

// Custom logger
const logger = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

const fetcher = new Fetcher({ "Content-Type": "application/json" }, "https://api.example.com", logger);

try {
  const response = await fetcher.post("/users", undefined, { name: "John Doe", email: "john@example.com" });
  console.log("User created:", response.data);
} catch (error) {
  console.error("Error creating user:", error);
}
```

### Available Methods

All methods return a `Promise<Response & { data: T }>` where `T` is the expected response type.

```typescript
fetcher.get<T>(path: string, qs?: QueryString, data?: undefined, options?: RequestInit);
fetcher.post<T>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit);
fetcher.put<T>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit);
fetcher.patch<T>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit);
fetcher.delete<T>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit);
fetcher.head<T>(path: string, qs?: QueryString, data?: undefined, options?: RequestInit);
fetcher.report<T>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit);
fetcher.propfind<T>(path: string, qs?: QueryString, data?: unknown, options?: RequestInit);
```

### Query String Parameters

Query string parameters can be passed using an object:

```typescript
await fetcher.get("/users", { role: "admin", active: true });
```

This will generate a request URL like:

```
GET /users?role=admin&active=true
```

### Headers

Custom headers can be defined in the `Fetcher` constructor and overridden per request:

```typescript
await fetcher.get("/profile", undefined, undefined, { headers: { Authorization: "Bearer NEW_TOKEN" } });
```

### Error Handling

If a request fails (status >= 400), the error is logged using the provided `Logger`, or `console.error` if no logger is provided.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -m "Added a new feature"`).
4. Push the branch (`git push origin feature-branch`).
5. Open a Pull Request.

## License

This project is open-source and available under the MIT License.
