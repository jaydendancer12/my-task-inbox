const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

async function createGitHubIssue(title, body) {
  await axios.post(GITHUB_API,
    { title, body, assignees: [GITHUB_OWNER] },
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // Slack URL verification challenge
  if (req.body.type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  const event = req.body.event;
  if (!event) return res.status(200).end();

  const now = new Date().toLocaleString();
  let title = '';
  let body = '';

  if (event.type === 'message' && event.channel_type === 'im') {
    if (event.bot_id) return res.status(200).end();
    title = `💬 New DM on Slack`;
    body = `## 💬 Direct Message\n\n**Message:** ${event.text}\n\n| Field | Value |\n|---|---|\n| 👤 From | <@${event.user}> |\n| 🕐 Received | ${now} |\n\n> Open in [Slack](https://slack.com/app_redirect?channel=${event.channel})`;
  } else if (event.type === 'app_mention') {
    title = `🔔 You were mentioned in Slack`;
    body = `## 🔔 Slack Mention\n\n**Message:** ${event.text}\n\n| Field | Value |\n|---|---|\n| 👤 From | <@${event.user}> |\n| 📢 Channel | <#${event.channel}> |\n| 🕐 Received | ${now} |\n\n> Open in [Slack](https://slack.com/app_redirect?channel=${event.channel})`;
  } else if (event.type === 'message' && event.channel_type === 'channel') {
    if (event.bot_id || event.subtype) return res.status(200).end();
    title = `📢 New Slack Message`;
    body = `## 📢 Channel Message\n\n**Message:** ${event.text}\n\n| Field | Value |\n|---|---|\n| 👤 From | <@${event.user}> |\n| 📢 Channel | <#${event.channel}> |\n| 🕐 Received | ${now} |\n\n> Open in [Slack](https://slack.com/app_redirect?channel=${event.channel})`;
  }

  if (!title) return res.status(200).end();

  try {
    await createGitHubIssue(title, body);
    console.log('✅ GitHub issue created:', title);
    res.status(200).end();
  } catch (err) {
    console.error('❌ Error:', err.response?.data);
    res.status(500).end();
  }
};
