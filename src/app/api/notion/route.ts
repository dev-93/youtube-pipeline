import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

export const GET = async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (pageId) {
      let hasMore = true;
      let nextCursor: string | undefined = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allBlocks: any[] = [];

      while (hasMore) {
        const blocksResponse = await notion.blocks.children.list({
          block_id: pageId,
          start_cursor: nextCursor,
        });
        allBlocks.push(...blocksResponse.results);
        hasMore = blocksResponse.has_more;
        nextCursor = blocksResponse.next_cursor || undefined;
      }

      // 1. 새로운 저장 포맷(JSON 데이터) 우선 탐색
      let jsonContent = '';
      let isSystemData = false;

      for (const block of allBlocks) {
        if (block.type === 'heading_3' && block.heading_3?.rich_text?.[0]?.text?.content === '⚙️ System Data') {
          isSystemData = true;
        } else if (isSystemData && block.type === 'code' && block.code?.language === 'json') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          jsonContent += block.code.rich_text.map((t: any) => t.plain_text).join('');
        }
      }

      if (jsonContent) {
        return NextResponse.json({ success: true, data: JSON.parse(jsonContent) });
      }

      // 2. 예전 포맷 (텍스트에서 직접 파싱 시도)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const texts = allBlocks.map((b: any) => {
        if (b.type === 'paragraph') return b.paragraph.rich_text.map((t: any) => t.plain_text).join('');
        if (b.type === 'code') return b.code.rich_text.map((t: any) => t.plain_text).join('');
        return '';
      }).filter((t: string) => t.length > 0);

      const fullText = texts.join('\n\n');

      const scenarioMatched = fullText.split('[Card ').slice(1);
      const scenario = scenarioMatched.map(c => {
        const lines = c.split('\n').map(l => l.trim()).filter(l => l);
        const cardNumMatch = lines[0]?.match(/^(\d+)\]/);
        const cardNum = cardNumMatch ? parseInt(cardNumMatch[1], 10) : 0;

        let title = ''; let subtitle = ''; let body = ''; let question = ''; let preview = '';

        if (cardNum === 1) {
          title = lines[1] || ''; subtitle = lines[2] || '';
        } else if (cardNum === 5) {
          question = lines[1] || ''; preview = lines[2] || '';
        } else {
          title = lines[1] || ''; body = lines.slice(2).join('\n') || '';
        }
        return { card: cardNum, title, subtitle, body, question, preview };
      }).filter(c => c.card > 0 && !c.title.includes('Design')); // 디자인 부분과 분리

      const designMatched = fullText.split('[Card ').slice(1);
      const klingPrompts = designMatched.filter(d => d.includes('Gradient:')).map(d => {
        const lines = d.split('\n').map(l => l.trim()).filter(l => l);
        const headerMatch = lines[0]?.match(/^(\d+).*\]/);
        const cardNum = headerMatch ? parseInt(headerMatch[1], 10) : 0;

        const gradientLine = lines.find(l => l.startsWith('Gradient: '));
        const glowLine = lines.find(l => l.startsWith('Glow: '));
        const accentLine = lines.find(l => l.startsWith('Accent: '));

        const gradientFrom = gradientLine ? gradientLine.split('->')[0].replace('Gradient:', '').trim() : '';
        const gradientTo = gradientLine ? (gradientLine.split('->')[1] || '').trim() : '';
        const glowColor = glowLine ? glowLine.replace('Glow:', '').trim() : '';
        const accentColor = accentLine ? accentLine.replace('Accent:', '').trim() : '';
        return { card: cardNum, themeName: 'Extracted Design', gradientFrom, gradientTo, glowColor, accentColor };
      }).filter(c => c.gradientFrom !== '');

      let marketing = null;
      if (fullText.includes('캡션: ')) {
        const captionMatch = fullText.split('캡션: ')[1]?.split('\n\n해시태그: ')[0];
        const hashtagsMatch = fullText.split('해시태그: ')[1]?.split('\n\n')[0];
        if (captionMatch) marketing = { caption: captionMatch.trim(), hashtags: (hashtagsMatch || '').trim() };
      }

      if (scenario.length > 0) {
        return NextResponse.json({ success: true, data: { type: 'card', scenario, klingPrompts, marketing } });
      }

      return NextResponse.json({ success: false, error: '이전 데이터 형식에서 파싱할 수 없는 내용입니다.' });
    }

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
    const { type, theme, scenario, klingPrompts, marketing, status, imageUrl } = await request.json();

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
          name: type === 'card' ? 'insta' : type === 'style' ? 'style' : 'youtube',
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
          rich_text: [{ type: 'text', text: { content: type === 'card' ? '✍️ 카드뉴스 본문' : type === 'style' ? '✨ 추출된 스타일 프롬프트' : '🎬 시나리오' } }],
        },
      });

      const scenarioText = Array.isArray(scenario)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? scenario.map((s: any) => {
          if (s.sceneNumber) return `${s.sceneNumber}. ${s.description}`;
          if (s.card) return `[Card ${s.card}]\n${s.title || s.question || ' '}\n${s.subtitle || s.body || s.preview || ' '}`;
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

    // 스타일 변환 이미지 추가 (type === 'style'인 경우)
    if (imageUrl) {
      children.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🖼️ 결과 이미지' } }],
        },
      });
      children.push({
        object: 'block',
        type: 'image',
        image: {
          type: 'external',
          external: {
            url: imageUrl
          }
        }
      });
    }

    // 시스템 로딩을 위한 숨겨진 원본 데이터 보관용 (style 타입은 데이터가 작으므로 그대로, 나머지는 chunk)
    const rawData = { type, theme, scenario, klingPrompts, marketing };
    // imageUrl은 System Data에서 제외 (base64면 payload가 거대해짐)
    const rawDataString = JSON.stringify(rawData);

    // Notion API payload 제한(~60KB) 초과 방지: 너무 크면 System Data 생략
    if (rawDataString.length < 50000) {
      const chunks = rawDataString.match(/.{1,2000}/g) || [];

      children.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: '⚙️ System Data' } }],
        },
      });

      chunks.forEach((chunk) => {
        children.push({
          object: 'block',
          type: 'code',
          code: {
            language: 'json',
            rich_text: [{ type: 'text', text: { content: chunk } }]
          }
        });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notionBody = (error as any)?.body;
    console.error('Notion Error Details:', notionBody);
    return NextResponse.json({ error: errorMessage, details: notionBody }, { status: 500 });
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
