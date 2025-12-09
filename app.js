import { readFile, writeFile } from "fs/promises";
import { createServer } from "http";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3002;
const DATA_FILE = path.join(__dirname, "data", "links.json");

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
    } catch (err) {
        if (err.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
        throw err;
    }
};

const saveLinks = async (links) => {
    await writeFile(DATA_FILE, JSON.stringify(links, null, 2));
};

const server = createServer(async (req, res) => {
    console.log(req.method, req.url);

    if (req.method === "GET" && req.url === "/") {
        return serveFile(res, path.join(__dirname, "public", "index.html"), "text/html");
    }

    if (req.method === "GET" && req.url === "/style.css") {
        return serveFile(res, path.join(__dirname, "public", "style.css"), "text/css");
    }

    if (req.method === "GET" && req.url === "/links") {
        const links = await loadLinks();
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(links));
    }

    if (req.method === "GET") {
        const shortCode = req.url.slice(1);
        const links = await loadLinks();

        if (links[shortCode]) {
            res.writeHead(302, { Location: links[shortCode] });
            return res.end();
        }
    }

    if (req.method === "POST" && req.url === "/shorten") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));

        req.on("end", async () => {
            const { url, shortCode } = JSON.parse(body);

            const finalShortCode = shortCode || crypto.randomBytes(4).toString("hex");
            const links = await loadLinks();

            if (!url) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("URL is required!");
            }

            if (links[finalShortCode]) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("Short code already exists!");
            }

            links[finalShortCode] = url;
            await saveLinks(links);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, shortCode: finalShortCode }));
        });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
});
