import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const savePath = path.join(process.cwd(), 'data.json');
// 替换成你自己的 AlphaVantage key
const AV_KEY = "你的AlphaVantageKey";
// 汇率，可后续改成自动抓取，现在先写固定
const RATE_USD_CNY = 7.2;

// 抓取LME金银（Alpha Vantage）
async function fetchGoldSilver() {
  try {
    const goldUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAU&to_currency=USD&apikey=${AV_KEY}`;
    const silverUrl = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=XAG&to_currency=USD&apikey=${AV_KEY}`;
    const [gRes, sRes] = await Promise.all([axios.get(goldUrl), axios.get(silverUrl)]);
    return {
      gold: gRes.data["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"] ?? null,
      silver: sRes.data["Realtime Currency Exchange Rate"]?.["5. Exchange Rate"] ?? null
    };
  } catch (e) {
    console.error("金银抓取失败", e.message);
    return { gold: null, silver: null };
  }
}

// 抓取SMM沪有色：铜、锡、铅、锌
async function fetchSMM() {
  const result = {
    cu_tax: null, cu_no_tax: null,
    sn_tax: null, sn_no_tax: null,
    pb_tax: null, pb_no_tax: null,
    zn_tax: null, zn_no_tax: null
  };
  try {
    // SMM现货行情页
    const url = "https://www.smm.cn/";
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 15000
    });
    const $ = cheerio.load(res.data);
    // 匹配现货报价（SMM首页现货板块，根据页面结构选取）
    const map = {
      "沪铜": "cu",
      "沪锡": "sn",
      "沪铅": "pb",
      "沪锌": "zn"
    };
    $(".price-table tr").each((_, el) => {
      const name = $(el).find("td:first").text().trim();
      const priceText = $(el).find("td:nth-child(2)").text().trim();
      if (!map[name]) return;
      const num = parseFloat(priceText.replace(/,/g, ""));
      if (isNaN(num)) return;
      const key = map[name];
      result[`${key}_tax`] = num;
      result[`${key}_no_tax`] = (num / 1.13).toFixed(2);
    });
  } catch (e) {
    console.error("SMM抓取失败", e.message);
  }
  return result;
}

async function run() {
  const [smmData, lmeData] = await Promise.all([fetchSMM(), fetchGoldSilver()]);
  const output = {
    updateTime: new Date().toLocaleString("zh-CN"),
    rate: RATE_USD_CNY,
    SMM: smmData,
    LME: lmeData
  };
  fs.writeFileSync(savePath, JSON.stringify(output, null, 2));
  console.log("✅抓取完成", output);
}

run().catch(console.error);
export { run };