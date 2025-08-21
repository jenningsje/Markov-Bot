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

    program.stdin.write(message + "\n");

    // Listen to chat program output
    program.stdout.on("data", (data) => {
      let output = data.toString("utf8");
      output = output.replace(">", "");
      socket.emit("response", { result: "chat_output", output });
    });

    // Fetch all APIs and emit the data
    const apiResults = await fetchAllAPIs();
    socket.emit("response", { result: "api_data", output: apiResults });

    // Optionally stop the program if needed
    // program.kill();
    // program = null;
    // socket.emit("chatend");
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