require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

// ─── Helper: Create a GitHub Issue ───────────────────────────────────────────
async function createGitHubIssue(title, body, labels = []) {
  try {
    const res = await axios.post(
      GITHUB_API,
      {
        title,
        body,
        labels,
        assignees: [GITHUB_OWNER], // assigns to YOU → triggers notification
      },
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );
    console.log(`✅ GitHub Issue created: ${res.data.html_url}`);
  } catch (err) {
    console.error('❌ Failed to create GitHub issue:', err.response?.data || err.message);
  }
}

// ─── CLICKUP WEBHOOK ─────────────────────────────────────────────────────────
app.post('/clickup', async (req, res) => {
  res.sendStatus(200); // Acknowledge immediately

  const payload = req.body;
  const event = payload.event;

  // Only act on assignment or update events
  if (!['taskAssigneeUpdated', 'taskUpdated', 'taskCreated'].includes(event)) return;

  const taskId = payload.task_id;
  const historyItems = payload.history_items || [];

  for (const item of historyItems) {
    const field = item.field;
    const after = item.after;
    const taskName = item.data?.name || `Task ${taskId}`;

    let title = '';
    let body = '';

    if (event === 'taskAssigneeUpdated') {
      title = `[ClickUp] 📌 Assigned to you: ${taskName}`;
      body = `**Task ID:** ${taskId}\n**Event:** Assignee updated\n**ClickUp Link:** https://app.clickup.com/t/${taskId}`;
    } else if (event === 'taskUpdated') {
      title = `[ClickUp] 🔄 Task Updated: ${taskName}`;
      body = `**Task ID:** ${taskId}\n**Field Changed:** ${field}\n**New Value:** ${JSON.stringify(after)}\n**ClickUp Link:** https://app.clickup.com/t/${taskId}`;
    } else if (event === 'taskCreated') {
      title = `[ClickUp] 🆕 New Task: ${taskName}`;
      body = `**Task ID:** ${taskId}\n**ClickUp Link:** https://app.clickup.com/t/${taskId}`;
    }

    if (title) {
      await createGitHubIssue(title, body, ['clickup', event]);
    }
  }
});

// ─── TODOIST WEBHOOK ──────────────────────────────────────────────────────────
app.post('/todoist', async (req, res) => {
  // Verify Todoist signature
  const hmac = crypto
    .createHmac('sha256', process.env.TODOIST_CLIENT_SECRET)
    .update(JSON.stringify(req.body))
    .digest('base64');

  if (hmac !== req.headers['x-todoist-hmac-sha256']) {
    console.warn('⚠️ Invalid Todoist signature');
    return res.sendStatus(401);
  }

  res.sendStatus(200); // Acknowledge immediately

  const { event_name, event_data } = req.body;

  const taskContent = event_data?.content || 'Untitled Task';
  const taskId = event_data?.id;
  const dueDate = event_data?.due?.date || 'No due date';
  const priority = event_data?.priority || 1;
  const priorityMap = { 1: '🔵 Normal', 2: '🟡 Medium', 3: '🟠 High', 4: '🔴 Urgent' };

  let title = '';
  let body = '';

  if (event_name === 'item:added') {
    title = `[Todoist] 🆕 New Task: ${taskContent}`;
    body = `**Task:** ${taskContent}\n**Due:** ${dueDate}\n**Priority:** ${priorityMap[priority]}\n**Task ID:** ${taskId}`;
  } else if (event_name === 'item:updated') {
    title = `[Todoist] 🔄 Task Updated: ${taskContent}`;
    body = `**Task:** ${taskContent}\n**Due:** ${dueDate}\n**Priority:** ${priorityMap[priority]}\n**Task ID:** ${taskId}`;
  } else if (event_name === 'item:completed') {
    title = `[Todoist] ✅ Task Completed: ${taskContent}`;
    body = `**Task:** ${taskContent}\n**Completed on:** ${new Date().toISOString()}\n**Task ID:** ${taskId}`;
  }

  if (title) {
    await createGitHubIssue(title, body, ['todoist', event_name.replace(':', '-')]);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
