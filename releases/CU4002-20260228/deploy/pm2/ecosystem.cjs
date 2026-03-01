module.exports = {
  apps: [
    {
      name: 'cu4002',
      cwd: '/opt/erp/cu4002/app',
      script: 'wizard/Modulo 4/CU4-002/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        CU4002_SQL_LOGS_ALLOWED_USERS: '1'
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      out_file: '/var/log/cu4002/out.log',
      error_file: '/var/log/cu4002/error.log',
      merge_logs: true,
      time: true
    }
  ]
};
