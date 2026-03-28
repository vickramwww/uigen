import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { jwtVerify } from "jose";

// Mock next/headers before importing the module
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock server-only to avoid issues in test environment
vi.mock("server-only", () => ({}));

// Import after mocking
import { createSession, getSession } from "../auth";
import { cookies } from "next/headers";

// Create a mock cookie store
const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  
  // Reset environment variables
  delete process.env.JWT_SECRET;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("createSession sets cookie with correct name", async () => {
  const userId = "user123";
  const email = "test@example.com";

  await createSession(userId, email);

  expect(cookies).toHaveBeenCalledOnce();
  expect(mockCookieStore.set).toHaveBeenCalledOnce();
  
  const [cookieName, token, options] = mockCookieStore.set.mock.calls[0];
  expect(cookieName).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(token.length).toBeGreaterThan(0);
});

test("createSession sets cookie with correct security options in development", async () => {
  process.env.NODE_ENV = "development";
  
  await createSession("user123", "test@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.secure).toBe(false); // Should be false in development
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession sets cookie with correct security options in production", async () => {
  process.env.NODE_ENV = "production";
  
  await createSession("user123", "test@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.secure).toBe(true); // Should be true in production
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  expect(options.expires).toBeInstanceOf(Date);
});

test("createSession sets cookie expiration to 7 days from creation", async () => {
  const mockTime = 1234567890000;
  vi.spyOn(Date, 'now').mockReturnValue(mockTime);

  await createSession("user123", "test@example.com");

  const [, , options] = mockCookieStore.set.mock.calls[0];
  const expectedExpiration = new Date(mockTime + 7 * 24 * 60 * 60 * 1000);
  
  expect(options.expires).toEqual(expectedExpiration);
});

test("createSession creates JWT token with basic verification", async () => {
  const userId = "user123";
  const email = "test@example.com";
  
  await createSession(userId, email);

  const [, token] = mockCookieStore.set.mock.calls[0];
  
  // Basic verification that we got a JWT-like string
  expect(typeof token).toBe('string');
  expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  
  // Verify the token can be decoded with the correct secret
  const JWT_SECRET = new TextEncoder().encode("development-secret-key");
  
  // This should not throw an error
  await expect(jwtVerify(token, JWT_SECRET)).resolves.toBeDefined();
});

test("createSession uses custom JWT_SECRET when provided", async () => {
  const customSecret = "my-custom-secret";
  process.env.JWT_SECRET = customSecret;
  
  await createSession("user123", "test@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  
  // Verify token was signed with custom secret by successfully verifying
  const JWT_SECRET = new TextEncoder().encode(customSecret);
  await expect(jwtVerify(token, JWT_SECRET)).resolves.toBeDefined();
  
  // Verify that using the wrong secret fails
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  await expect(jwtVerify(token, wrongSecret)).rejects.toThrow();
});

// getSession function tests
test("getSession returns null when no token cookie exists", async () => {
  mockCookieStore.get.mockReturnValue(undefined);
  
  const result = await getSession();
  
  expect(result).toBeNull();
  expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
});

test("getSession returns null when token cookie value is empty", async () => {
  mockCookieStore.get.mockReturnValue({ value: "" });
  
  const result = await getSession();
  
  expect(result).toBeNull();
});

test("getSession returns session payload when valid token exists", async () => {
  // Create a real JWT token for testing
  const userId = "user123";
  const email = "test@example.com";
  
  // First create a session to get a valid token
  await createSession(userId, email);
  const [, validToken] = mockCookieStore.set.mock.calls[0];
  
  // Clear the mock calls
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  
  // Now mock the cookie store to return our valid token
  mockCookieStore.get.mockReturnValue({ value: validToken });
  
  const result = await getSession();
  
  expect(result).not.toBeNull();
  expect(result?.userId).toBe(userId);
  expect(result?.email).toBe(email);
  // The expiresAt field will be returned as a string from JWT, then converted to Date by the type assertion
  expect(result?.expiresAt).toBeDefined();
});

test("getSession returns null when JWT verification fails", async () => {
  mockCookieStore.get.mockReturnValue({ value: "invalid-jwt-token" });
  
  const result = await getSession();
  
  expect(result).toBeNull();
});

test("getSession handles malformed cookie value gracefully", async () => {
  // Mock a cookie that exists but has undefined value
  mockCookieStore.get.mockReturnValue({ value: undefined });
  
  const result = await getSession();
  
  expect(result).toBeNull();
});

test("getSession properly calls cookies() function", async () => {
  mockCookieStore.get.mockReturnValue(undefined);
  
  await getSession();
  
  expect(cookies).toHaveBeenCalledOnce();
});

test("getSession with custom JWT secret", async () => {
  const customSecret = "custom-test-secret";
  process.env.JWT_SECRET = customSecret;
  
  const userId = "user123";
  const email = "test@example.com";
  
  // Create a session with custom secret
  await createSession(userId, email);
  const [, validToken] = mockCookieStore.set.mock.calls[0];
  
  // Clear mocks
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue(mockCookieStore as any);
  
  // Mock cookie to return the token
  mockCookieStore.get.mockReturnValue({ value: validToken });
  
  const result = await getSession();
  
  expect(result).not.toBeNull();
  expect(result?.userId).toBe(userId);
  expect(result?.email).toBe(email);
});

test("getSession handles various error types gracefully", async () => {
  // Test with a completely malformed token that will throw during verification
  mockCookieStore.get.mockReturnValue({ value: "not-a-jwt-token-at-all" });
  
  const result = await getSession();
  
  expect(result).toBeNull();
});

test("createSession handles special characters in inputs", async () => {
  const userId = "user@#$%^&*()_+{}|:<>?123";
  const email = "test+tag@example-domain.com";

  await createSession(userId, email);

  // Verify a token was created
  const [cookieName, token] = mockCookieStore.set.mock.calls[0];
  expect(cookieName).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(token.length).toBeGreaterThan(0);
});

test("createSession handles empty string inputs", async () => {
  const userId = "";
  const email = "";

  await createSession(userId, email);

  // Verify a token was created even with empty inputs
  const [cookieName, token] = mockCookieStore.set.mock.calls[0];
  expect(cookieName).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(token.length).toBeGreaterThan(0);
});

test("JWT token uses HS256 algorithm", async () => {
  await createSession("user123", "test@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  
  // Decode the JWT header to check algorithm
  const [headerB64] = token.split('.');
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  
  expect(header.alg).toBe("HS256");
});

test("JWT token has valid structure and expiration", async () => {
  const mockTime = 1234567890000;
  vi.spyOn(Date, 'now').mockReturnValue(mockTime);

  await createSession("user123", "test@example.com");

  const [, token] = mockCookieStore.set.mock.calls[0];
  
  // Verify JWT structure
  const parts = token.split('.');
  expect(parts).toHaveLength(3);
  
  // Verify we can successfully verify the token (this will throw if invalid)
  const JWT_SECRET = new TextEncoder().encode("development-secret-key");
  await expect(jwtVerify(token, JWT_SECRET)).resolves.toBeDefined();
});