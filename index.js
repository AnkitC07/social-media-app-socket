import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";

const PORT = process.env.PORT || 3001;
const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        // origin: "http://localhost:3000",
        origin: "https://social-media-app-gray-beta.vercel.app",
        methods: ["GET", "POST"],
        credentials: true,
    },
});


let users = [];

io.on("connection", (socket) => {
    console.log(JSON.stringify(socket.handshake.query));
    const user_id = socket.handshake.query["user_id"];
    console.log(`User connected ${socket.id}`);
    console.log("User user_id", user_id);

    if (user_id != null && Boolean(user_id)) {
        try {
            const isUserExist = users.find((user) => user.user_Id === user_id);
            if (!isUserExist) {
                const user = { user_id, socketId: socket.id };
                users.push(user);
                console.log("pushing user", user);
                io.emit("getUsers", users);
            }
        } catch (e) {
            console.log(e);
        }
    }

    // socket.on('addUser', userId => {
    //     const isUserExist = users.find(user => user.userId === userId);
    //     if (!isUserExist) {
    //         const user = { userId, socketId: socket.id };
    //         users.push(user);
    //         io.emit('getUsers', users);
    //     }
    // });
    console.log("connected users", users);

    socket.on("follow", ({ type, senderId, receiverId }) => {
        console.log("Follow :>> ", type, senderId, receiverId);
        const receiver = users.find((e) => e.user_id === receiverId);
        const sender = users.find((e) => e.user_id === senderId);
        console.log("-->", receiver, sender);

        // io.to(receiver?.socketId).to(sender?.socketId).emit("followRequest", {
        //   senderId,
        //   receiverId,
        //   type,
        // });

         io.to(receiver?.socketId).emit("new_friend_request", {
            message: "New friend request received",
            type,
        });
        io.to(sender?.socketId).emit("request_sent", {
            message: "Request Sent successfully!",
            type,
        });
    });

    socket.on("disconnect", () => {
        console.log("disconnected: " + socket.id);
        users = users.filter((user) => user.socketId!== socket.id);
        socket.disconnect();
    });
    // io.disconnectSockets(true)
});

app.use(cors());

app.get("/", (req, res) => {
    res.status(200).send("Hello World!");
});

server.listen(PORT, () => {
    console.log("Server is running on port 3001");
});

export default app;
