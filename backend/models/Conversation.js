const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["user", "ai"],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  context: {
    phase: String,
    cycleDay: Number,
    mood: String
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  messages: [messageSchema],
  lastActive: {
    type: Date,
    default: Date.now
  },
  sessionId: {
    type: String,
    required: true
  }
});

// Index for efficient querying
conversationSchema.index({ userId: 1, lastActive: -1 });
conversationSchema.index({ sessionId: 1 });

// Clean up old conversations (keep only last 30 days)
conversationSchema.statics.cleanupOldConversations = async function() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return this.deleteMany({
    lastActive: { $lt: thirtyDaysAgo }
  });
};

// Get or create conversation for user
conversationSchema.statics.getOrCreateConversation = async function(userId, sessionId) {
  let conversation = await this.findOne({ userId, sessionId });
  
  if (!conversation) {
    conversation = new this({
      userId,
      sessionId,
      messages: []
    });
    await conversation.save();
  }
  
  return conversation;
};

// Add message to conversation
conversationSchema.methods.addMessage = async function(type, content, context = {}) {
  this.messages.push({
    type,
    content,
    context,
    timestamp: new Date()
  });
  
  // Keep only last 50 messages per conversation for performance
  if (this.messages.length > 50) {
    this.messages = this.messages.slice(-50);
  }
  
  this.lastActive = new Date();
  await this.save();
  
  return this.messages[this.messages.length - 1];
};

module.exports = mongoose.model("Conversation", conversationSchema);