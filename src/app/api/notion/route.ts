import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export const GET = async () => {
  try {
    const response = await (notion as any).databases.query({
      database_id: DATABASE_ID,
      sorts: [
        {
          property: '생성일',
          direction: 'descending',
        },
      ],
    });
    return NextResponse.json(response.results);
  } catch (error) {
    console.error('Notion API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  try {
    const { theme, scenario, klingPrompts, marketing, status } = await request.json();

    const properties: Record<string, any> = {
      '주제': {
        title: [
          {
            text: {
              content: theme,
            },
          },
        ],
      },
      '상태': {
        select: {
          name: status || '아이디어',
        },
      },
      '생성일': {
        date: {
          start: new Date().toISOString(),
        },
      },
    };

    if (scenario) {
      properties['시나리오'] = {
        rich_text: [
          {
            text: {
              content: Array.isArray(scenario) 
                ? scenario.map((s: { sceneNumber: number; description: string }) => `${s.sceneNumber}. ${s.description}`).join('\n')
                : scenario,
            },
          },
        ],
      };
    }

    if (klingPrompts) {
      properties['프롬프트'] = {
        rich_text: [
          {
            text: {
              content: Array.isArray(klingPrompts)
                ? klingPrompts.map((p: { sceneNumber: number; englishPrompt: string }) => `Scene ${p.sceneNumber}: ${p.englishPrompt}`).join('\n')
                : klingPrompts,
            },
          },
        ],
      };
    }

    if (marketing) {
      properties['마케팅 데이터'] = {
        rich_text: [
          {
            text: {
              content: `제목: ${marketing.title}\n해시태그: ${marketing.hashtags}\n설명: ${marketing.description}`,
            },
          },
        ],
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('Notion API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};

export const DELETE = async (request: Request) => {
  try {
    const { pageId } = await request.json();
    const response = await notion.pages.update({
      page_id: pageId,
      archived: true,
    });
    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
};
