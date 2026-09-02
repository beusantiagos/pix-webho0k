const http = require("http");

const PORT = process.env.PORT || 3000;

let acionamentoPendente = false;
let timeoutReembolso = null;
async function reembolsarPedido(orderId) {
const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
if (!token) { 
console.log("ERRO: Access Token nao configurado");
  return;
}
const url = `https://api.mercadopago.com/v1/orders/${orderId}/refund`;
  try {
    const resposta = await fetch(url, {
      method: "POST",
  headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json",
  "X-Idempotency-Key": `refund-${orderId}`
}
});
    const texto = await resposta.text();
    console.log("RESPOSTA REEMBOLSO:", resposta.status, texto);
  } catch (erro) {
    console.log("ERRO NO REEMBOLSO:", erro.message);
  }
}
          
const server = http.createServer(async (req, res) => {
  console.log(req.method, req.url);

  // Teste simples no navegador
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Servidor PIX funcionando");
    return;
  }
  
if (req.method === "GET" && req.url === "/teste-acionar") {
  acionamentoPendente = true;
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
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
if (req.method === "GET" && req.url === "/esp32/confirm") {
  if (timeoutReembolso) clearTimeout(timeouReembolso);
  pedidoPendente = null;
  console.log("ESP32 CONFIRMOU OS 6 PULSOS");
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("OK");
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

           if (
  dados?.action === "order.processed" &&
  referencia.startsWith("CHAFARIZZ_") &&
  valor === 1.50
) {
            acionamentoPendente = true;
            const parametros = new URL(req.url, "http://localhost");
            pedidoPendente = parametros.searchParams.get("data.id") || dados?.data?.id || dados?.id || null;
            if (timeoutReembolso) clearTimeout(timeoutReembolso);
            timeoutReembolso = setTimeout(() => {
            if (pedidoPendente) {
            reembolsarPedido(pedidoPendente);
            }
            }, 60000);
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

  if (req.method === "GET" && req.url === "/criar-qr") {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  if (!token) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Access Token nao configurado");
    return;
  }
    const referencia = `CHAFARIZZ_${Date.now()}`;

  const pedido = {
    type: "qr",
    total_amount: "1.50",
    external_reference: referencia,
    config: {
      qr: {
        external_pos_id: "137110272",
        mode: "static"
      }
    },
    transactions: {
      payments: [
        {
          amount: "1.50"
        }
      ]
    },
    items: [
      {
        title: "Chafariz",
        unit_price: "1.50",
        quantity: 1,
        unit_measure: "unit"
      }
    ]
  };
    try {
    const resposta = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `qr-${Date.now()}`
      },
      body: JSON.stringify(pedido)
    });

    const texto = await resposta.text();
      res.writeHead(resposta.status, { "Content-Type": "application/json" });
    res.end(texto);
    return;
      } catch (erro) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Erro ao criar QR: " + erro.message);
    return;
  }
}
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Nao encontrado");
});

server.listen(PORT, () => {
  console.log("Servidor iniciado na porta", PORT);
});
