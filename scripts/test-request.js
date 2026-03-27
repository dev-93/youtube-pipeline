const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function run() {
  try {
    const res = await notion.request({
      path: `databases/${process.env.NOTION_DATABASE_ID}/query`,
      method: 'post',
    });
    console.log('Success:', Object.keys(res));
  } catch (e) {
    console.error('Error with relative path:', e.message);
  }
}

run();
