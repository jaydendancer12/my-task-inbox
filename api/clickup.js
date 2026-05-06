const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const CLICKUP_API_TOKEN = process.env.CLICKUP_API_TOKEN;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

async function getTaskDetails(taskId) {
  const res = await axios.get(`https://api.clickup.com/api/v2/task/${taskId}`, {
    headers: { Authorization: CLICKUP_API_TOKEN }
  });
  return res.data;
}

async function createGitHubIssue(title, body) {
  await axios.post(GITHUB_API,
    { title, body, assignees: [GITHUB_OWNER] },
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
  );
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { event, task_id, history_items = [] } = req.body;
  if (!['taskAssigneeUpdated', 'taskUpdated', 'taskCreated', 'taskStatusUpdated'].includes(event)) {
    return res.status(200).end();
  }

  let task;
  try {
    task = await getTaskDetails(task_id);
  } catch (err) {
    console.error('❌ Failed to fetch task:', err.response?.data);
    return res.status(500).end();
  }

  const taskName = task.name || `Task ${task_id}`;
  const taskUrl = task.url || `https://app.clickup.com/t/${task_id}`;
  const description = task.description || 'No description';
  const status = task.status?.status || 'Unknown';
  const priority = task.priority?.priority || 'No priority';
  const assignees = task.assignees?.map(a => a.username).join(', ') || 'Unassigned';
  const dueDate = task.due_date ? new Date(Number(task.due_date)).toLocaleDateString() : 'No due date';
  const creator = task.creator?.username || 'Unknown';
  const space = task.space?.name || 'Unknown';
  const list = task.list?.name || 'Unknown';
  const folder = task.folder?.name || 'Unknown';
  const now = new Date().toLocaleString();

  for (const item of history_items) {
    const oldStatus = item.before?.status || 'Unknown';
    const newStatus = item.after?.status || status;

    let title = '';
    let body = '';

    if (event === 'taskStatusUpdated') {
      title = `🔁 Status Changed: ${taskName}`;
      body = `## 🔁 ClickUp Status Change\n\n**${taskName}**\n\n| Field | Value |\n|---|---|\n| 📊 Old Status | ${oldStatus} |\n| 📊 New Status | ${newStatus} |\n| 👤 Assignees | ${assignees} |\n| ⚡ Priority | ${priority} |\n| 📅 Due Date | ${dueDate} |\n| 📁 Space | ${space} |\n| 📋 List | ${list} |\n| 🕐 Updated | ${now} |\n\n> Open in [ClickUp](${taskUrl})`;
    } else if (event === 'taskAssigneeUpdated') {
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
        return res.status(500).end();
      }
    }
  }

  res.status(200).end();
};
