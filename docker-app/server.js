import { spawn } from "child_process";
import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { fetchAllAPIs } from "./fetch_get.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPRESSPORT = 8889;
const expressapp = express();
const server = http.createServer(expressapp);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ----- Serve static frontend correctly -----
expressapp.use(
  "/assets",
  express.static(path.join(__dirname, "dist/assets"))
);

expressapp.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist/index.html"));
});

// ----- API caching -----
let combinedAPIData = '';

async function refreshAPIs() {
  try {
    console.log("Fetching API data...");
    const apiResults = await fetchAllAPIs();
    combinedAPIData = apiResults
      .filter(r => r.success && r.data)
      .map(r => typeof r.data === 'object' ? JSON.stringify(r.data) : String(r.data))
      .join('\n');
    console.log("API data cached successfully.");
  } catch (err) {
    console.error("Error refreshing APIs:", err);
  }
}

// Initial fetch
await refreshAPIs();

// Refresh every hour
setInterval(refreshAPIs, 60 * 60 * 1000);

// ----- Socket.IO handling -----
io.on("connection", (socket) => {
  console.log("Client connected");

  const CHAT_APP_LOCATION = path.join(__dirname, "/chat");
  const FILEPATH = path.join(__dirname, "/ggml-alpaca-7b-q4.bin");

  // Spawn chat program for this client
  let program = spawn(CHAT_APP_LOCATION, ["-m", FILEPATH]);

  // Single stdout listener
  program.stdout.on("data", (data) => {
    const output = String(data).replace(/>/g, "");
    socket.emit("response", { result: "chat_output", output });
  });

  program.on("error", (err) => {
    console.error("Chat program error:", err);
  });

  socket.on("chatstart", () => {
    if (!program || program.killed) {
      program = spawn(CHAT_APP_LOCATION, ["-m", FILEPATH]);
      program.stdout.on("data", (data) => {
        const output = String(data).replace(/>/g, "");
        socket.emit("response", { result: "chat_output", output });
      });
    }
  });

  socket.on("stopResponding", () => {
    if (program && !program.killed) {
      program.kill();
    }
    program = null;
    socket.emit("chatend");
  });

  socket.on("message", async (message) => {
    if (!program || program.killed) {
      program = spawn(CHAT_APP_LOCATION, ["-m", FILEPATH]);
      program.stdout.on("data", (data) => {
        const output = String(data).replace(/>/g, "");
        socket.emit("response", { result: "chat_output", output });
      });
    }

    if (program.stdin.writable) {
      if (combinedAPIData) {
        program.stdin.write(combinedAPIData + "\n");
      }
      program.stdin.write(message + "\n");
    } else {
      console.warn("Chat program stdin not writable, skipping message.");
    }
  });

  socket.on("disconnect", () => {
    if (program && !program.killed) program.kill();
    program = null;
    console.log("Client disconnected");
  });
});

server.listen(EXPRESSPORT, () => {
  console.log(`Server listening on port ${EXPRESSPORT}`);
});

export default expressapp;
