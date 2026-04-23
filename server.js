const express = require("express");
const axios = require("axios");

const app = express();

// Needed for Render / proxies (:contentReference[oaicite:0]{index=0})
app.set("trust proxy", true);

/**
 * Get real client IP safely
 */
function getClientIp(req) {
    return (
        req.headers["cf-connecting-ip"] ||
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        req.ip
    );
}

/**
 * Primary Geo lookup (more accurate than ipinfo)
 * Using ip-api (good free accuracy in Europe)
 */
async function geoFromIpApi(ip) {
    const res = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city,query`);
    if (res.data.status === "success") {
        return {
            city: res.data.city,
            region: res.data.regionName,
            country: res.data.country
        };
    }
    return null;
}

/**
 * Fallback Geo lookup (ipinfo backup)
 */
async function geoFromIpInfo(ip) {
    const res = await axios.get(`https://ipinfo.io/${ip}/json`);
    return {
        city: res.data.city,
        region: res.data.region,
        country: res.data.country
    };
}

/**
 * Try multiple providers for best accuracy
 */
async function getLocation(ip) {
    try {
        // 1st choice: ip-api (usually more accurate for EU)
        let data = await geoFromIpApi(ip);
        if (data?.country) return data;

        // fallback: ipinfo
        data = await geoFromIpInfo(ip);
        if (data?.country) return data;

        return null;
    } catch {
        return null;
    }
}

app.get("/", async (req, res) => {
    try {
        const ip = getClientIp(req);
        console.log("Visitor IP:", ip);

        let locationText = "Unknown";

        // Skip private IPs
        const isPrivate =
            ip.startsWith("10.") ||
            ip.startsWith("192.168.") ||
            ip.startsWith("172.") ||
            ip === "::1" ||
            ip === "127.0.0.1";

        if (!isPrivate) {
            const loc = await getLocation(ip);

            if (loc) {
                locationText = `${loc.city || "Unknown city"}, ${loc.region || "Unknown region"}, ${loc.country || "Unknown country"}`;
            }
        } else {
            locationText = "Local / Internal IP";
        }

        res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Analytics Dashboard</title>
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
    <h1>Analytics Dashboard</h1>

    <div class="box">
      <div class="label">Visitor IP</div>
      ${ip}
    </div>

    <div class="box">
      <div class="label">Approx Location</div>
      ${locationText}
    </div>

    <div class="note">
      Location is estimated using multiple IP databases (approximate only).
    </div>
  </div>
</body>
</html>
        `);

    } catch (err) {
        console.log(err);
        res.status(500).send("Error");
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});