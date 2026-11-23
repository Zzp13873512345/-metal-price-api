import { run } from '../cron/crawl.js';

export default async function handler(req, res) {
  await run();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ msg: "crawl trigger ok" });
}
