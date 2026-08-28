const http = require("http");

const PORT = process.env.PORT || 3000;

let acionamentoPendente = false;

const server = http.createServer((req, res) => {
  console.log(req.method, req.url);

  // Teste simples no navegador
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Servidor PIX funcionando");
    return;
  }

  // ESP32 consulta se existe acionamento pendente
  if (req.method === "GET" && req.url === "/esp32/check") {
    res.writeHead(200, { "Content-Type": "text/plain" });

    if (acionamentoPendente) {
      acionamentoPendente = false;
      res.end("6");
    } else {
      res.end("0");
    }
    return;
  }

  // Webhook do Mercado Pago
  if (req.url.startsWith("/webhook")) {

    // Permite testar pelo navegador
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    let corpo = "";

    req.on("data", chunk => {
      corpo += chunk;
    });

    req.on("end", () => {
      console.log("WEBHOOK RECEBIDO:", corpo);

      try {
        if (corpo.trim()) {
          const dados = JSON.parse(corpo);

          const referencia =
            dados?.data?.external_reference ||
            dados?.external_reference ||
            "";

          const valor = Number(
            dados?.data?.total_paid_amount ??
            dados?.total_paid_amount ??
            dados?.total_amount ??
            0
          );

          if (dados?.action === "order.processed") {
            acionamentoPendente = true;
            console.log("PAGAMENTO CONFIRMADO - ESP32 PENDENTE");
          }
        }
      } catch (erro) {
        console.log("ERRO AO LER WEBHOOK:", erro.message);
      }

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
    });

    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Nao encontrado");
});

server.listen(PORT, () => {
  console.log("Servidor iniciado na porta", PORT);
});
