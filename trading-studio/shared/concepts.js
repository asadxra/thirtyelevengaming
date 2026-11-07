// Trading concept library. Each concept knows what market conditions demonstrate it,
// which detector finds real examples of it, and the core teaching content the script builds on.
// Educational only: no concept guarantees an outcome.

const C = (id, category, name, short, detector, conditions, tf, text) => ({ id, category, name, short, detector, conditions, timeframes: tf, ...text });

export const CATEGORIES = ['ICT Concepts', 'Technical Analysis', 'Custom'];

export const CONCEPTS = [
  C('fvg', 'ICT Concepts', 'Fair Value Gap (FVG)', 'FVG', 'fvg',
    'A strong displacement candle whose neighbours leave a price gap; ideally price later returns to the gap.', ['1m', '5m', '15m', '1h'], {
      hook: 'Price just skipped a level. And more often than you’d think, it comes back for it.',
      simple: 'A fair value gap is a spot on the chart where price moved so fast that it left an empty space. Only one side of the market got filled there.',
      technical: 'Take three candles. In a bullish FVG, the high of candle one and the low of candle three do not overlap. The space between them is the gap. Its midpoint is called consequent encroachment.',
      takeaway: 'Mark the gap, wait for price to return, and only act with confirmation and a stop beyond the formation.',
    }),
  C('ifvg', 'ICT Concepts', 'Inverse Fair Value Gap (IFVG)', 'IFVG', 'ifvg',
    'A fair value gap that price closes through, followed by a retest from the other side.', ['1m', '5m', '15m'], {
      hook: 'What happens when a fair value gap fails? It can flip and work in the opposite direction.',
      simple: 'An inverse fair value gap is a gap that got broken. Support becomes resistance, or resistance becomes support.',
      technical: 'A candle body closes beyond the far side of an FVG. The same price range is then treated as a zone in the opposite direction, and traders watch the first retest.',
      takeaway: 'A broken gap is information. Watch the retest from the other side.',
    }),
  C('mss', 'ICT Concepts', 'Market Structure Shift (MSS)', 'MSS', 'mss',
    'A clear trend, then a decisive close through the last protected swing against that trend.', ['1m', '5m', '15m', '1h'], {
      hook: 'The trend didn’t end with a headline. It ended with one candle closing through one level.',
      simple: 'A market structure shift is the first sign that a trend might be turning: price breaks the swing that was keeping the old trend alive.',
      technical: 'In a downtrend, the last lower high is protected. A displacement candle closing above it is a bullish MSS. The reverse applies in an uptrend.',
      takeaway: 'An MSS is a warning, not an entry. Look for the pullback into the move that caused it.',
    }),
  C('bos', 'ICT Concepts', 'Break of Structure (BOS)', 'BOS', 'bos',
    'A trend that keeps closing beyond its previous swing in the same direction.', ['5m', '15m', '1h', '4h'], {
      hook: 'Every healthy trend leaves the same footprint. Here is how to read it.',
      simple: 'A break of structure is when price closes past its last swing in the direction it was already going. It confirms the trend.',
      technical: 'In an uptrend, each close above the prior swing high is a BOS. The swing low that created it becomes the protected level.',
      takeaway: 'Trade with confirmed structure and know which swing invalidates you.',
    }),
  C('cisd', 'ICT Concepts', 'Change in State of Delivery (CISD)', 'CISD', 'cisd',
    'A run of same-direction candles, then a close beyond the open of the first candle in that run.', ['1m', '5m', '15m'], {
      hook: 'There is a moment when price stops delivering one way and starts delivering the other. You can mark it to the tick.',
      simple: 'A change in state of delivery is the first close that undoes a series of candles moving one way.',
      technical: 'Find consecutive down-close candles. Mark the open of the first one. A later close above that open is a bullish CISD, and the reverse for bearish.',
      takeaway: 'CISD gives an early, objective signal that order flow may have flipped.',
    }),
  C('sweep', 'ICT Concepts', 'Liquidity Sweeps', 'Sweep', 'sweep',
    'An obvious swing high or low that price trades through briefly, then closes back inside.', ['1m', '5m', '15m'], {
      hook: 'That breakout everyone bought? It was the trap.',
      simple: 'A liquidity sweep is when price pokes past an obvious high or low to trigger stop orders, then reverses.',
      technical: 'Resting stops sit beyond swing points. A wick through the level that closes back inside shows those orders were absorbed rather than followed.',
      takeaway: 'Don’t chase the poke. Wait for the close back inside and a shift in structure.',
    }),
  C('bsl', 'ICT Concepts', 'Buy-Side Liquidity (BSL)', 'BSL', 'bsl',
    'Swing highs or equal highs with stops above them, later run by price.', ['5m', '15m', '1h'], {
      hook: 'Above every obvious high there is a pile of orders. Price knows it.',
      simple: 'Buy-side liquidity is the cluster of buy orders above highs: short sellers’ stops and breakout entries.',
      technical: 'Old highs and equal highs are buy-side liquidity. Price is often drawn to them, and the reaction after they are taken matters more than the touch itself.',
      takeaway: 'Mark the highs that everyone can see. They are targets, and sometimes turning points.',
    }),
  C('ssl', 'ICT Concepts', 'Sell-Side Liquidity (SSL)', 'SSL', 'ssl',
    'Swing lows or equal lows with stops below them, later run by price.', ['5m', '15m', '1h'], {
      hook: 'Below every obvious low is a pool of stop losses waiting to be hit.',
      simple: 'Sell-side liquidity is the cluster of sell orders below lows: buyers’ stops and breakdown entries.',
      technical: 'Old lows and equal lows are sell-side liquidity. Once taken, watch whether price accepts below or snaps back.',
      takeaway: 'If your stop sits at the obvious low, so does everyone else’s.',
    }),
  C('ob', 'ICT Concepts', 'Order Blocks', 'OB', 'ob',
    'The last opposite-color candle before a strong displacement, later revisited.', ['5m', '15m', '1h'], {
      hook: 'Big moves start somewhere. This candle is where.',
      simple: 'An order block is the last candle in the opposite direction right before a strong move. It marks where large orders were likely placed.',
      technical: 'For a bullish order block, take the last down-close candle before bullish displacement. Its range becomes a zone that price may return to.',
      takeaway: 'Order blocks matter most when they caused a break of structure and left an imbalance.',
    }),
  C('breaker', 'ICT Concepts', 'Breaker Blocks', 'Breaker', 'breaker',
    'An order block whose move took liquidity, then failed; price closes through the block and retests it.', ['5m', '15m', '1h'], {
      hook: 'When an order block fails, it doesn’t disappear. It changes sides.',
      simple: 'A breaker block is a failed order block. After price breaks through it, the zone often acts in the opposite direction.',
      technical: 'The move from the original block takes liquidity, then reverses and closes through the block. The retest of that block from the other side is the breaker.',
      takeaway: 'Failed levels can be the strongest ones. Watch the retest.',
    }),
  C('mitigation', 'ICT Concepts', 'Mitigation Blocks', 'Mitigation', 'mitigation',
    'An order block whose move fails to make a new extreme, then breaks and is retested.', ['5m', '15m', '1h'], {
      hook: 'Some reversals start with a move that simply runs out of strength.',
      simple: 'A mitigation block is like a breaker, but the move away from it never took the previous high or low. It failed early.',
      technical: 'A failure swing (a lower high or higher low) is followed by a close through the block. Price returning to it lets earlier participants exit, or mitigate.',
      takeaway: 'A failure to make a new extreme is a clue. The block that failed becomes a level.',
    }),
  C('displacement', 'ICT Concepts', 'Displacement', 'Displacement', 'displacement',
    'Candles much larger than the average range with strong bodies.', ['1m', '5m', '15m'], {
      hook: 'Not all candles are equal. Some tell you exactly who is in control.',
      simple: 'Displacement is an aggressive move: candles far larger than normal, with big bodies and small wicks.',
      technical: 'Compare the candle to the average true range. A body several times ATR shows urgency and usually leaves fair value gaps behind.',
      takeaway: 'Look for setups that start from displacement, not from slow drifts.',
    }),
  C('premium-discount', 'ICT Concepts', 'Premium and Discount', 'P/D', 'premium-discount',
    'A clear swing leg and a later pullback into the half of the range opposite to the trend.', ['15m', '1h', '4h'], {
      hook: 'Would you buy at the top of the range? Many traders do without realizing it.',
      simple: 'Split a price range in half. Above the middle is premium, below is discount. Buy in discount, sell in premium.',
      technical: 'Anchor a Fibonacci on the dealing range. The 50% level is equilibrium. In an uptrend, longs from below 50% offer better location.',
      takeaway: 'Location is part of the edge. Know which half of the range you are in.',
    }),
  C('ote', 'ICT Concepts', 'Optimal Trade Entry (OTE)', 'OTE', 'ote',
    'A clear swing leg followed by a retracement into the 62–79% Fibonacci zone.', ['5m', '15m', '1h'], {
      hook: 'There is a specific zone where pullbacks tend to stop. It sits between 62 and 79 percent.',
      simple: 'Optimal trade entry is a pullback into a deep part of the previous move, measured with Fibonacci.',
      technical: 'Draw the Fibonacci from the swing low to the swing high. The 62%, 70.5% and 79% levels form the OTE zone for a long, and the reverse for a short.',
      takeaway: 'Combine OTE with structure and an imbalance; never use the zone alone.',
    }),
  C('judas', 'ICT Concepts', 'Judas Swing', 'Judas', 'judas',
    'An early move after a session open that reverses and closes the session on the other side of the open.', ['1m', '5m'], {
      hook: 'The first move after the open is often the lie.',
      simple: 'A Judas swing is a false move near a session open that pulls traders in the wrong direction before the real move.',
      technical: 'Mark the session open. If price first runs one way, takes liquidity, then reverses through the open, the first leg was the Judas swing.',
      takeaway: 'Be patient at the open. Let the false move reveal itself.',
    }),
  C('po3', 'ICT Concepts', 'Power of Three', 'PO3', 'po3',
    'A quiet Asian range, a run of one side, then an expansion beyond the other side.', ['5m', '15m', '1h'], {
      hook: 'Most trading days follow the same three-act story.',
      simple: 'Power of three is accumulation, manipulation and distribution: a range, a false move, then the real move.',
      technical: 'Asia builds the range. London or the New York open runs one side to take liquidity. The expansion then delivers price to the opposite side and beyond.',
      takeaway: 'Identify which act the day is in before you trade it.',
    }),
  C('asia', 'ICT Concepts', 'Asian Session Highs and Lows', 'Asia H/L', 'asia',
    'A defined Asian session range followed by London or New York trading through its high or low.', ['5m', '15m'], {
      hook: 'The quietest session of the day sets the levels the busiest sessions attack.',
      simple: 'The high and low of the Asian session are liquidity levels. London and New York often run one of them.',
      technical: 'Mark the Asian range (8 PM to midnight New York time). Stops build above the high and below the low.',
      takeaway: 'Mark Asia every day. It frames the rest of the session.',
    }),
  C('sessions', 'ICT Concepts', 'London and New York Sessions', 'Sessions', 'sessions',
    'Intraday data covering overnight, London and the New York open.', ['1m', '5m', '15m'], {
      hook: 'The same market behaves completely differently depending on the clock.',
      simple: 'Trading sessions are time windows. London and New York bring the most volume and the biggest moves.',
      technical: 'London runs 2 to 5 AM New York time, the New York AM session 9:30 to 11 AM. Range and volume typically expand at those opens.',
      takeaway: 'Trade when the market is active, and know which session you are in.',
    }),
  C('sr', 'Technical Analysis', 'Support and Resistance', 'S/R', 'sr',
    'A price level that has produced several reactions.', ['15m', '1h', '4h', '1D'], {
      hook: 'Price has memory. These levels prove it.',
      simple: 'Support is a level where buyers keep stepping in. Resistance is where sellers keep appearing.',
      technical: 'Cluster swing highs and lows that sit at the same price. Each extra reaction adds orders around the level.',
      takeaway: 'Treat levels as zones, and plan for both a hold and a break.',
    }),
  C('trendline', 'Technical Analysis', 'Trendlines', 'Trendline', 'trendline',
    'Two rising lows (or falling highs) and a later third touch.', ['15m', '1h', '4h'], {
      hook: 'Two points draw a line. The third touch makes it real.',
      simple: 'A trendline connects rising lows in an uptrend or falling highs in a downtrend.',
      technical: 'Draw from the first swing to the second. A valid line has price respecting it in between, and a third touch confirms it.',
      takeaway: 'Use trendlines to frame trends, not as exact entry prices.',
    }),
  C('candles', 'Technical Analysis', 'Candlestick Patterns', 'Candles', 'candles',
    'Engulfing, hammer or shooting-star candles, ideally at swing points.', ['5m', '15m', '1h', '1D'], {
      hook: 'One candle can tell you who just won the battle.',
      simple: 'Candlestick patterns show how buyers and sellers fought within a bar.',
      technical: 'An engulfing candle swallows the previous body. A hammer has a long lower wick. Location matters more than the pattern itself.',
      takeaway: 'Patterns at key levels mean something; patterns in the middle of nowhere rarely do.',
    }),
  C('structure', 'Technical Analysis', 'Market Structure', 'Structure', 'structure',
    'Several clear swings to label as higher highs, higher lows, lower highs and lower lows.', ['15m', '1h', '4h'], {
      hook: 'Before any indicator, there is structure.',
      simple: 'Market structure is the pattern of highs and lows. Higher highs and lows mean uptrend; lower highs and lows mean downtrend.',
      technical: 'Label each swing as HH, HL, LH or LL. A change in that sequence is the first sign of a trend change.',
      takeaway: 'Label the swings first. Everything else builds on it.',
    }),
  C('volume', 'Technical Analysis', 'Volume Analysis', 'Volume', 'volume',
    'A volume spike well above average with a clear price reaction.', ['5m', '15m', '1h'], {
      hook: 'Price shows what happened. Volume shows how much conviction was behind it.',
      simple: 'Volume is how many contracts or shares traded. Spikes show where big participation entered.',
      technical: 'Compare each bar’s volume to its 20-bar average. Two to three times normal marks an event worth studying.',
      takeaway: 'Confirm important moves with volume.',
    }),
  C('ma', 'Technical Analysis', 'Moving Averages', 'MAs', 'ma',
    'A 20/50 EMA crossover with follow-through.', ['15m', '1h', '4h', '1D'], {
      hook: 'Two lines, one cross, and a clearer view of the trend.',
      simple: 'A moving average smooths price to show the trend. A fast one crossing a slow one signals a shift.',
      technical: 'The 20 EMA reacts quickly; the 50 EMA reflects the broader trend. Crosses confirm direction but lag price.',
      takeaway: 'Use moving averages for trend context, not precise entries.',
    }),
  C('rsi-macd', 'Technical Analysis', 'RSI and MACD', 'RSI/MACD', 'rsi-macd',
    'RSI reaching overbought/oversold, then a MACD signal-line cross.', ['15m', '1h', '4h'], {
      hook: 'Momentum fades before price turns. These two indicators show it.',
      simple: 'RSI measures how stretched price is. MACD shows changes in momentum.',
      technical: 'RSI below 30 is oversold, above 70 overbought. A MACD line crossing its signal confirms momentum turning.',
      takeaway: 'Indicators confirm price; they don’t replace it.',
    }),
  C('rr', 'Technical Analysis', 'Risk-to-Reward', 'R:R', 'rr',
    'A defined setup with an entry, a stop and a measurable follow-through.', ['5m', '15m', '1h'], {
      hook: 'You can be wrong more than half the time and still make money. Here is the math.',
      simple: 'Risk-to-reward compares what you risk to what you aim to make. 1 to 2 means risking one to make two.',
      technical: 'Risk is the distance from entry to stop. A 2R target is twice that distance. With 2R targets, a 40% win rate can still be profitable before costs.',
      takeaway: 'Define risk first, then decide if the reward is worth it.',
    }),
  C('sltp', 'Technical Analysis', 'Stop Loss and Take Profit', 'SL/TP', 'sltp',
    'A setup with a logical invalidation point and a logical target.', ['5m', '15m', '1h'], {
      hook: 'Where you put your stop decides whether a good idea becomes a good trade.',
      simple: 'A stop loss closes a trade when the idea is wrong. A take profit closes it when the target is reached.',
      technical: 'Place the stop where the setup is invalidated, beyond the structure that defined it, not at a random number of points. Place targets at liquidity or a fixed R multiple.',
      takeaway: 'Stops belong where you are wrong; targets belong where price is likely to go.',
    }),
];

export const conceptById = (id, custom = []) => CONCEPTS.find((c) => c.id === id) || custom.find((c) => c.id === id) || null;

export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
export const TONES = ['Educational', 'Technical'];
export const LENGTHS = [
  { id: 'short', label: 'Short-form (Shorts, 30–90s)', min: 30, max: 90, def: 60 },
  { id: 'long', label: 'Long-form (3–15 min)', min: 180, max: 900, def: 300 },
];
export const COMPLEXITY = ['Simple', 'Standard', 'Detailed'];
