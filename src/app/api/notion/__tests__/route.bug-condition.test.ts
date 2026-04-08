import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Bug Condition Exploration Test
 *
 * Validates: Requirements 1.1, 1.2
 *
 * This test verifies the bug exists in the current code:
 * - Line ~108: `request.json()` consumes the body
 * - Line ~186: `request.clone().json()` tries to re-read the consumed body, which fails
 *
 * The test encodes EXPECTED (correct) behavior — after the fix, this test should PASS.
 * On unfixed code, this test is EXPECTED TO FAIL (confirming the bug exists).
 */

// Mock @notionhq/client before importing the route
vi.mock('@notionhq/client', () => {
    return {
        Client: class MockClient {
            pages = {
                create: vi.fn().mockResolvedValue({ id: 'mock-page-id', object: 'page' }),
            };
            databases = { query: vi.fn() };
            blocks = { children: { list: vi.fn() } };
        },
    };
});

// Mock environment variables
vi.stubEnv('NOTION_API_KEY', 'test-notion-key');
vi.stubEnv('NOTION_DATABASE_ID', 'test-database-id');

describe('POST /api/notion - Bug Condition: request.clone().json() after body consumed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * **Validates: Requirements 1.1, 1.2**
     *
     * Property 1: Bug Condition — request.clone().json() fails after body is consumed
     *
     * For any POST request containing an imageUrl field, the handler should
     * successfully parse all fields (including imageUrl) from a single request.json()
     * call and return a 200 response with the Notion page created.
     *
     * On unfixed code, this FAILS because request.clone().json() throws after
     * request.json() has already consumed the body stream.
     */
    it('should return 200 when POST body contains imageUrl (expected behavior)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    type: fc.constant('style'),
                    theme: fc.constant('스타일 변환 결과'),
                    scenario: fc.string({ minLength: 1, maxLength: 100 }),
                    imageUrl: fc.webUrl(),
                    marketing: fc.record({
                        caption: fc.string({ minLength: 1, maxLength: 50 }),
                        hashtags: fc.string({ minLength: 1, maxLength: 50 }),
                    }),
                    status: fc.constant('생성 완료'),
                }),
                async (body) => {
                    // Dynamically import to pick up mocks
                    const { POST } = await import('../../notion/route');

                    const request = new Request('http://localhost:3000/api/notion', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                    });

                    const response = await POST(request);

                    // Expected behavior: handler should return 200
                    // On unfixed code: returns 500 because request.clone().json() fails
                    expect(response.status).toBe(200);
                },
            ),
            { numRuns: 5 },
        );
    });
});
