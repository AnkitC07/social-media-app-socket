import mongoose from "mongoose";

const oneToOneMessageSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "users",
    },
  ],
  lastMsg: String,
  lastMsgDate: Date,
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


// Using a middleware (recommended for data integrity)
oneToOneMessageSchema.pre('save', async function (next) {
  console.log("lastMsg update",this.messages)
  if (this.messages.length > 0) {
    this.lastMsg = (this.messages.slice(-1))[0]?.text; // Keep only the last message
    this.lastMsgDate = Date.now(); 
  }

  next(); // Proceed with saving
});

const OneToOneMessage = new mongoose.model(
  "OneToOneMessage",
  oneToOneMessageSchema
);
export default OneToOneMessage;