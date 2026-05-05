const axios = require('axios');
const crypto = require('crypto');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;

async function createGitHubIssue(title, body) {
  await axios.post(GITHUB_API,
    { title, body, assignees: [GITHUB_OWNER] },
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
}

function verifySlackSignature(req) {
  const timestamp = req.headers['x-slack-request-timestamp'];
  const signature = req.headers['x-slack-signature'];
  const base = `v0:${timestamp}:${JSON.stringify(req.body)}`;
  const hash = `v0=` + crypto.createHmac('sha256', SLACK_SIGNING_SECRET).update(base).digest('hex');
  return hash === signature;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Slack URL verification challenge
  if (req.body.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  // Verify signature
  if (!verifySlackSignature(req)) {
    return res.status(401).end();
  }

  const event = req.body.event;
  if (!event) return res.status(200).end();

  const now = new Date().toLocaleString();
  let title = '';
  let body = '';

  // Direct message
  if (event.type === 'message' && event.channel_type === 'im') {
    if (event.bot_id) return res.status(200).end(); // ignore bots
    title = `💬 New DM on Slack`;
    body = `## 💬 Direct Message\n\n**Message:** ${event.text}\n\n| Field | Value |\n|---|---|\n| 👤 From | <@${event.user}> |\n| 🕐 Received | ${now} |\n\n> Open in [Slack](https://slack.com/app_redirect?channel=${event.channel})`;
  }

  // Mention in a channel
  else if (event.type === 'app_mention') {
    title = `🔔 You were mentioned in Slack`;
    body = `## 🔔 Slack Mention\n\n**Message:** ${event.text}\n\n| Field | Value |\n|---|---|\n| 👤 From | <@${event.user}> |\n| 📢 Channel | <#${event.channel}> |\n| 🕐 Received | ${now} |\n\n> Open in [Slack](https://slack.com/app_redirect?channel=${event.channel})`;
  }

  // Message in any channel
  else if (event.type === 'message' && event.channel_type === 'channel') {
    if (event.bot_id || event.subtype) return res.status(200).end(); // ignore bots and edits
    title = `📢 New Slack Message`;
    body = `## 📢 Channel Message\n\n**Message:** ${event.text}\n\n| Field | Value |\n|---|---|\n| 👤 From | <@${event.user}> |\n| 📢 Channel | <#${event.channel}> |\n| 🕐 Received | ${now} |\n\n> Open in [Slack](https://slack.com/app_redirect?channel=${event.channel})`;
  }

  if (!title) return res.status(200).end();

  try {
    await createGitHubIssue(title, body);
    res.status(200).end();
  } catch (err) {
    console.error('❌ Error:', err.response?.data);
    res.status(500).end();
  }
};
