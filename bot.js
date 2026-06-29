const https = require('https');

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

if (!token || !chatId) {
  console.error('Error: BOT_TOKEN and CHAT_ID environment variables are required.');
  console.error('Example: BOT_TOKEN=123:ABC CHAT_ID=123456789 node bot.js');
  process.exit(1);
}

const baseUrl = 'https://stormstomp.github.io/Boka_plane/';
const appUrl = `${baseUrl}?v=${Date.now()}`;

const body = JSON.stringify({
  chat_id: chatId,
  text: 'Запустить Boka game',
  reply_markup: {
    inline_keyboard: [[
      {
        text: 'Открыть игру',
        web_app: {
          url: appUrl
        }
      }
    ]]
  }
});

const options = {
  hostname: 'api.telegram.org',
  path: `/bot${token}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Response:', res.statusCode);
    console.log(data);
  });
});

req.on('error', (err) => {
  console.error('Request failed:', err.message);
});

req.write(body);
req.end();
