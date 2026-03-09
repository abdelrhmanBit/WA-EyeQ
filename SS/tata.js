const { spawn } = require("child_process");
function startBot() {
  const bot = spawn("node", ["./SS/fuckpalant1r.js"], { stdio: "inherit" });
  bot.on("exit", (code, signal) => {
    startBot();
  });
}

startBot();
