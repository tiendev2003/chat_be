const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http").Server(app);
const PORT = 4000;
const session = require("express-session");

const socketIO = require("socket.io")(http, {
  cors: "*",
});

app.use(cors());
const sessionMiddleware = session({
  secret: "changeit",
  resave: true,
  saveUninitialized: true,
});
app.use(sessionMiddleware);
socketIO.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

let users = [];
let rooms = [];

app.post("/incr", (req, res) => {
  console.log("req.session", req.session);
  const session = req.session;
  session.count = (session.count || 0) + 1;
  res.status(200).end("" + session.count);

  socketIO.emit("current count", users);
});
socketIO.on("connection", (socket) => {
  const ipAddress = socket.handshake.address;
  console.log(`⚡: ${socket.id} user just connected from IP ${ipAddress}!`);

  socket.on("message", (data) => {
    console.log("🚀: người nhận", data);
    const { ip, message } = data;
    const user = users.find((user) => user.ipAddress === ip);
    if (user) {
      socketIO.to(ip).emit("messageResponse", {
        message,
        ipAddress: ip,
      });
    }
  });

  socket.on("joinRoom", (data) => {
    const { userName, ipAddress } = data;
    console.log("🚀: joinRoom", data);
    socket.join(ipAddress);
    socket.to(ipAddress).emit("messageResponse", {
      userName: "Admin",
      message: `${userName} has joined the chat`,
    });
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
  if (users.length == 0) {
    console.log("🚀: users ne");
    socket.emit("alluser", users);
  }
  // logout
  socket.on("logout", (data) => {
    console.log("🚀: logout", data);
    const { ipAddress } = data;
    users = users.filter((user) => user.ipAddress != ipAddress);
    console.log("🚀: users", users);
  });

  socket.on("disconnect", () => {
    console.log("🔥: A user disconnected");
    // const user = users.find((user) => user.socketID === socket.id);
    // if (user) {
    //   users = users.filter((user) => user.socketID !== socket.id);
    //   socketIO.to(user.ipAddress).emit(
    //     "newUserResponse",
    //     users.filter((u) => u.ipAddress === user.ipAddress)
    //   );
    // }
    socket.disconnect();
  });

  console.log("🚀: users", users);
});
app.get("/api", (req, res) => {
  res.json({ message: "Hello" });
});

app.get("/api/users", (req, res) => {
  const { ip } = req.query;
  const usersByIp = users.filter((user) => user.ipAddress === ip);
  console.log("🚀: usersByIp", usersByIp);
  res.json(usersByIp);
});
http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
