const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

async function criarQR() {
if (!token) {
    console.log("ERRO: Access Token nao configurado");
    return;
  }
  const url = "https://api.mercadopago.com/v1/orders";

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
  const resposta = await fetch(url, {
  method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
        "X-Idempotency-Key": `qr-${Date.now()}`
    },
body: JSON.stringify(pedido)
  });
const texto = await resposta.text();
  console.log("RESPOSTA:", resposta.status, texto);
}

criarQR();
