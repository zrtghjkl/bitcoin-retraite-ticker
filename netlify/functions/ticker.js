/**
 * Fonction Netlify Ticker - Projet Bitcoin-Retraite
 * Version Ultra-Robuste : Batch Yahoo Finance + Gestion d'erreurs améliorée
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const results = {};

  try {
    // 1. CRYPTOS via CoinGecko (Indépendant)
    try {
      const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json();
        if (cryptoData.bitcoin) {
          results.bitcoin = {
            name: 'Bitcoin',
            currentPrice: cryptoData.bitcoin.usd,
            change24h: cryptoData.bitcoin.usd_24h_change || 0
          };
        }
        if (cryptoData.ethereum) {
          results.ethereum = {
            name: 'Ethereum',
            currentPrice: cryptoData.ethereum.usd,
            change24h: cryptoData.ethereum.usd_24h_change || 0
          };
        }
      }
    } catch (e) {
      console.error('Erreur CoinGecko:', e.message);
    }

    // 2. ACTIONS via Yahoo Finance (Batch)
    const stockMapping = {
      'MARA': { key: 'mara', name: 'Marathon Digital' },
      'MSTR': { key: 'mstr', name: 'MicroStrategy' },
      'COIN': { key: 'coin', name: 'Coinbase Global' },
      'BTBT': { key: 'btbt', name: 'Bit Digital' },
      'CLSK': { key: 'clsk', name: 'CleanSpark' },
      'RIOT': { key: 'riot', name: 'Riot Platform' },
      'BTDR': { key: 'btdr', name: 'Bitdeer Technologies' },
      'BTC.PA': { key: 'mlnx', name: 'Melanion', isEuro: true }
    };

    try {
      const symbols = Object.keys(stockMapping).join(',');
      const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}&t=${Date.now()}`;
      
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const proxyData = await response.json();
        
        // Vérification que le contenu n'est pas vide ou erroné
        if (proxyData.contents && proxyData.contents.startsWith('{')) {
          const data = JSON.parse(proxyData.contents);
          const quotes = data?.quoteResponse?.result;

          if (Array.isArray(quotes)) {
            quotes.forEach(quote => {
              const mapping = stockMapping[quote.symbol];
              if (mapping && quote.regularMarketPrice !== undefined) {
                results[mapping.key] = {
                  name: mapping.name,
                  symbol: quote.symbol,
                  currentPrice: quote.regularMarketPrice,
                  change24h: quote.regularMarketChangePercent || 0,
                  isEuro: mapping.isEuro || false
                };
              }
            });
          }
        }
      }
    } catch (e) {
      console.error('Erreur Yahoo Finance Batch:', e.message);
    }

    // Renvoi des résultats (même partiels pour éviter le "rien")
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        data: results
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: "Erreur critique du serveur",
        details: error.message 
      })
    };
  }
};
