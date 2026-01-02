/**
 * Fonction Netlify Ticker - Projet Bitcoin-Retraite
 * Version Optimisée : Batch Request pour Yahoo Finance
 * Évite les blocages de proxy en groupant toutes les actions en 1 seule requête.
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

  try {
    const results = {};

    // 1. CRYPTOS via CoinGecko (Stable)
    try {
      const cryptoRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json();
        results.bitcoin = {
          name: 'Bitcoin',
          currentPrice: cryptoData.bitcoin.usd,
          change24h: cryptoData.bitcoin.usd_24h_change || 0
        };
        results.ethereum = {
          name: 'Ethereum',
          currentPrice: cryptoData.ethereum.usd,
          change24h: cryptoData.ethereum.usd_24h_change || 0
        };
      }
    } catch (e) { console.error('Erreur Crypto:', e); }

    // 2. ACTIONS + MELANION via Yahoo Finance (Batch Mode)
    // On groupe tout pour ne faire qu'UN SEUL appel au proxy Allorigins
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

    const symbols = Object.keys(stockMapping).join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;
    
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}&t=${Date.now()}`);
      
      if (response.ok) {
        const proxyData = await response.json();
        const data = JSON.parse(proxyData.contents);
        const quotes = data?.quoteResponse?.result;

        if (Array.isArray(quotes)) {
          quotes.forEach(quote => {
            const mapping = stockMapping[quote.symbol];
            if (mapping) {
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
    } catch (e) {
      console.error('Erreur Batch Yahoo:', e);
    }

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
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
