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
    console.log('🚀 Récupération des cours...');
    const results = {};

    // 1. CRYPTOS via CoinGecko (1 requête pour Bitcoin + Ethereum)
    try {
      const cryptoResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
      if (cryptoResponse.ok) {
        const cryptoData = await cryptoResponse.json();
        
        results.bitcoin = {
          name: 'Bitcoin',
          symbol: 'BTC',
          currentPrice: cryptoData.bitcoin.usd,
          change24h: cryptoData.bitcoin.usd_24h_change || 0
        };
        
        results.ethereum = {
          name: 'Ethereum',
          symbol: 'ETH',
          currentPrice: cryptoData.ethereum.usd,
          change24h: cryptoData.ethereum.usd_24h_change || 0
        };
      }
    } catch (error) {
      console.error('Erreur cryptos:', error);
    }

    // 2. ACTIONS via TwelveData (1 requête pour 7 actions)
    try {
      const symbols = 'MARA,MSTR,COIN,BTBT,CLSK,RIOT,BTDR';
      const stockResponse = await fetch(`https://api.twelvedata.com/quote?symbol=${symbols}&apikey=37d85a5a500b4eeca669b37852747116`);
      
      if (stockResponse.ok) {
        const stockData = await stockResponse.json();
        
        const stockNames = {
          'MARA': 'Marathon Digital',
          'MSTR': 'MicroStrategy',
          'COIN': 'Coinbase Global',
          'BTBT': 'Bit Digital', 
          'CLSK': 'CleanSpark',
          'RIOT': 'Riot Platform',
          'BTDR': 'Bitdeer Technologies'
        };
        
        // TwelveData peut renvoyer différents formats
        if (Array.isArray(stockData)) {
          stockData.forEach(quote => {
            if (quote && quote.symbol) {
              results[quote.symbol.toLowerCase()] = {
                name: stockNames[quote.symbol],
                symbol: quote.symbol,
                currentPrice: parseFloat(quote.close || quote.price || 0),
                change24h: parseFloat(quote.percent_change || 0)
              };
            }
          });
        } else if (typeof stockData === 'object' && stockData !== null) {
          Object.keys(stockData).forEach(symbol => {
            const quote = stockData[symbol];
            if (quote && (quote.close || quote.price)) {
              results[symbol.toLowerCase()] = {
                name: stockNames[symbol],
                symbol: symbol,
                currentPrice: parseFloat(quote.close || quote.price),
                change24h: parseFloat(quote.percent_change || 0)
              };
            }
          });
        }
      }
    } catch (error) {
      console.error('Erreur actions:', error);
    }

    // 3. MELANION via Yahoo Finance
    try {
      const melanionResponse = await fetch('https://api.allorigins.win/get?url=' + 
        encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/BTC.PA?range=2d&interval=1d'));
      
      if (melanionResponse.ok) {
        const proxyData = await melanionResponse.json();
        const data = JSON.parse(proxyData.contents);
        const meta = data?.chart?.result?.[0]?.meta;
        
        if (meta?.regularMarketPrice) {
          results.mlnx = {
            name: 'Melanion',
            symbol: 'BTC.PA',
            currentPrice: meta.regularMarketPrice,
            change24h: ((meta.regularMarketPrice / (meta.previousClose || meta.regularMarketPrice)) - 1) * 100,
            isEuro: true
          };
        }
      }
    } catch (error) {
      console.error('Erreur Melanion:', error);
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
    console.error('Erreur générale:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};