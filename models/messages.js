import mongoose from "mongoose";

const messagesSchema = new mongoose.Schema({
    messages: [
        {
            to: {
                type: mongoose.Schema.ObjectId,
                ref: "users",
            },
            from: {
                type: mongoose.Schema.ObjectId,
                ref: "users",
            },
            type: {
                type: String,
                enum: ["Text", "img", "Document", "Link"],
            },
            created_at: {
                type: Date,
                default: Date.now(),
            },
            text: {
                type: String,
            },
            file: [
                {
                    type: String,
                },
            ],
        },
    ],
});

const Messages = new mongoose.model("Messages", messagesSchema)

export default Messages;
