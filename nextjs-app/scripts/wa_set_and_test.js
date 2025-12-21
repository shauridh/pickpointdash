const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const https = require('https');

function parseDotenv(envPath) {
  const res = {};
  if (!fs.existsSync(envPath)) return res;
  const txt = fs.readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith('#')) continue;
    const eq = l.indexOf('=');
    if (eq === -1) continue;
    const k = l.slice(0, eq).trim();
    let v = l.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    res[k] = v;
  }
  return res;
}

async function upsertSettings(prisma, settings) {
  for (const { key, value } of settings) {
    try {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      console.log('Upserted', key);
    } catch (err) {
      console.error('DB upsert error for', key, err.message || err);
      throw err;
    }
  }
}

function postJson(url, json) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(url);
      const opts = {
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + (u.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(json),
        },
      };
      const req = https.request(opts, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', (e) => reject(e));
      req.write(json);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  const root = path.resolve(__dirname, '..');
  const env = parseDotenv(path.join(root, '.env'));
  const DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL not found in environment or .env');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  const endpoint = 'https://seen.getsender.id/send-message';
  const apiKey = 'yBMXcDk5iWz9MdEmyu8eBH2uhcytui';
  const sender = '6285777875132';
  const number = sender;
  const message = 'Server-side test message from script';

  try {
    await upsertSettings(prisma, [
      { key: 'waEndpoint', value: endpoint },
      { key: 'waApiKey', value: apiKey },
      { key: 'waSender', value: sender },
    ]);

    console.log('\nCalling provider directly with JSON payload...');
    const payload = JSON.stringify({ api_key: apiKey, sender, number, message, full: 1 });
    const result = await postJson(endpoint, payload);
    console.log('Provider response status:', result.status);
    console.log('Provider response body:', result.body);
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();
