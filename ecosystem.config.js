module.exports = {
  apps: [
    {
      name: 'work-desk-api',
      script: './backend/server.js',
      cwd: '/var/www/work-desk-app',   // change to your deploy path on server
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/work-desk/error.log',
      out_file: '/var/log/work-desk/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
