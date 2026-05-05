module.exports = async (req, res) => {
  res.status(200).json({
    GITHUB_TOKEN: process.env.GITHUB_TOKEN ? 'SET' : 'MISSING',
    GITHUB_OWNER: process.env.GITHUB_OWNER ? 'SET' : 'MISSING',
    GITHUB_REPO: process.env.GITHUB_REPO ? 'SET' : 'MISSING',
  });
};
