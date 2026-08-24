const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  if (req.url.startsWith("/webhook")) {
    let corpo = "";

    req.on("data", chunk => {
      corpo += chunk;
    });

    req.on("end", () => {
      console.log("WEBHOOK RECEBIDO:", corpo);

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
    });

    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Servidor PIX funcionando");
});

server.listen(PORT, () => {
  console.log("Servidor iniciado na porta", PORT);
});
