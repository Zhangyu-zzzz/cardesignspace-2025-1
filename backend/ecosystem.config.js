module.exports = {
  apps: [{
    name: 'cardesignspace-backend',
    script: 'src/app.js',
    cwd: '/root/auto-gallery/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 4000,
    min_uptime: '10s',
    max_restarts: 5
  }]
}; 