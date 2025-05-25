// Polyfill fetch and Headers in Node.js using async IIFE
(async () => {
  const { default: fetch, Headers } = await import('node-fetch');
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;

  const express = require("express");
  const cors = require("cors");
  const bodyParser = require("body-parser");
  const axios = require("axios");
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();

  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cors());
  app.use(bodyParser.json());

  // Initialize Gemini AI
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // In-memory storage (replace with DB in production)
  let todos = [];
  let idCounter = 1;

  // Default route

  app.get("/", (req, res) => {
    res.json({ 
      message: "Todo Summary Assistant API is running!",
      endpoints: {
        "GET /todos": "Get all todos",
        "POST /todos": "Add new todo",
        "PUT /todos/:id": "Update todo",
        "DELETE /todos/:id": "Delete todo",
        "POST /summarize": "Summarize and send to Slack"
      }
    });
  });
  
  

  
  // Get all todos
  app.get("/todos", (req, res) => {
    res.json(todos);
  });

  // Add new todo
  app.post("/todos", (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    const newTodo = { 
      id: idCounter++, 
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };
    todos.push(newTodo);
    res.status(201).json(newTodo);
  });

  // Update todo
  app.put("/todos/:id", (req, res) => {
    const { id } = req.params;
    const { text, completed } = req.body;
    const todoIndex = todos.findIndex((t) => t.id == id);

    if (todoIndex > -1) {
      todos[todoIndex] = {
        ...todos[todoIndex],
        ...(text !== undefined && { text: text.trim() }),
        ...(completed !== undefined && { completed }),
        updatedAt: new Date().toISOString()
      };
      res.json(todos[todoIndex]);
    } else {
      res.status(404).json({ error: "Todo not found" });
    }
  });

  // Delete todo
  app.delete("/todos/:id", (req, res) => {
    const { id } = req.params;
    const index = todos.findIndex((t) => t.id == id);

    if (index > -1) {
      const deletedTodo = todos.splice(index, 1)[0];
      res.json({ success: true, deletedTodo });
    } else {
      res.status(404).json({ error: "Todo not found" });
    }
  });

  // Summarize todos using Gemini and send to Slack
  app.post("/summarize", async (req, res) => {
    if (todos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "❌ No todos to summarize" 
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        message: "❌ Gemini API key not configured" 
      });
    }

    if (!process.env.SLACK_WEBHOOK_URL) {
      return res.status(500).json({ 
        success: false, 
        message: "❌ Slack webhook URL not configured" 
      });
    }

    try {
      const todoList = todos.map((todo, index) => 
        `${index + 1}. ${todo.text}${todo.completed ? ' ✅' : ''}`
      ).join('\n');

      const prompt = `
Please analyze and summarize the following todo list in a professional and organized manner:

${todoList}

Please provide:
1. A brief executive summary
2. Categorization of tasks (work, personal, learning, health, etc.)
3. Priority suggestions based on the nature of tasks
4. Any insights or recommendations

Format the response in a clear, structured way suitable for sharing in a team Slack channel. Use emojis to make it visually appealing but keep it professional.
`;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      const slackMessage = {
        text: "📋 Todo Summary Report",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📋 Todo Summary Report"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: summary
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Generated on ${new Date().toLocaleString()} | Total todos: ${todos.length}`
              }
            ]
          }
        ]
      };

      await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);

      res.json({ 
        success: true, 
        message: "✅ Summary generated and sent to Slack successfully!",
        summary: summary,
        todoCount: todos.length
      });

    } catch (error) {
      console.error("Error in summarize endpoint:", error);

      if (error.message?.includes('API_KEY_INVALID')) {
        res.status(500).json({ 
          success: false, 
          message: "❌ Invalid Gemini API key" 
        });
      } else if (error.code === 'ENOTFOUND' || error.response?.status === 404) {
        res.status(500).json({ 
          success: false, 
          message: "❌ Invalid Slack webhook URL" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "❌ Failed to generate summary or send to Slack. Check server logs." 
        });
      }
    }
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: {
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        slackConfigured: !!process.env.SLACK_WEBHOOK_URL,
        todoCount: todos.length
      }
    });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 Environment check:`);
    console.log(`   - Gemini API: ${process.env.GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   - Slack Webhook: ${process.env.SLACK_WEBHOOK_URL ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   - Port: ${PORT}`);
  });

})();
