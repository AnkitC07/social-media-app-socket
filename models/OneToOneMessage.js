import mongoose from "mongoose";

const oneToOneMessageSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "users",
    },
  ],
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
      file: [{
        type: String,
      }],
    },
  ],
});

const OneToOneMessage = new mongoose.model(
  "OneToOneMessage",
  oneToOneMessageSchema
);
export default OneToOneMessage;