import fetch from "node-fetch";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = () => {
  rl.question("👉 Toi: ", async (prompt) => {
    const response = await fetch("http://144.91.96.142:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "qwen3.5:9b",
        prompt,
        stream: false
      })
    });

    const data = await response.json();
    console.log("\n🤖 IA:", data.response, "\n");

    ask();
  });
};

ask();