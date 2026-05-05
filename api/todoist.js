const axios = require('axios');
const crypto = require('crypto');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

async function createGitHubIssue(title, body, labels = []) {
  await axios.post(GITHUB_API, { title, body, labels, assignees: [GITHUB_OWNER] }, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' }
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const hmac = crypto.createHmac('sha256', process.env.TODOIST_CLIENT_SECRET)
    .update(JSON.stringify(req.body)).digest('base64');

  if (hmac !== req.headers['x-todoist-hmac-sha256']) return res.status(401).end();

  res.status(200).end();

  const { event_name, event_data } = req.body;
  const taskContent = event_data?.content || 'Untitled Task';
  const dueDate = event_data?.due?.date || 'No due date';
  const priorityMap = { 1: '🔵 Normal', 2: '🟡 Medium', 3: '🟠 High', 4: '🔴 Urgent' };
  const priority = priorityMap[event_data?.priority] || '🔵 Normal';

  let title = '', body = '';

  if (event_name === 'item:added') {
    title = `[Todoist] 🆕 New Task: ${taskContent}`;
    body = `**Task:** ${taskContent}\n**Due:** ${dueDate}\n**Priority:** ${priority}`;
  } else if (event_name === 'item:updated') {
    title = `[Todoist] 🔄 Task Updated: ${taskContent}`;
    body = `**Task:** ${taskContent}\n**Due:** ${dueDate}\n**Priority:** ${priority}`;
  } else if (event_name === 'item:completed') {
    title = `[Todoist] ✅ Completed: ${taskContent}`;
    body = `**Task:** ${taskContent}\n**Completed:** ${new Date().toISOString()}`;
  }

  if (title) await createGitHubIssue(title, body, ['todoist']);
};
