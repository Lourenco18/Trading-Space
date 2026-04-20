module.exports = function handler(req, res) {
  return res.status(200).json({
    ok: true,
    env: {
      MYSQL_HOST:     process.env.MYSQL_HOST     ? process.env.MYSQL_HOST.substring(0,20)+'...' : 'MISSING',
      MYSQL_USER:     process.env.MYSQL_USER     ? 'SET' : 'MISSING',
      MYSQL_PASSWORD: process.env.MYSQL_PASSWORD ? 'SET' : 'MISSING',
      MYSQL_DATABASE: process.env.MYSQL_DATABASE ? process.env.MYSQL_DATABASE : 'MISSING',
      MYSQL_SSL:      process.env.MYSQL_SSL      || 'not set',
      JWT_SECRET:     process.env.JWT_SECRET     ? 'SET' : 'MISSING',
    }
  });
};
