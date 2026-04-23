const express = require("express");
const app = express();

app.get("/", (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    console.log("Visitor IP:", ip);

    res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>My AI Homepage</title>
        <style>
          body {
            font-family: Arial;
            background: #0f172a;
            color: white;
            text-align: center;
            padding-top: 100px;
          }

          .box {
            background: #1e293b;
            padding: 30px;
            margin: auto;
            width: 300px;
            border-radius: 15px;
          }

          h1 {
            color: #38bdf8;
          }
        </style>
      </head>

      <body>
        <div class="box">
          <h1>AI Homepage 🤖</h1>
          <p>Welcome to your first real website</p>
          <p>Server is running correctly</p>
        </div>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running");
});
