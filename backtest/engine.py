import backtrader as bt
import pandas as pd
from loguru import logger
from data.pykrx_fetcher import PyKRXFetcher
import matplotlib.pyplot as plt

class BacktestGoldenCross(bt.Strategy):
    params = (('pfast', 20), ('pslow', 60),)
    def __init__(self):
        sma1 = bt.ind.SMA(period=self.p.pfast)
        sma2 = bt.ind.SMA(period=self.p.pslow)
        self.crossover = bt.ind.CrossOver(sma1, sma2)
    def next(self):
        if not self.position:
            if self.crossover > 0:
                self.buy()
        elif self.crossover < 0:
            self.sell()

class BacktestRSIReversal(bt.Strategy):
    params = (('period', 14), ('upper', 70), ('lower', 30),)
    def __init__(self):
        self.rsi = bt.ind.RSI(period=self.p.period)
    def next(self):
        if not self.position:
            if self.rsi < self.p.lower:
                self.buy()
        elif self.rsi > self.p.upper:
            self.sell()

class BacktestEngine:
    def __init__(self):
        self.fetcher = PyKRXFetcher()

    def run(self, ticker: str, strategy_name: str, start_date: str, end_date: str, initial_cash: float=10_000_000) -> dict:
        logger.info(f"Running backtest for {ticker} using {strategy_name}")
        df = self.fetcher.get_ohlcv(ticker, start_date, end_date)
        if df.empty:
            logger.error("No data for backtest.")
            return {}
            
        df['date'] = pd.to_datetime(df['date'])
        df.set_index('date', inplace=True)
        data = bt.feeds.PandasData(dataname=df, datetime=None, open='open', high='high', low='low', close='close', volume='volume')
        
        cerebro = bt.Cerebro()
        cerebro.adddata(data)
        cerebro.broker.setcash(initial_cash)
        
        if strategy_name == "GOLDEN_CROSS":
            cerebro.addstrategy(BacktestGoldenCross)
        elif strategy_name == "RSI_REVERSAL":
            cerebro.addstrategy(BacktestRSIReversal)
        else:
            logger.error("Unknown strategy")
            return {}
            
        cerebro.addanalyzer(bt.analyzers.SharpeRatio, _name='sharpe')
        cerebro.addanalyzer(bt.analyzers.DrawDown, _name='drawdown')
        cerebro.addanalyzer(bt.analyzers.TradeAnalyzer, _name='trades')
        
        results = cerebro.run()
        strat = results[0]
        
        final_value = cerebro.broker.getvalue()
        total_return_pct = (final_value - initial_cash) / initial_cash * 100
        
        sharpe_ratio = strat.analyzers.sharpe.get_analysis().get('sharperatio', 0)
        if sharpe_ratio is None: sharpe_ratio = 0
            
        max_drawdown = strat.analyzers.drawdown.get_analysis().get('max', {}).get('drawdown', 0)
        
        trades = strat.analyzers.trades.get_analysis()
        total_trades = trades.get('total', {}).get('closed', 0)
        winning_trades = trades.get('won', {}).get('total', 0)
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
        
        # Save plot
        try:
            cerebro.plot(style='candlestick', savefig=True, figfilename='backtest_result.png')
            logger.info("Saved backtest chart to backtest_result.png")
        except Exception as e:
            logger.warning(f"Could not save plot: {e}")
        
        return {
            "initial_cash": initial_cash,
            "final_value": final_value,
            "total_return_pct": total_return_pct,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown_pct": max_drawdown,
            "total_trades": total_trades,
            "winning_trades": winning_trades,
            "win_rate": win_rate,
            "trade_history": [] 
        }
        
    def generate_report(self, results: dict) -> str:
        report = f"""
        [Backtest Report]
        Initial Cash: {results.get('initial_cash')}
        Final Value: {results.get('final_value')}
        Total Return: {results.get('total_return_pct', 0):.2f}%
        Sharpe Ratio: {results.get('sharpe_ratio', 0):.2f}
        Max Drawdown: {results.get('max_drawdown_pct', 0):.2f}%
        Win Rate: {results.get('win_rate', 0):.2f}% ({results.get('winning_trades')}/{results.get('total_trades')})
        """
        return report
