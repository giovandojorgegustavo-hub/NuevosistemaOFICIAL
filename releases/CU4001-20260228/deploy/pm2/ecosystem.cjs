module.exports = {
  apps: [
    {
      name: 'cu4001',
      cwd: '/opt/erp/cu4001/app',
      script: 'wizard/Modulo 4/CU4-001/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production'
      },
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      out_file: '/var/log/cu4001/out.log',
      error_file: '/var/log/cu4001/error.log',
      merge_logs: true,
      time: true
    }
  ]
};
