module.exports = {
    apps: [
        {
            name: "sourcex-server",
            script: "./src/main.js",
            args: "server",
            cwd: "./backend",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "production"
            }
        },
        {
            name: "sourcex-monitor",
            script: "./src/main.js",
            args: "monitor",
            cwd: "./backend",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            exp_backoff_restart_delay: 100,
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
