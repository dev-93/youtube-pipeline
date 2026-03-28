import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export const GET = async () => {
  try {
    const response = await notion.databases.query({
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
    const { type, theme, scenario, klingPrompts, marketing, status } = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: any = {
      'Name': {
        title: [
          {
            text: {
              content: theme,
            },
          },
        ],
      },
      '상태': {
        status: {
          name: status === '생성 완료' ? 'Done' : status === '진행 중' ? 'In progress' : 'Not started',
        },
      },
      '생성일': {
        date: {
          start: new Date().toISOString(),
        },
      },
      'channel': {
        select: {
          name: type === 'card' ? 'insta' : 'youtube',
        },
      },
    };

    // 테이블 속성(컬럼)에 직접 넣는 부분은 에러(property that does not exist)를
    // 방지하기 위해 제거하고, 모든 내용은 이전처럼 페이지 본문(children)에만 깔끔하게 넣습니다.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: any[] = [];

    // 시나리오 본문에 추가
    if (scenario) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: type === 'card' ? '✍️ 카드뉴스 본문' : '🎬 시나리오' } }],
        },
      });
      
      const scenarioText = Array.isArray(scenario) 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? scenario.map((s: any) => {
            if (s.sceneNumber) return `${s.sceneNumber}. ${s.description}`;
            if (s.card) return `[Card ${s.card}]\n${s.title || s.question ||' '}\n${s.subtitle || s.body || s.preview || ' '}`;
            return JSON.stringify(s);
          }).join('\n\n')
        : scenario;

      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: scenarioText.substring(0, 2000) } }],
        },
      });
      
      if (scenarioText.length > 2000) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: scenarioText.substring(2000, 4000) } }],
          },
        });
      }
    }

    // 프롬프트 본문에 코드 블록으로 추가
    if (klingPrompts) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🖼️ 생성 프롬프트' } }],
        },
      });

          const promptText = Array.isArray(klingPrompts)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? klingPrompts.map((p: any) => {
            if (p.sceneNumber) return `[Scene ${p.sceneNumber}]\n${p.englishPrompt}`;
            if (p.card) return `[Card ${p.card} - ${p.themeName || 'Design'}]\nGradient: ${p.gradientFrom} -> ${p.gradientTo}\nGlow: ${p.glowColor}\nAccent: ${p.accentColor}`;
            return JSON.stringify(p);
          }).join('\n\n')
        : klingPrompts;

      children.push({
        object: 'block',
        type: 'code',
        code: {
          language: 'markdown',
          rich_text: [{ type: 'text', text: { content: promptText.substring(0, 2000) } }],
        },
      });
    }

    // 마케팅 정보 추가
    if (marketing) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '📱 마케팅 정보' } }],
        },
      });

      const marketingText = marketing.caption
        ? `캡션: ${marketing.caption}\n\n해시태그: ${marketing.hashtags}`
        : `제목: ${marketing.title}\n\n해시태그: ${marketing.hashtags}\n\n설명: ${marketing.description}`;
      
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: marketingText } }],
        },
      });
    }

    const response = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties,
      children: children.length > 0 ? children : undefined,
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
