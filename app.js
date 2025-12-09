import { readFile, writeFile, mkdir } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "links.json");

await mkdir(DATA_DIR, { recursive: true });

const serveFile = async (res, filePath, contentType) => {
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
    } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("404 Page Not Found!");
    }
};

const loadLinks = async () => {
    try {
        const data = await readFile(DATA_FILE, "utf-8");
        return JSON.parse(data);
    } catch {
        await writeFile(DATA_FILE, JSON.stringify({}, null, 2));
        return {};
    }
};

const saveLinks = async (links) =>
    writeFile(DATA_FILE, JSON.stringify(links, null, 2));

const server = createServer(async (req, res) => {
    console.log(req.method, req.url);

    if (req.method === "GET" && req.url === "/") {
        return serveFile(res, path.join(__dirname, "index.html"), "text/html");
    }

    if (req.method === "GET" && req.url === "/style.css") {
        return serveFile(res, path.join(__dirname, "style.css"), "text/css");
    }

    if (req.method === "GET" && req.url === "/links") {
        const links = await loadLinks();
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(links));
    }

    if (req.method === "POST" && req.url === "/shorten") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            const { url, shortCode } = JSON.parse(body);

            const code = shortCode || crypto.randomBytes(4).toString("hex");
            const links = await loadLinks();

            if (!url) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("URL is required!");
            }

            if (links[code]) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("Short code already exists!");
            }

            links[code] = url;
            await saveLinks(links);

            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ success: true, shortCode: code }));
        });
        return;
    }

    if (req.method === "GET") {
        const code = req.url.slice(1);
        const links = await loadLinks();
        if (links[code]) {
            res.writeHead(302, { Location: links[code] });
            return res.end();
        }
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
