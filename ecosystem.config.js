module.exports = {
    apps: [
        {
            name: "sourcex-server",
            script: "npm",
            args: "start",
            cwd: "./backend",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "production",
                PORT: 3000
            }
        },
        {
            name: "sourcex-monitor",
            script: "npm",
            args: "run monitor",
            cwd: "./backend",
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: "500M",
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
