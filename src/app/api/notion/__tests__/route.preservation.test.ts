import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

/**
 * Preservation Property Tests
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * These tests verify that requests WITHOUT imageUrl work correctly
 * on the current (unfixed) code. After the fix is applied, these
 * same tests must still PASS (regression prevention).
 *
 * We mock Request so that request.clone().json() returns the same body
 * (simulating a working clone), isolating the children/properties
 * construction logic for card and youtube types.
 */

// Capture pages.create call arguments
const mockPagesCreate = vi.fn().mockResolvedValue({ id: 'mock-page-id', object: 'page' });

vi.mock('@notionhq/client', () => {
    return {
        Client: class MockClient {
            pages = {
                create: mockPagesCreate,
            };
            databases = { query: vi.fn() };
            blocks = { children: { list: vi.fn() } };
        },
    };
});

vi.stubEnv('NOTION_API_KEY', 'test-notion-key');
vi.stubEnv('NOTION_DATABASE_ID', 'test-database-id');

/**
 * Helper: create a Request whose clone().json() returns the same parsed body.
 * This ensures the request.clone().json() call in unfixed code doesn't throw,
 * so we can test the children/properties construction logic in isolation.
 */
function createCloneableRequest(body: Record<string, unknown>): Request {
    const jsonStr = JSON.stringify(body);
    const req = new Request('http://localhost:3000/api/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
    });

    const originalClone = req.clone.bind(req);
    req.clone = () => {
        try {
            return originalClone();
        } catch {
            return new Request('http://localhost:3000/api/notion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonStr,
            });
        }
    };

    return req;
}

// --- fast-check arbitraries ---

const cardScenarioArb = fc.array(
    fc.record({
        card: fc.integer({ min: 1, max: 5 }),
        title: fc.string({ minLength: 1, maxLength: 30 }),
        subtitle: fc.string({ maxLength: 30 }),
        body: fc.string({ maxLength: 50 }),
        question: fc.string({ maxLength: 30 }),
        preview: fc.string({ maxLength: 30 }),
    }),
    { minLength: 1, maxLength: 5 },
);

const youtubeScenarioArb = fc.array(
    fc.record({
        sceneNumber: fc.integer({ min: 1, max: 10 }),
        description: fc.string({ minLength: 1, maxLength: 80 }),
    }),
    { minLength: 1, maxLength: 5 },
);

const klingPromptsArb = fc.array(
    fc.record({
        sceneNumber: fc.integer({ min: 1, max: 10 }),
        englishPrompt: fc.string({ minLength: 1, maxLength: 80 }),
    }),
    { minLength: 1, maxLength: 5 },
);

const marketingArb = fc.option(
    fc.oneof(
        fc.record({
            caption: fc.string({ minLength: 1, maxLength: 50 }),
            hashtags: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            hashtags: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string({ minLength: 1, maxLength: 50 }),
        }),
    ),
    { nil: undefined },
);

describe('POST /api/notion - Preservation: requests without imageUrl', () => {
    let POST: (request: Request) => Promise<Response>;

    beforeEach(async () => {
        vi.clearAllMocks();
        // Import once per test (not per fast-check iteration)
        const mod = await import('../../notion/route');
        POST = mod.POST;
    });

    /**
     * **Validates: Requirements 3.1**
     *
     * Property 2: Preservation — Card type requests create Notion pages successfully
     */
    it('card type requests should return 200 and create Notion page with correct properties', async () => {
        await fc.assert(
            fc.asyncProperty(
                cardScenarioArb,
                marketingArb,
                async (scenario, marketing) => {
                    mockPagesCreate.mockClear();

                    const body: Record<string, unknown> = {
                        type: 'card',
                        theme: '카드뉴스',
                        scenario,
                        status: '생성 완료',
                    };
                    if (marketing) body.marketing = marketing;

                    const request = createCloneableRequest(body);
                    const response = await POST(request);

                    // Should return 200
                    expect(response.status).toBe(200);

                    // Verify pages.create was called
                    expect(mockPagesCreate).toHaveBeenCalledOnce();

                    const callArgs = mockPagesCreate.mock.calls[0][0];

                    // Verify parent database_id
                    expect(callArgs.parent.database_id).toBe('test-database-id');

                    // Verify properties
                    expect(callArgs.properties.Name.title[0].text.content).toBe('카드뉴스');
                    expect(callArgs.properties['상태'].status.name).toBe('Done');
                    expect(callArgs.properties['생성일'].date.start).toBeDefined();
                    expect(callArgs.properties.channel.select.name).toBe('insta');

                    // Verify NO image block in children
                    const children = callArgs.children || [];
                    const imageBlocks = children.filter(
                        (c: { type: string }) => c.type === 'image',
                    );
                    expect(imageBlocks).toHaveLength(0);

                    // Verify scenario content is present in children
                    const paragraphs = children.filter(
                        (c: { type: string }) => c.type === 'paragraph',
                    );
                    expect(paragraphs.length).toBeGreaterThan(0);
                },
            ),
            { numRuns: 10 },
        );
    });

    /**
     * **Validates: Requirements 3.2**
     *
     * Property 2: Preservation — YouTube type requests create Notion pages successfully
     */
    it('youtube type requests should return 200 and create Notion page with correct properties', async () => {
        await fc.assert(
            fc.asyncProperty(
                youtubeScenarioArb,
                klingPromptsArb,
                marketingArb,
                async (scenario, klingPrompts, marketing) => {
                    mockPagesCreate.mockClear();

                    const body: Record<string, unknown> = {
                        type: 'youtube',
                        theme: '유튜브',
                        scenario,
                        klingPrompts,
                        status: '생성 완료',
                    };
                    if (marketing) body.marketing = marketing;

                    const request = createCloneableRequest(body);
                    const response = await POST(request);

                    expect(response.status).toBe(200);
                    expect(mockPagesCreate).toHaveBeenCalledOnce();

                    const callArgs = mockPagesCreate.mock.calls[0][0];

                    // Verify properties
                    expect(callArgs.properties.Name.title[0].text.content).toBe('유튜브');
                    expect(callArgs.properties['상태'].status.name).toBe('Done');
                    expect(callArgs.properties.channel.select.name).toBe('youtube');

                    // Verify NO image block in children
                    const children = callArgs.children || [];
                    const imageBlocks = children.filter(
                        (c: { type: string }) => c.type === 'image',
                    );
                    expect(imageBlocks).toHaveLength(0);

                    // Verify scenario content exists
                    const paragraphs = children.filter(
                        (c: { type: string }) => c.type === 'paragraph',
                    );
                    expect(paragraphs.length).toBeGreaterThan(0);

                    // Verify klingPrompts code block exists
                    const codeBlocks = children.filter(
                        (c: { type: string; code?: { language: string } }) =>
                            c.type === 'code' && c.code?.language === 'markdown',
                    );
                    expect(codeBlocks.length).toBeGreaterThan(0);
                },
            ),
            { numRuns: 10 },
        );
    });

    /**
     * **Validates: Requirements 3.3**
     *
     * Property 2: Preservation — No imageUrl means no image block in children
     */
    it('requests without imageUrl should never produce an image block in children', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.oneof(fc.constant('card'), fc.constant('youtube')),
                fc.string({ minLength: 1, maxLength: 30 }),
                fc.option(youtubeScenarioArb, { nil: undefined }),
                fc.option(klingPromptsArb, { nil: undefined }),
                marketingArb,
                async (type, theme, scenario, klingPrompts, marketing) => {
                    mockPagesCreate.mockClear();

                    const body: Record<string, unknown> = {
                        type,
                        theme,
                        status: '생성 완료',
                    };
                    if (scenario) body.scenario = scenario;
                    if (klingPrompts) body.klingPrompts = klingPrompts;
                    if (marketing) body.marketing = marketing;
                    // Explicitly NO imageUrl

                    const request = createCloneableRequest(body);
                    const response = await POST(request);

                    expect(response.status).toBe(200);

                    const callArgs = mockPagesCreate.mock.calls[0][0];
                    const children = callArgs.children || [];

                    // No image block should exist
                    const imageBlocks = children.filter(
                        (c: { type: string }) => c.type === 'image',
                    );
                    expect(imageBlocks).toHaveLength(0);
                },
            ),
            { numRuns: 15 },
        );
    });

    /**
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     *
     * Property 2: Preservation — Various field combinations all produce valid Notion pages
     */
    it('various field combinations without imageUrl should all create valid Notion pages', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.oneof(fc.constant('card'), fc.constant('youtube')),
                fc.string({ minLength: 1, maxLength: 30 }),
                fc.option(cardScenarioArb, { nil: undefined }),
                fc.option(klingPromptsArb, { nil: undefined }),
                marketingArb,
                fc.constantFrom('생성 완료', '진행 중', 'Not started'),
                async (type, theme, scenario, klingPrompts, marketing, status) => {
                    mockPagesCreate.mockClear();

                    const body: Record<string, unknown> = {
                        type,
                        theme,
                        status,
                    };
                    if (scenario) body.scenario = scenario;
                    if (klingPrompts) body.klingPrompts = klingPrompts;
                    if (marketing) body.marketing = marketing;

                    const request = createCloneableRequest(body);
                    const response = await POST(request);

                    expect(response.status).toBe(200);

                    const callArgs = mockPagesCreate.mock.calls[0][0];

                    // parent database_id is always correct
                    expect(callArgs.parent.database_id).toBe('test-database-id');

                    // properties always have required fields
                    expect(callArgs.properties.Name.title[0].text.content).toBe(theme);
                    expect(callArgs.properties['상태'].status.name).toBeDefined();
                    expect(callArgs.properties['생성일'].date.start).toBeDefined();
                    expect(callArgs.properties.channel.select.name).toBeDefined();

                    // No image block
                    const children = callArgs.children || [];
                    const imageBlocks = children.filter(
                        (c: { type: string }) => c.type === 'image',
                    );
                    expect(imageBlocks).toHaveLength(0);

                    // System Data heading always present
                    const systemDataHeadings = children.filter(
                        (c: { type: string; heading_3?: { rich_text: Array<{ text: { content: string } }> } }) =>
                            c.type === 'heading_3' &&
                            c.heading_3?.rich_text?.[0]?.text?.content === '⚙️ System Data',
                    );
                    expect(systemDataHeadings).toHaveLength(1);
                },
            ),
            { numRuns: 15 },
        );
    });
});
