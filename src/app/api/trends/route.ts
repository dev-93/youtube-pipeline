import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const GET = async () => {
  try {
    const dataPath = path.join(process.cwd(), 'data/trends.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ trends: [] });
    }
    const fileContent = fs.readFileSync(dataPath, 'utf8');
    const trends = JSON.parse(fileContent);
    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Failed to read trends:', error);
    return NextResponse.json({ error: '트렌드 데이터를 불러오는 데 실패했습니다.' }, { status: 500 });
  }
};
