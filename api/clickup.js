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

  const { event, task_id, history_items = [] } = req.body;
  if (!['taskAssigneeUpdated', 'taskUpdated', 'taskCreated'].includes(event)) {
    return res.status(200).end();
  }

  for (const item of history_items) {
    const task = item.data || {};
    const taskName = task.name || `Task ${task_id}`;
    const taskUrl = `https://app.clickup.com/t/${task_id}`;
    const now = new Date().toLocaleString();
    const description = task.description || 'No description';
    const status = task.status?.status || 'Unknown';
    const priority = task.priority?.priority || 'No priority';
    const assignees = task.assignees?.map(a => a.username).join(', ') || 'Unassigned';
    const dueDate = task.due_date ? new Date(Number(task.due_date)).toLocaleDateString() : 'No due date';
    const creator = task.creator?.username || 'Unknown';
    const space = task.space?.name || 'Unknown';
    const list = task.list?.name || 'Unknown';
    const folder = task.folder?.name || 'Unknown';

    let title = '';
    let body = '';

    if (event === 'taskAssigneeUpdated') {
      title = `📌 Assigned to you: ${taskName}`;
      body = `## 📌 New ClickUp Assignment\n\n**${taskName}**\n\n| Field | Value |\n|---|---|\n| 📝 Description | ${description} |\n| 👤 Assignees | ${assignees} |\n| 👤 Creator | ${creator} |\n| 📊 Status | ${status} |\n| ⚡ Priority | ${priority} |\n| 📅 Due Date | ${dueDate} |\n| 📁 Space | ${space} |\n| 📂 Folder | ${folder} |\n| 📋 List | ${list} |\n| 🕐 Assigned | ${now} |\n\n> Open in [ClickUp](${taskUrl})`;
    } else if (event === 'taskUpdated') {
      title = `🔄 Updated: ${taskName}`;
      body = `## 🔄 ClickUp Task Updated\n\n**${taskName}**\n\n| Field | Value |\n|---|---|\n| 📝 Description | ${description} |\n| 👤 Assignees | ${assignees} |\n| 📊 Status | ${status} |\n| ⚡ Priority | ${priority} |\n| 📅 Due Date | ${dueDate} |\n| 📁 Space | ${space} |\n| 📂 Folder | ${folder} |\n| 📋 List | ${list} |\n| 📝 Field Changed | ${item.field || 'Unknown'} |\n| 🕐 Updated | ${now} |\n\n> Open in [ClickUp](${taskUrl})`;
    } else if (event === 'taskCreated') {
      title = `🆕 New Task: ${taskName}`;
      body = `## 🆕 New ClickUp Task\n\n**${taskName}**\n\n| Field | Value |\n|---|---|\n| 📝 Description | ${description} |\n| 👤 Assignees | ${assignees} |\n| 👤 Creator | ${creator} |\n| 📊 Status | ${status} |\n| ⚡ Priority | ${priority} |\n| 📅 Due Date | ${dueDate} |\n| 📁 Space | ${space} |\n| 📂 Folder | ${folder} |\n| 📋 List | ${list} |\n| 🕐 Created | ${now} |\n\n> Open in [ClickUp](${taskUrl})`;
    }

    if (title) {
      try {
        await createGitHubIssue(title, body);
        console.log('✅ GitHub issue created:', title);
      } catch (err) {
        console.error('❌ Error:', err.response?.data);
        return res.status(500).json({ error: err.response?.data });
      }
    }
  }

  res.status(200).end();
};
