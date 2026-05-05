const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const TODOIST_API_TOKEN = process.env.TODOIST_API_TOKEN;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

let lastSyncToken = '*';

async function createGitHubIssue(title, body) {
  await axios.post(GITHUB_API,
    { title, body, assignees: [GITHUB_OWNER] },
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
}

module.exports = async (req, res) => {
  try {
    const response = await axios.post('https://api.todoist.com/sync/v9/sync',
      { sync_token: lastSyncToken, resource_types: '["items"]' },
      { headers: { Authorization: `Bearer ${TODOIST_API_TOKEN}` } }
    );

    const { items, sync_token } = response.data;
    lastSyncToken = sync_token;

    for (const item of items) {
      if (item.is_deleted) continue;

      const priority = { 1: '🔵 Normal', 2: '🟡 Medium', 3: '🟠 High', 4: '🔴 Urgent' };
      const due = item.due?.date || 'No due date';
      const description = item.description || 'No description';

      const title = `[Todoist] 🆕 New Task: ${item.content}`;
      const body = `## 📥 New Todoist Task\n\n**${item.content}**\n\n| Field | Value |\n|---|---|\n| 📝 Description | ${description} |\n| 📅 Due | ${due} |\n| ⚡ Priority | ${priority[item.priority]} |\n| 🕐 Created | ${new Date().toLocaleString()} |`;

      await createGitHubIssue(title, body);
    }

    res.status(200).json({ synced: items.length });
  } catch (err) {
    console.error('❌ Sync error:', err.response?.data || err.message);
    res.status(500).end();
  }
};
