const express = require("express");
const axios = require("axios");

const app = express();

// Required for proxies (Render / Cloudflare)
app.set("trust proxy", true);

// Health check route (IMPORTANT for Render)
app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

// Get real IP safely
function getIP(req) {
    const raw =
        req.headers["cf-connecting-ip"] ||
        req.headers["x-forwarded-for"] ||
        req.socket.remoteAddress ||
        req.ip;

    // x-forwarded-for can be a list
    return raw.split(",")[0].trim();
}

// Better geo lookup (priority order)
async function getLocation(ip) {
    try {
        const res = await axios.get(
            `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,query`
        );

        if (res.data.status === "success") {
            return {
                city: res.data.city,
                region: res.data.regionName,
                country: res.data.country
            };
        }
    } catch { }

    try {
        const res = await axios.get(`https://ipinfo.io/${ip}/json`);
        return {
            city: res.data.city,
            region: res.data.region,
            country: res.data.country
        };
    } catch { }

    return null;
}

// Main route
app.get("/", async (req, res) => {
    try {
        const ip = getIP(req);
        console.log("Visitor IP:", ip);

        let location = "Unknown";

        // Block local/private IPs properly
        const isPrivate =
            ip.startsWith("10.") ||
            ip.startsWith("192.168.") ||
            ip.startsWith("127.") ||
            ip === "::1" ||
            ip.startsWith("172.");

        if (!isPrivate) {
            const data = await getLocation(ip);

            if (data) {
                location = `${data.city || "Unknown city"}, ${data.region || "Unknown region"}, ${data.country || "Unknown country"}`;
            }
        } else {
            location = "Local / Internal IP";
        }

        res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Cryonix Analytics</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

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
      max-width: 450px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      backdrop-filter: blur(10px);
    }

    h1 {
      color: #60a5fa;
      margin-bottom: 15px;
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
    <h1>Cryonix</h1>

    <div class="box">
      <div class="label">Visitor IP</div>
      ${ip}
    </div>

    <div class="box">
      <div class="label">Approx Location</div>
      ${location}
    </div>

    <div class="note">
      IP geolocation is approximate and may vary by ISP routing.
    </div>
  </div>
</body>
</html>
        `);

    } catch (err) {
        console.log(err);
        res.status(500).send("Server error");
    }
});

// IMPORTANT for Render
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port", PORT);
});