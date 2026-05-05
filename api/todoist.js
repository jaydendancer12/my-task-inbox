const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'SET' : 'MISSING');
  console.log('GITHUB_OWNER:', process.env.GITHUB_OWNER);
  console.log('GITHUB_REPO:', process.env.GITHUB_REPO);

  try {
    const result = await axios.post(
      `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/issues`,
      { title: 'TEST ISSUE', body: 'test', assignees: [process.env.GITHUB_OWNER] },
      { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    console.log('✅ Issue created:', result.data.html_url);
    res.status(200).json({ success: true, url: result.data.html_url });
  } catch (err) {
    console.error('❌ Error:', JSON.stringify(err.response?.data));
    res.status(500).json({ error: err.response?.data });
  }
};
