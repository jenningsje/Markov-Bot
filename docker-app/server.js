import { spawn } from "child_process";
import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { fetchAllAPIs } from "./fetch_get.js";
import fetch from "node-fetch"; // Using fetch in Node

const expressapp = express();
const server = http.createServer(expressapp);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const EXPRESSPORT = 8889;
let numClients = 0;

expressapp.use(
  "/assets",
  express.static(path.join(process.cwd(), "dist/assets"))
);

expressapp.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "dist/index.html"));
});

io.on("connection", (socket) => {
  if (numClients === 1) {
    console.log("Only one client allowed");
    socket.disconnect();
    return;
  }

  numClients++;
  console.log("Client Connected");

  const CHAT_APP_LOCATION = path.join(process.cwd(), "/chat");
  const FILEPATH = path.join(process.cwd(), "/ggml-alpaca-7b-q4.bin");

  let program = spawn(CHAT_APP_LOCATION, ["-m", FILEPATH]);

  socket.on("chatstart", () => {
    program = spawn(CHAT_APP_LOCATION, ["-m", FILEPATH]);
  });

  program.on("error", (err) => {
    console.error(err);
  });

  socket.on("stopResponding", () => {
    if (program) program.kill();
    program = null;
    socket.emit("chatend");
  });

  socket.on("message", async (message) => {
    if (!program) {
      program = spawn(CHAT_APP_LOCATION, ["-m", FILEPATH]);
    }

    // Fetch all APIs and combine their data into a single string
    const apiResults = await fetchAllAPIs();
    let combinedAPIData = '';
    for (const r of apiResults) {
      if (r.success && typeof r.data === 'string') {
        combinedAPIData += r.data + '\n';
      }
    }

    // Feed API data into the chat program for training
    if (combinedAPIData) {
      program.stdin.write(combinedAPIData + '\n');
    }

    // Feed the user's message
    program.stdin.write(message + '\n');

    // Listen to chat program output safely
    program.stdout.on("data", (data) => {
      const output = String(data).replace(/>/g, "");
      socket.emit("response", { result: "chat_output", output });
    });
  });

  socket.on("disconnect", () => {
    numClients--;
    if (program) program.kill();
    program = null;
  });
});

server.listen(EXPRESSPORT, () => {
  console.log(`Server listening on port ${EXPRESSPORT}`);
});

export default expressapp;