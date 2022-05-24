const tools = require('./tools');
const { MainClient, getOrderIdPrefix } = require('binance');
const { WebsocketClient, DefaultLogger } = require('binance');
const PSAR  = require('@debut/indicators').PSAR;
const psar = new PSAR();
const ADX  = require('technicalindicators').ADX;
const fs = require('fs')

let step = 0.02;
let max = 0.2;
global.in = true;

var key = require('./key');
const algorithm = require('./algorithm');
const { wvf } = require('./algorithm');
const API_KEY = key.p;
const API_SECRET = key.s;

global.balance = {};
global.coinslist = ['USDT','ETH','BTC'];

const size = 100;

global.open = [size];
global.close = [size];
global.high = [size];
global.low = [size];
var buyvalue = 0.000
var sellvalue = 0.000

global.upper=[];

var adxdata = [];

for (let index = 0; index < size; index++) {
    global.open[index] = 0;
    global.close[index] = 0;
    global.high[index] = 0;
    global.low[index] = 0;
    adxdata = [size];
  }

// ================================= //
// ------> Module Definition <------ //
// ================================= //

const logger = {
  ...DefaultLogger,
  silly: (...params) => {},
};

const client = new MainClient({
  api_key: API_KEY,
  api_secret: API_SECRET,
});

const wsClient = new WebsocketClient({
  api_key: API_KEY,
  api_secret: API_SECRET,
  beautify: true,
  // Disable ping/pong ws heartbeat mechanism (not recommended)
  // disableHeartbeat: true
}, logger);

// ================================= //
// ----> Binance Communication <---- //
// ================================= //

client.getBalances().then(result => {
    //console.log("getBalance result: ", result[0].coin);
    //console.log("getBalance result: ", result[0].free);
    for ( let num in result ) {
        let coin = result[num]
        //console.log(coin.coin);
        if (coinslist.includes(coin.coin)) {
            global.balance[coin.coin] = coin.free;
        }
    }
    console.log('Balance of ...')
    for ( let each in global.balance ) {
        console.log(each+': '+global.balance[each]);
    }
    
    // ------------> test <------------ //
    console.log('Test balance ...')
    for ( let each in global.balance ) {
      global.balance[each]=parseFloat(global.balance[each])+1000
      console.log(each+': '+global.balance[each]);
    }


  }).catch(err => {
        console.error("getBalance error: ", err);
  });
client.getKlines({symbol: 'ETHUSDT',interval: '1m'}).then(result => {
    pasrdata = [];
    adxdata = [size];
    global.t = result[result.length-1][0]
    var intime=global.t;
    result.pop();
    let Data = result.slice(-size);
    global.startTime= Data[0][0];
    for (let index = 0; index < Data.length; index++) {
        global.open[index] = parseFloat(Data[index][1]); 
        global.close[index] = parseFloat(Data[index][4]);
        global.high[index] = parseFloat(Data[index][2]);
        global.low[index] = parseFloat(Data[index][3]);
        pasrdata[index]=psar.nextValue(high[index],low[index],close[index])
        //console.log('11psar:',close[index],pasrdata[index]>close[index]?'Red':'Green');
    }
    var input = {
        close: close,
        high: high,
        low: low,
        period : 14
      }
    const adx = new ADX(input);
    let temp = adx.getResult().reverse()
    for (let index = 0; index < temp.length; index++) {
        adxdata[-index-1] = temp[index]['adx']
    }

    wvfData = algorithm.wvf(close, low, size);

    const multX = 1.25;
    global.basis = algorithm.sma(close.slice(-23), 23);
    global.dev = multX * algorithm.stdev(close.slice(-23), 23);
    global.x = multX * algorithm.stdev(close.slice(-23), 23);
    global.signal = basis - x;
    global.upper.push((basis + dev));
    global.lower = basis - dev;
    global.basis = algorithm.sma(close.slice(-24).slice(0,23), 23);
    global.dev = multX * algorithm.stdev(close.slice(-24).slice(0,23), 23);
    global.upper.unshift((basis + dev))

    /*for (let index = 0; index < wvfData.length; index++) {
        console.log(wvfData[index],close[index])
    }*/
    
    //console.log(pasrdata)
    //console.log(adxdata)
  });

// ================================ //
// -----> Binance Websockect <----- //
// ================================ //

wsClient.on('open', (data) => {
    console.log('connection opened open:', data.wsKey, data.ws.target.url);
});
  
wsClient.on('reply', (data) => {
    console.log('log reply: ', JSON.stringify(data, null, 2));
});

wsClient.on('reconnecting', (data) => {
    console.log('ws automatically reconnecting.... ', data?.wsKey );
});

wsClient.on('reconnected', (data) => {
    console.log('ws has reconnected ', data?.wsKey );
});
  
//wsClient.subscribeSpotTrades('BTCUSDT');
  
wsClient.subscribeSpotKline('ETHUSDT','1m');

wsClient.on('formattedMessage', (data) => {
    
    let closeCur = parseFloat(data['kline']['close']);
    let lowCur = parseFloat(data['kline']['low']);
    let highCur = parseFloat(data['kline']['high']);
    let openCur = parseFloat(data['kline']['open']);
    var temp1 = [];
    var temp2 = [];
    var wvfCur = [];
    //console.log(data)

    if (global.t != data.kline.startTime) {
        client.getKlines({symbol: 'ETHUSDT',interval: '1m'}).then(result => {
            pasrdata = [];
            adxdata = [size];
            global.t = result[result.length-1][0]
            intime = global.t
            result.pop();
            let Data = result.slice(-size);
            global.startTime= Data[0][0];
            for (let index = 0; index < Data.length; index++) {
                global.open[index] = parseFloat(Data[index][1]); 
                global.close[index] = parseFloat(Data[index][4]);
                global.high[index] = parseFloat(Data[index][2]);
                global.low[index] = parseFloat(Data[index][3]);
                pasrdata[index]=psar.nextValue(high[index],low[index],close[index])
            }
            var input = {
                close: close,
                high: high,
                low: low,
                period : 14
            }
            const adx = new ADX(input);
            let temp = adx.getResult().reverse()
            for (let index = 0; index < temp.length; index++) {
                adxdata[-index-1] = temp[index]['adx']
            }
            wvfData = algorithm.wvf(close, low, size)

            const multX = 1.25;
            global.basis = algorithm.sma(close.slice(-23), 23);
            global.dev = multX * algorithm.stdev(close.slice(-23), 23);
            global.x = multX * algorithm.stdev(close.slice(-23), 23);
            global.signal = basis - x;
            global.upper.push((basis + dev));
            global.upper.shift();

            intime=0;

            temp1 = close.slice();
        temp1.push(closeCur);
        temp2 = low.slice()
        temp2.push(lowCur)
        wvfCur = wvf(temp1, temp2, temp1.size)
        wvfCur = wvfCur[wvfCur.length-1]
        //var intime=0;

        /*console.log(tools.inttime(data.eventTime) + '\n' + data.symbol + ' :', data.kline.close);
        console.log('psar:',pasrdata[pasrdata.length-1],pasrdata[pasrdata.length-1]>close[close.length-1]?'Red':'Green');
        console.log('adx:',adxdata[-1]);
        console.log('wvf:',wvfData[wvfData.length-1]);*/
        client.getSymbolOrderBookTicker({ symbol: 'ETHUSDT' }).then(ticker => {
          buyvalue = ticker['bidPrice']
          sellvalue = ticker['askPrice']
        });
        if (data.symbol == 'ETHUSDT') {
          if (global.in) {//
              if (((close[close.length-2] < global.upper[0]) && (close[close.length-1] > global.upper[1]))) {
                client.testNewOrder({ symbol: 'ETHUSDT', side: 'SELL', type: 'LIMIT', timeInForce:'IOC', quantity:balance['ETH'].toPrecision(8), price:sellvalue}).then(result => {
                  console.log(tools.inttime(data.eventTime) ,'Sell at',closeCur);
                }).catch(err => {
                  console.error("getBalance error: ", err);
                });
              //console.log(tools.inttime(data.eventTime) ,'Sell at',closeCur);
              global.in = false;
              intime =  0;
              /*console.log('close1:',close[close.length-2]);
              console.log('upper1:',global.upper[0]);
              console.log('close2:',close[close.length-1]);
              console.log('upper2:',global.upper[1]);*/
              
              fs.writeFile('./test.txt', 'Current Price : '+ closeCur +' Sell at ' + sellvalue +  ' '+(closeCur-p)/p, err => {
                if (err) {
                  console.error(err)
                  return
                }
              })
              }
            }else {
              if (((close[close.length-1] >= pasrdata[pasrdata.length-1]) && (adxdata[-1]>=21))) {
                //console.log(tools.inttime(data.eventTime) ,'Current Price : ' + closeCur +'Strategy1 buy at',buyvalue,'for',0.96*balance['USDT']/buyvalue)
                client.testNewOrder({ symbol: 'ETHUSDT', side: 'BUY', type: 'LIMIT', timeInForce:'IOC', quantity:balance['ETH'].toPrecision(8), price:buyvalue}).then(result => {
                  console.log(tools.inttime(data.eventTime) ,'Current Price : ' + closeCur +'Strategy1 buy at',parseInt(buyvalue),'for',parseInt(balance['ETH'].toPrecision(8)))
                }).catch(err => {
                  console.error("getBalance error: ", err);
                });
                global.in = true;
                global.p = closeCur;
                intime =  0;
                console.log('adx:',adxdata[-1]);
                fs.writeFile('./test.txt', 'Strategy1 buy at ' + global.p, err => {
                  if (err) {
                    console.error(err)
                    return
                  }
                })
                }
              if (((wvfCur >= global.upperBand || wvfCur >= global.rangeHigh) && wvfCur > 10.5)) {
                //console.log(tools.inttime(data.eventTime) ,'Current Price : ' + closeCur +'Strategy2 buy at',buyvalue,'for',0.96*balance['USDT']/buyvalue)
                client.testNewOrder({ symbol: 'ETHUSDT', side: 'BUY', type: 'LIMIT', timeInForce:'IOC', quantity:balance['ETH'].toPrecision(8), price:buyvalue}).then(result => {
                  console.log(tools.inttime(data.eventTime) ,'Current Price : ' + closeCur +'Strategy2 buy at',buyvalue,'for',balance['ETH'].toPrecision(8))
                }).catch(err => {
                  console.error("getBalance error: ", err);
                });
                global.in = true;
                global.p = closeCur;
                intime =  0;
                fs.writeFile('./test.txt', 'Strategy2 buy at ' + global.p, err => {
                  if (err) {
                    console.error(err)
                    return
                  }
                })
              }
            }//
      }
        });
    }
});
