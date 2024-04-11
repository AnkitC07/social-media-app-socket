import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import { Server } from "socket.io";
import { createServer } from "http";
import User from "./models/userModel.js";
import OneToOneMessage from "./models/OneToOneMessage.js";
dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();
const server = createServer(app);
const url = "https://social-media-app-gray-beta.vercel.app";
// const url = "https://social-media-app-gray-beta.vercel.app";

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        // credentials: true,
    },
});
mongoose
    .connect(process.env.MONGO_URI, {
        // useNewUrlParser: true, // The underlying MongoDB driver has deprecated their current connection string parser. Because this is a major change, they added the useNewUrlParser flag to allow users to fall back to the old parser if they find a bug in the new parser.
        // useCreateIndex: true, // Again previously MongoDB used an ensureIndex function call to ensure that Indexes exist and, if they didn't, to create one. This too was deprecated in favour of createIndex . the useCreateIndex option ensures that you are using the new function calls.
        // useFindAndModify: false, // findAndModify is deprecated. Use findOneAndUpdate, findOneAndReplace or findOneAndDelete instead.
        // useUnifiedTopology: true, // Set to true to opt in to using the MongoDB driver's new connection management engine. You should set this option to true , except for the unlikely case that it prevents you from maintaining a stable connection.
    })
    .then((con) => {
        console.log("DB Connection successful");
    })
    .catch((err) => {
        console.log("DB Connection Error ", err);
    });

let users = [];
let user;

io.on("connection", async (socket) => {
    console.log(JSON.stringify(socket.handshake.query));
    const user_id = socket.handshake.query["user_id"];
    console.log(`User connected ${socket.id}`);
    console.log("User user_id", user_id);

    if (user_id != null && Boolean(user_id)) {
        try {
            console.log("-----");
            user = await User.findByIdAndUpdate(
                user_id,
                {
                    socket_id: socket.id,
                    isActive: true,
                },
                {
                    new: true,
                }
            );
            const isUserExist = users.find((user) => user.user_Id === user_id);
            if (!isUserExist) {
                const user = { user_id, socketId: socket.id };
                users.push(user);
                // console.log("pushing user", user);
                // io.emit("getUsers", users);
            }
            console.log("user connected:", user.socket_id);
        } catch (e) {
            console.log(e);
        }
    }
    console.log("connected users", users);

    socket.on("follow", async ({ type, token, senderId, receiverId }) => {
        console.log("Follow :>> ", type, token, senderId, receiverId);
        const receiver = users.find((e) => e.user_id === receiverId);
        const sender = users.find((e) => e.user_id === senderId);
        console.log("-->", receiver, sender);

        // io.to(receiver?.socketId).to(sender?.socketId).emit("followRequest", {
        //   senderId,
        //   receiverId,
        //   type,
        // });
        if (type === "follow") {
            // const response = await fetch(
            //     "https://social-media-app-gray-beta.vercel.app/api/getuser?id=" + sender.user_id,
            //     {
            //         credentials: "include",
            //         headers: {
            //             token: token.value,
            //         },
            //     }
            // );
            // const userData = await response.json();
            const userData = await User.findOne( { _id: sender?.user_id }).select("username");
            console.log("userdata->", userData);
            io.to(receiver?.socketId).emit("new_friend_request", {
                message: `${userData?.username} started following you`,
                username: userData?.username,
            });
        }
        io.to(sender?.socketId).emit("request_sent", {
            message: "Request Sent successfully!",
            type,
        });
    });

    // Gets the list of conversatio of users
    socket.on("get_direct_conversations", async ({ user_id }, callback) => {
        
        console.log("get_direct_conversations: ", user_id);

        const existing_conversations = await OneToOneMessage.find({
            participants: { $all: [user_id] },
        }).populate("participants", "fullName username avatar _id email isActive");

        // db.books.find({ authors: { $elemMatch: { name: "John Smith" } } })

        console.log(existing_conversations);

        callback(existing_conversations);
    });

    // Start of the conversation between two users
    socket.on("start_conversation", async (data) => {
        // data: {to: from:}
        console.log("start_conversation:", data);
        const { to, from } = data;

        // check if there is any existing conversation

        const existing_conversations = await OneToOneMessage.find({
            participants: { $size: 2, $all: [to, from] },
        }).populate("participants", "fullName username avatar _id email isActive");

        console.log(existing_conversations[0], "Existing Conversation");

        // if no => create a new OneToOneMessage doc & emit event "start_chat" & send conversation details as payload
        if (existing_conversations.length === 0) {
            let new_chat = await OneToOneMessage.create({
                participants: [to, from],
            });

            new_chat = await OneToOneMessage.findById(new_chat).populate(
                "participants",
                "fullName username avatar _id email isActive"
            );

            console.log(new_chat);

            socket.emit("start_chat", new_chat);
        }
        // if yes => just emit event "start_chat" & send conversation details as payload
        else {
            socket.emit("start_chat", existing_conversations[0]);
        }
    });

    socket.on("get_messages", async (data, callback) => {
        try {


            
            const MessageData = await OneToOneMessage.aggregate([
                {
                  $match: { // Filter by conversation ID
                    _id: new mongoose.Types.ObjectId(data.conversation_id), // Cast conversationId to ObjectId
                  },
                },
                {
                  $unwind: "$messages", // Unwind the messages array
                },
                {
                  $sort: { "messages.created_at": -1 }, // Sort by created_at descending
                },
                {
                  $limit: 20, // Limit to the last 20 messages
                },
                {
                    $sort: { "messages.created_at": 1 }, // Sort by created_at descending
                },
                {
                  $group: { // Group back into an object with the messages array
                    _id: null, // Set the group ID to null (optional)
                    messages: { $push: "$messages" }, // Push messages into an array
                  },
                },
                // {
                //   $project: { // Project the desired fields (optional)
                //     // _id: 0, // Exclude the default _id field
                //     messages: 1, // Include the messages array
                //   },
                // },
            ])
            const messages = MessageData[0].messages
            // console.log('get messages socket: ');
            // const { messages } = await OneToOneMessage.findById(data.conversation_id)
            //     .select("messages")
            //     .sort({ "messages.date": -1 }) // Leverage the index for efficient sorting
            //     .limit(20);
            callback(messages);
        } catch (error) {
            console.log(error);
        }
    });

    // Handle incoming text/link messages
    socket.on("text_message", async (data) => {
        console.log("Received message:", data);

        // data: {to, from, text}

        const { message, conversation_id, from, to, type } = data;

        const to_user = await User.findById(to);
        const from_user = await User.findById(from);

        // message => {to, from, type, created_at, text, file}

        const new_message = {
            to: to,
            from: from,
            type: type,
            created_at: Date.now(),
            text: message,
        };

        // fetch OneToOneMessage Doc & push a new message to existing conversation
        const chat = await OneToOneMessage.findById(conversation_id);
        chat.messages.push(new_message);
        // save to db`
        await chat.save({ new: true, validateModifiedOnly: true });

        // emit incoming_message -> to user

        io.to(to_user?.socket_id).emit("new_message", {
            conversation_id,
            message: new_message,
        });

        // // emit outgoing_message -> from user
        io.to(from_user?.socket_id).emit("new_message", {
            conversation_id,
            message: new_message,
        });
    });

    // handle Media/Document Message
    socket.on("file_message", (data) => {
        console.log("Received message:", data);

        // data: {to, from, text, file}

        // Get the file extension
        const fileExtension = path.extname(data.file.name);

        // Generate a unique filename
        const filename = `${Date.now()}_${Math.floor(Math.random() * 10000)}${fileExtension}`;

        // upload file to AWS s3

        // create a new conversation if its dosent exists yet or add a new message to existing conversation

        // save to db

        // emit incoming_message -> to user

        // emit outgoing_message -> from user
    });

    socket.on("disconnect", () => {
        console.log("disconnected: " + socket.id);
        users = users.filter((user) => user.socketId !== socket.id);
        socket.disconnect();
    });
    socket.on("end", async (data) => {
        // Find user by ID and set status as offline

        if (data.user_id) { 
            await User.findByIdAndUpdate(data.user_id, { isActive: false });
        }

        // broadcast to all conversation rooms of this user that this user is offline (disconnected)

        console.log("closing connection");
        socket.disconnect(0);
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
