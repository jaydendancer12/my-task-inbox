const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { event, task_id, history_items = [] } = req.body;
  if (!['taskAssigneeUpdated', 'taskUpdated', 'taskCreated'].includes(event)) {
    return res.status(200).end();
  }

  for (const item of history_items) {
    const taskName = item.data?.name || `Task ${task_id}`;
    const taskUrl = `https://app.clickup.com/t/${task_id}`;
    const now = new Date().toLocaleString();

    let title = '';
    let body = '';

    if (event === 'taskAssigneeUpdated') {
      title = `📌 Assigned to you: ${taskName}`;
      body = `## 📌 New ClickUp Assignment\n\n**${taskName}**\n\n| Field | Value |\n|---|---|\n| 🆔 Task ID | ${task_id} |\n| 🕐 Assigned | ${now} |\n\n> Open in [ClickUp](${taskUrl})`;
    } else if (event === 'taskUpdated') {
      title = `🔄 Updated: ${taskName}`;
      body = `## 🔄 ClickUp Task Updated\n\n**${taskName}**\n\n| Field | Value |\n|---|---|\n| 🆔 Task ID | ${task_id} |\n| 📝 Field Changed | ${item.field || 'Unknown'} |\n| 🕐 Updated | ${now} |\n\n> Open in [ClickUp](${taskUrl})`;
    } else if (event === 'taskCreated') {
      title = `🆕 New Task: ${taskName}`;
      body = `## 🆕 New ClickUp Task\n\n**${taskName}**\n\n| Field | Value |\n|---|---|\n| 🆔 Task ID | ${task_id} |\n| 🕐 Created | ${now} |\n\n> Open in [ClickUp](${taskUrl})`;
    }

    if (title) {
      try {
        await axios.post(GITHUB_API,
          { title, body, assignees: [GITHUB_OWNER] },
          { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
        );
      } catch (err) {
        console.error('❌ Error:', err.response?.data);
        return res.status(500).json({ error: err.response?.data });
      }
    }
  }

  res.status(200).end();
};
