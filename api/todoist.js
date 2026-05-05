const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { event_name, event_data } = req.body;
  const taskContent = event_data?.content || 'Untitled Task';

  let title = '';
  if (event_name === 'item:added') title = `[Todoist] 🆕 New Task: ${taskContent}`;
  else if (event_name === 'item:updated') title = `[Todoist] 🔄 Updated: ${taskContent}`;
  else if (event_name === 'item:completed') title = `[Todoist] ✅ Completed: ${taskContent}`;

  if (!title) return res.status(200).end();

  try {
    await axios.post(GITHUB_API,
      { title, body: taskContent, assignees: [GITHUB_OWNER] },
      { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    console.log('✅ GitHub issue created:', title);
    res.status(200).end();
  } catch (err) {
    console.error('❌ GitHub API error:', err.response?.data || err.message);
    res.status(500).end();
  }
};
