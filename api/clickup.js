const axios = require('axios');

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
  res.status(200).end();

  const { event, task_id, history_items = [] } = req.body;
  if (!['taskAssigneeUpdated', 'taskUpdated', 'taskCreated'].includes(event)) return;

  for (const item of history_items) {
    const taskName = item.data?.name || `Task ${task_id}`;
    let title = '', body = '';

    if (event === 'taskAssigneeUpdated') {
      title = `[ClickUp] 📌 Assigned to you: ${taskName}`;
      body = `**Task ID:** ${task_id}\n**ClickUp Link:** https://app.clickup.com/t/${task_id}`;
    } else if (event === 'taskUpdated') {
      title = `[ClickUp] 🔄 Task Updated: ${taskName}`;
      body = `**Task ID:** ${task_id}\n**Field:** ${item.field}\n**ClickUp Link:** https://app.clickup.com/t/${task_id}`;
    } else if (event === 'taskCreated') {
      title = `[ClickUp] 🆕 New Task: ${taskName}`;
      body = `**Task ID:** ${task_id}\n**ClickUp Link:** https://app.clickup.com/t/${task_id}`;
    }

    if (title) await createGitHubIssue(title, body, ['clickup']);
  }
};
