const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  console.log('Incoming Todoist webhook:', JSON.stringify(req.body));

  const { event_name, event_data } = req.body;
  const taskContent = event_data?.content || 'Untitled Task';
  const dueDate = event_data?.due?.date || 'No due date';
  const description = event_data?.description || 'No description';
  const priorityMap = { 1: '🔵 Normal', 2: '🟡 Medium', 3: '🟠 High', 4: '🔴 Urgent' };
  const priority = priorityMap[event_data?.priority] || '🔵 Normal';
  const now = new Date().toLocaleString();

  let title = '';
  let body = '';

  if (event_name === 'item:added') {
    title = `📥 New Task: ${taskContent}`;
    body = `## 📥 New Todoist Task\n\n**${taskContent}**\n\n| Field | Value |\n|---|---|\n| 📝 Description | ${description} |\n| 📅 Due | ${dueDate} |\n| ⚡ Priority | ${priority} |\n| 🕐 Created | ${now} |\n\n> Open in [Todoist](https://app.todoist.com)`;
  } else if (event_name === 'item:updated') {
    title = `✏️ Updated: ${taskContent}`;
    body = `## ✏️ Task Updated\n\n**${taskContent}**\n\n| Field | Value |\n|---|---|\n| 📝 Description | ${description} |\n| 📅 Due | ${dueDate} |\n| ⚡ Priority | ${priority} |\n| 🕐 Updated | ${now} |\n\n> Open in [Todoist](https://app.todoist.com)`;
  } else if (event_name === 'item:completed') {
    title = `✅ Completed: ${taskContent}`;
    body = `## ✅ Task Completed\n\n**${taskContent}**\n\n| Field | Value |\n|---|---|\n| 📝 Description | ${description} |\n| 🕐 Completed | ${now} |\n\n> Open in [Todoist](https://app.todoist.com)`;
  }

  if (!title) return res.status(200).end();

  try {
    await axios.post(GITHUB_API,
      { title, body, assignees: [GITHUB_OWNER] },
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    console.log('✅ GitHub issue created:', title);
    res.status(200).end();
  } catch (err) {
    console.error('❌ Error:', err.response?.data);
    res.status(500).end();
  }
};
