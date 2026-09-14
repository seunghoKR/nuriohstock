module.exports = {
  apps: [
    {
      name: 'stock-trader',
      script: 'main.py',
      // 로컬 C드라이브 가상환경의 Python 사용 (NAS보다 빠름!)
      interpreter: 'C:/stock_trader/venv/Scripts/python.exe',
      cwd: 'Y:/SynologyDrive/00.withAI/주식자동매매',

      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,

      log_file: 'C:/stock_trader/logs/pm2_combined.log',
      out_file:  'C:/stock_trader/logs/pm2_out.log',
      error_file:'C:/stock_trader/logs/pm2_error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      env: {
        NODE_ENV: 'production',
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8',
      },

      max_memory_restart: '500M',
    }
  ]
};
