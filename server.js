const express = require("express");
const axios = require("axios");

const app = express();

// Required for Render / proxies (:contentReference[oaicite:0]{index=0})
app.set("trust proxy", true);

app.get("/", async (req, res) => {
    try {

        // ✅ Real client IP (Cloudflare / Render safe)
        const ip =
            req.headers["cf-connecting-ip"] ||
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
            req.socket.remoteAddress ||
            req.ip;

        console.log("Visitor IP:", ip);

        let location = "Unknown";

        // Skip private/internal IPs
        const isPrivate =
            ip.startsWith("10.") ||
            ip.startsWith("192.168.") ||
            (
                ip.startsWith("172.16.") ||
                ip.startsWith("172.17.") ||
                ip.startsWith("172.18.") ||
                ip.startsWith("172.19.") ||
                ip.startsWith("172.20.") ||
                ip.startsWith("172.21.") ||
                ip.startsWith("172.22.") ||
                ip.startsWith("172.23.") ||
                ip.startsWith("172.24.") ||
                ip.startsWith("172.25.") ||
                ip.startsWith("172.26.") ||
                ip.startsWith("172.27.") ||
                ip.startsWith("172.28.") ||
                ip.startsWith("172.29.") ||
                ip.startsWith("172.30.") ||
                ip.startsWith("172.31.")
            ) ||
            ip === "::1" ||
            ip === "127.0.0.1";

        if (!isPrivate) {
            try {
                const response = await axios.get(`https://ipinfo.io/${ip}/json`);
                const data = response.data;

                location = `${data.city || "Unknown city"}, ${data.country || "Unknown country"}`;
            } catch (err) {
                console.log("Geo lookup failed");
            }
        } else {
            location = "Local / Internal / Proxy IP";
        }

        res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Website Analytics</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #0b1220;
      color: #e5e7eb;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }

    .card {
      background: rgba(255,255,255,0.06);
      padding: 30px;
      border-radius: 18px;
      width: 90%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
    }

    h1 {
      margin-bottom: 10px;
      font-size: 22px;
      color: #60a5fa;
    }

    .box {
      margin-top: 15px;
      padding: 12px;
      background: rgba(255,255,255,0.05);
      border-radius: 10px;
      font-size: 14px;
      word-break: break-word;
    }

    .label {
      opacity: 0.6;
      font-size: 12px;
      margin-bottom: 5px;
    }

    .note {
      margin-top: 15px;
      font-size: 11px;
      opacity: 0.5;
    }
  </style>
</head>

<body>
  <div class="card">
    <h1>Website Analytics</h1>

    <div class="box">
      <div class="label">Visitor IP</div>
      ${ip}
    </div>

    <div class="box">
      <div class="label">Approx Location</div>
      ${location}
    </div>

    <div class="note">
      Demo analytics page using IP-based geolocation. No personal data is stored.
    </div>
  </div>
</body>
</html>
        `);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error loading page");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});