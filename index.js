const express = require("express");
const app = express();
const cors = require("cors");

const http = require("http").Server(app);
const PORT = 4000;
const socketIO = require("socket.io")(http, {
  cors: "*",
});

app.use(cors());
let users = [];

socketIO.on("connection", (socket) => {
  const clientIP =
    socket.handshake.address?.address ||
    socket.request.connection.remoteAddress;
  const isLocalhost = clientIP === "::1" || clientIP === "127.0.0.1";

  console.log(
    `New client ${
      isLocalhost ? "from localhost" : "connected from IP:"
    } ${clientIP}`
  );

  socket.on("message", (data) => {
    console.log("🚀: message", data);
    const { ip, message } = data;
    const user = users.find((user) => user.ipAddress === ip);
    if (user) {
      socketIO.to(user.socketID).emit("messageResponse", message);
    }
  });

  socket.on("typing", (data) => {
    const { ip, user: typingUser } = data;
    const user = users.find((user) => user.ipAddress === ip);
    if (user) {
      socket.to(user.socketID).emit("typingResponse", typingUser);
    }
  });

  socket.on("newUser", (data) => {
    console.log("🚀: newUser", data);
    const { userName, ipAddress } = data;
    users.push({ userName, socketID: socket.id, ipAddress });
    socket.join(ipAddress);
    socketIO.to(ipAddress).emit(
      "newUserResponse",
      users.filter((user) => user.ipAddress === ipAddress)
    );
  });

  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
    const user = users.find((user) => user.socketID === socket.id);
    if (user) {
      users = users.filter((user) => user.socketID !== socket.id);
      socketIO.to(user.ipAddress).emit(
        "newUserResponse",
        users.filter((u) => u.ipAddress === user.ipAddress)
      );
    }
    socket.disconnect();
  });
  console.log("🚀: users", users);
});

app.get("/api", (req, res) => {
  res.json({ message: "Hello" });
});

app.get("/api/users", (req, res) => {
  const { ip } = req.query;
  console.log("🚀: ip", ip);
  const usersByIp = users.filter((user) => user.ipAddress === ip);
  console.log("🚀: usersByIp", users);
  res.json(usersByIp);
});

http.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
