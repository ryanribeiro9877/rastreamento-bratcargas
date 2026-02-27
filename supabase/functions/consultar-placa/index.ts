import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = [
  "https://rastreamentobrat.com.br",
  "https://www.rastreamentobrat.com.br",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const PLACA_REGEX = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/i;

interface Carro {
  marca: string | null;
  modelo: string | null;
  importado: string | null;
  ano: string | null;
  anoModelo: string | null;
  cor: string | null;
  cilindrada: string | null;
  potencia: string | null;
  combustivel: string | null;
  chassi: string | null;
  motor: string | null;
  passageiros: string | null;
  uf: string | null;
  municipio: string | null;
}

// ========== Estratégia 1: API gateway-consulta (JSON direto) ==========
async function consultarGateway(placa: string): Promise<Carro | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const apiKey = Deno.env.get("WDAPI_KEY") || "aeaboreal";
    const res = await fetch(`https://wdapi2.com.br/consulta/${placa}/${apiKey}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[Gateway] HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    console.log(`[Gateway] Response keys: ${Object.keys(json).join(", ")}`);

    if (json.MARCA) {
      return {
        marca: json.MARCA || null,
        modelo: json.MODELO || null,
        importado: json.importado || null,
        ano: json.ano || null,
        anoModelo: json.anoModelo || null,
        cor: json.cor || null,
        cilindrada: json.cilindradas || null,
        potencia: json.potencia || null,
        combustivel: json.combustivel || null,
        chassi: json.chassi || null,
        motor: json.motor || null,
        passageiros: json.passageiros || null,
        uf: json.uf || null,
        municipio: json.municipio || null,
      };
    }
    return null;
  } catch (e: any) {
    console.log(`[Gateway] Erro: ${e.message}`);
    return null;
  }
}

// ========== Estratégia 2: Scraping sites com headers avançados ==========
function extrairDadosHTML(html: string): Carro | null {
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const tds: string[] = [];
  let match;
  while ((match = tdRegex.exec(html)) !== null) {
    const texto = match[1].replace(/<[^>]*>/g, "").trim();
    tds.push(texto);
  }

  console.log(`[Scraping] Total TDs encontrados: ${tds.length}`);
  if (tds.length >= 4) {
    console.log(`[Scraping] Primeiros TDs: ${tds.slice(0, 6).join(" | ")}`);
  }

  if (tds.length < 28) return null;

  const valores: (string | null)[] = [];
  for (let i = 1; i < 28; i += 2) {
    valores.push(tds[i] || null);
  }

  if (!valores[0]) return null;

  return {
    marca: valores[0],
    modelo: valores[1],
    importado: valores[2],
    ano: valores[3],
    anoModelo: valores[4],
    cor: valores[5],
    cilindrada: valores[6],
    potencia: valores[7],
    combustivel: valores[8],
    chassi: valores[9],
    motor: valores[10],
    passageiros: valores[11],
    uf: valores[12],
    municipio: valores[13],
  };
}

async function consultarScraping(placa: string): Promise<Carro | null> {
  const sites = [
    { nome: "Keplaca", url: `https://www.keplaca.com/placa/${placa}` },
    { nome: "PlacaFipe", url: `https://placafipe.com/${placa}` },
  ];

  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Linux"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  for (const site of sites) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      console.log(`[Scraping] Tentando ${site.nome}: ${site.url}`);
      const res = await fetch(site.url, {
        headers: { ...headers, Referer: `https://www.google.com.br/search?q=placa+${placa}` },
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);

      console.log(`[Scraping] ${site.nome} HTTP ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        console.log(`[Scraping] ${site.nome} HTML length: ${html.length}`);
        const dados = extrairDadosHTML(html);
        if (dados) {
          console.log(`[OK] Dados encontrados via ${site.nome}`);
          return dados;
        }
      }
    } catch (e: any) {
      console.log(`[Scraping] ${site.nome} erro: ${e.message}`);
    }
  }
  return null;
}

// ========== Estratégia 3: API apiplacas.com.br ==========
async function consultarApiPlacas(placa: string): Promise<Carro | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch("https://apiplacas.com.br/consulta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://apiplacas.com.br",
        "Referer": "https://apiplacas.com.br/",
      },
      body: JSON.stringify({ placa }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[ApiPlacas] HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    console.log(`[ApiPlacas] Response keys: ${Object.keys(json).join(", ")}`);

    if (json.marca || json.MARCA) {
      return {
        marca: json.marca || json.MARCA || null,
        modelo: json.modelo || json.MODELO || null,
        importado: json.importado || null,
        ano: json.ano || json.anoFabricacao || null,
        anoModelo: json.anoModelo || null,
        cor: json.cor || json.COR || null,
        cilindrada: json.cilindrada || json.cilindradas || null,
        potencia: json.potencia || null,
        combustivel: json.combustivel || null,
        chassi: json.chassi || null,
        motor: json.motor || null,
        passageiros: json.passageiros || null,
        uf: json.uf || json.UF || null,
        municipio: json.municipio || json.MUNICIPIO || null,
      };
    }
    return null;
  } catch (e: any) {
    console.log(`[ApiPlacas] Erro: ${e.message}`);
    return null;
  }
}

// ========== Handler principal ==========
serve(async (req: any) => {
  const CORS_HEADERS = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { placa } = await req.json();

    if (!placa) {
      return new Response(
        JSON.stringify({ data: null, erros: ["Placa não informada."] }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const placaLimpa = placa.replace(/[-\s]/g, "").toUpperCase();

    if (!PLACA_REGEX.test(placaLimpa)) {
      return new Response(
        JSON.stringify({
          data: null,
          erros: ["Formato de placa inválido. Use ABC1234 (antiga) ou ABC1D23 (Mercosul)."],
        }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    console.log(`\n========== Consulta: ${placaLimpa} ==========`);

    // Tentar todas as estratégias em sequência
    console.log("[1/3] Tentando Gateway API...");
    let carro = await consultarGateway(placaLimpa);

    if (!carro) {
      console.log("[2/3] Tentando Scraping...");
      carro = await consultarScraping(placaLimpa);
    }

    if (!carro) {
      console.log("[3/3] Tentando ApiPlacas...");
      carro = await consultarApiPlacas(placaLimpa);
    }

    if (!carro) {
      console.log("[RESULTADO] Nenhuma estratégia retornou dados.");
      return new Response(
        JSON.stringify({
          data: null,
          erros: ["Veículo não encontrado. Verifique o número da placa."],
        }),
        { status: 404, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    console.log(`[RESULTADO] Veículo encontrado: ${carro.marca} ${carro.modelo}`);
    return new Response(
      JSON.stringify({ data: carro, erros: [] }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error(`[ERRO] ${error.message}`);
    return new Response(
      JSON.stringify({
        data: null,
        erros: ["Erro interno ao consultar a placa. Tente novamente."],
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
