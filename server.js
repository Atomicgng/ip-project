const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();

app.set("trust proxy", true);

// Serve frontend
app.use(express.static(path.join(__dirname, "frontend")));

// IP
function getIP(req) {
    const xff = req.headers["x-forwarded-for"];
    if (xff) return xff.split(",")[0].trim();
    return req.socket.remoteAddress || req.ip;
}

// Location
async function getLocation(ip) {
    try {
        const res = await axios.get(`http://ip-api.com/json/${ip}`);
        return res.data;
    } catch {
        return null;
    }
}

// API
app.get("/api/info", async (req, res) => {
    const ip = getIP(req);
    const geo = await getLocation(ip);

    res.json({
        ip,
        location: geo
            ? `${geo.city}, ${geo.regionName}, ${geo.country}`
            : "Unknown"
    });
});

// Homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Running on", PORT));
