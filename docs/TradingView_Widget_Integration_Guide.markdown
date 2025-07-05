# TradingView Widget Integration Guide

This guide provides detailed instructions for integrating TradingView widgets into a webpage to create a comprehensive stock information display. It covers the selection, customization, and embedding of widgets, including handling dynamic stock symbols and responsive design, based on TradingView's official tutorials. Follow these steps to build an interactive, data-rich stock page.

## Prerequisites
- Basic knowledge of HTML, CSS, and JavaScript.
- A text editor or IDE for coding.
- Access to a web server or local development environment to test the page.

## Step 1: Set Up the Basic HTML Structure
Create a basic HTML page to serve as the foundation for embedding TradingView widgets. This structure includes a header, sections for widgets, and a footer with attribution.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stock Information Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .widget-section {
            margin-bottom: 20px;
        }
        .widget-section h2 {
            font-size: 1.5em;
            margin-bottom: 10px;
        }
        .tradingview-widget-container {
            height: 500px; /* Set default height for containers */
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Stock Information Dashboard</h1>
        </header>
        <main>
            <section id="ticker-tape" class="widget-section"></section>
            <section id="symbol-info" class="widget-section"></section>
            <section id="advanced-chart" class="widget-section"></section>
            <section id="company-profile" class="widget-section"></section>
            <section id="fundamental-data" class="widget-section"></section>
            <section id="technical-analysis" class="widget-section"></section>
            <section id="top-stories" class="widget-section"></section>
        </main>
        <footer>
            <p>Charts and financial information provided by <a href="https://www.tradingview.com">TradingView</a>.</p>
        </footer>
    </div>
</body>
</html>
```

**Notes**:
- The `container` class ensures a centered layout with a maximum width.
- Each `widget-section` will hold a specific TradingView widget.
- The default height of `500px` is set for widget containers to ensure proper display when using the "Use container size" option.[](https://www.tradingview.com/widget-docs/tutorials/build-page/widget-integration/)[](https://www.tradingview.com/widget-docs/tutorials/set-widget-size/)
- The footer includes TradingView attribution, which is required unless special permission is obtained.[](https://www.tradingview.com/widget-docs/tutorials/build-page/getting-started/)

## Step 2: Select and Customize Widgets
TradingView offers various widgets, including Ticker Tape, Symbol Info, Advanced Chart, Company Profile, Fundamental Data, Technical Analysis, and Top Stories. Each widget can be customized via TradingView’s widget constructor or manually in the embed code.

1. **Visit TradingView’s Widget Page**:
   - Go to [TradingView Widgets](https://www.tradingview.com/widget/) to browse available widgets.[](https://www.tradingview.com/widget-docs/widgets/)
   - Select a widget (e.g., Ticker Tape) and click "Get Widget" to customize it.

2. **Customize Widget Settings**:
   - Choose a symbol (e.g., `NASDAQ:AAPL` for Apple Inc.).
   - Select a theme (`light` or `dark`). This guide uses `light` to match a white background.
   - Enable `isTransparent` for seamless integration if your page background is not pure white or black.
   - Adjust other settings like `locale` (e.g., `en` for English) or `dateRange` (e.g., `12m` for 12 months).
   - For widgets like Ticker Tape or Advanced Chart, enable "Use container size" for responsive design, ensuring the container has a defined height in CSS.[](https://www.tradingview.com/widget-docs/tutorials/set-widget-size/)

3. **Generate Embed Code**:
   - After customizing, click "Apply" to generate the embed code, which includes an HTML `<div>` and a `<script>` tag with JSON options.[](https://developer.interactsoftware.com/docs/embedding-tradingview-widgets)

## Step 3: Integrate Widgets
Embed each widget into the corresponding `<section>` in the HTML structure. Below are the embed codes for the selected widgets, configured with the `light` theme, `isTransparent` enabled, and responsive sizing.

### 3.1 Ticker Tape Widget
Displays a scrolling list of stock symbols with prices and daily changes (up to 15 symbols).[](https://www.tradingview.com/widget-docs/widgets/tickers/ticker/)

```html
<section id="ticker-tape" class="widget-section">
    <h2>Ticker Tape</h2>
    <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com" rel="noopener" target="_blank">TradingView</a>
        </div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js" async>
        {
            "symbols": [
                {"description": "Apple", "proName": "NASDAQ:AAPL"},
                {"description": "Google", "proName": "NASDAQ:GOOGL"},
                {"description": "Microsoft", "proName": "NASDAQ:MSFT"}
            ],
            "showSymbolLogo": true,
            "colorTheme": "light",
            "isTransparent": true,
            "displayMode": "adaptive",
            "locale": "en"
        }
        </script>
    </div>
</section>
```

**Notes**:
- The `symbols` array lists up to 15 stock symbols. Ensure the parent container is wide enough to display all symbols.[](https://www.tradingview.com/widget-docs/faq/general/)
- `displayMode: "adaptive"` switches between Regular and Compact modes based on container width.[](https://www.tradingview.com/widget-docs/faq/general/)

### 3.2 Symbol Info Widget
Shows detailed information about a single stock, including price and key metrics.[](https://www.tradingview.com/widget-docs/widgets/charts/symbol-overview/)

```html
<section id="symbol-info" class="widget-section">
    <h2>Symbol Info</h2>
    <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com" rel="noopener" target="_blank">TradingView</a>
        </div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js" async>
        {
            "symbol": "NASDAQ:AAPL",
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "light",
            "isTransparent": true
        }
        </script>
    </div>
</section>
```

### 3.3 Advanced Chart Widget
Provides an interactive chart with over 80 technical indicators and drawing tools.[](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)

```html
<section id="advanced-chart" class="widget-section">
    <h2>Advanced Chart</h2>
    <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com" rel="noopener" target="_blank">TradingView</a>
        </div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        {
            "symbol": "NASDAQ:AAPL",
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "light",
            "isTransparent": true,
            "interval": "D",
            "timezone": "Etc/UTC",
            "autosize": true
        }
        </script>
    </div>
</section>
```

**Notes**:
- Set `autosize: true` to make the widget responsive within the container. Ensure the container has a defined height (e.g., `500px`).[](https://www.tradingview.com/widget-docs/tutorials/set-widget-size/)

### 3.4 Company Profile Widget
Displays a company description, sector, and industry information.[](https://in.tradingview.com/widget/)

```html
<section id="company-profile" class="widget-section">
    <h2>Company Profile</h2>
    <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com" rel="noopener" target="_blank">TradingView</a>
        </div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-profile.js" async>
        {
            "symbol": "NASDAQ:AAPL",
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "light",
            "isTransparent": true
        }
        </script>
    </div>
</section>
```

### 3.5 Fundamental Data Widget
Provides in-depth financial metrics for a company.[](https://in.tradingview.com/widget/)

```html
<section id="fundamental-data" class="widget-section">
    <h2>Fundamental Data</h2>
    <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com" rel="noopener" target="_blank">TradingView</a>
        </div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-financials.js" async>
        {
            "symbol": "NASDAQ:AAPL",
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "light",
            "isTransparent": true
        }
        </script>
    </div>
</section>
```

### 3.6 Technical Analysis Widget
Shows ratings based on multiple technical indicators for a stock.[](https://www.tradingview.com/widget-docs/widgets/symbol-details/technical-analysis/)

```html
<section id="technical-analysis" class="widget-section">
    <h2>Technical Analysis</h2>
    <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com" rel="noopener" target="_blank">TradingView</a>
        </div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js" async>
        {
            "symbol": "NASDAQ:AAPL",
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "light",
            "isTransparent": true,
            "interval": "1D"
        }
        </script>
    </div>
</section>
```

### 3.7 Top Stories Widget
Displays the latest news related to the selected stock.[](https://in.tradingview.com/widget/)

```html
<section id top-stories" class="widget-section">
    <h2>Top Stories</h2>
    <div class="tradingview-widget-container">
        <div class="tradingview-widget-container__widget"></div>
        <div class="tradingview-widget-copyright">
            <a href="https://www.tradingview.com" rel="noopener" target="_blank">TradingView</a>
        </div>
        <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-timeline.js" async>
        {
            "symbol": "NASDAQ:AAPL",
            "width": "100%",
            "height": "100%",
            "locale": "en",
            "colorTheme": "light",
            "isTransparent": true,
            "feedMode": "symbol"
        }
        </script>
    </div>
</section>
```

## Step 4: Implement Dynamic Symbol Changes
To allow users to switch between different stocks dynamically, add JavaScript to update the `symbol` property of all widgets.

```html
<script>
    function updateSymbol(symbol) {
        const widgets = [
            'ticker-tape',
            'symbol-info',
            'advanced-chart',
            'company-profile',
            'fundamental-data',
            'technical-analysis',
            'top-stories'
        ];

        widgets.forEach(widgetId => {
            const container = document.querySelector(`#${widgetId} .tradingview-widget-container__widget`);
            if (container) {
                // Remove existing widget
                container.innerHTML = '';
                // Re-create widget with new symbol
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = true;
                script.src = `https://s3.tradingview.com/external-embedding/embed-widget-${widgetId === 'ticker-tape' ? 'ticker-tape' : widgetId === 'symbol-info' ? 'symbol-info' : widgetId === 'advanced-chart' ? 'advanced-chart' : widgetId === 'company-profile' ? 'symbol-profile' : widgetId === 'fundamental-data' ? 'financials' : widgetId === 'technical-analysis' ? 'technical-analysis' : 'timeline'}.js`;
                script.innerHTML = JSON.stringify({
                    "symbol": symbol,
                    "width": "100%",
                    "height": "100%",
                    "locale": "en",
                    "colorTheme": "light",
                    "isTransparent": true,
                    ...(widgetId === 'ticker-tape' ? {
                        "symbols": [
                            {"description": symbol.split(':')[1], "proName": symbol},
                            {"description": "Google", "proName": "NASDAQ:GOOGL"},
                            {"description": "Microsoft", "proName": "NASDAQ:MSFT"}
                        ],
                        "showSymbolLogo": true,
                        "displayMode": "adaptive"
                    } : widgetId === 'advanced-chart' ? {
                        "interval": "D",
                        "timezone": "Etc/UTC",
                        "autosize": true
                    } : widgetId === 'technical-analysis' ? {
                        "interval": "1D"
                    } : widgetId === 'top-stories' ? {
                        "feedMode": "symbol"
                    } : {})
                });
                container.appendChild(script);
            }
        });
    }

    // Example: Update to a different symbol
    document.addEventListener('DOMContentLoaded', () => {
        const symbolInput = document.createElement('input');
        symbolInput.type = 'text';
        symbolInput.placeholder = 'Enter symbol (e.g., NASDAQ:GOOGL)';
        symbolInput.style.marginBottom = '10px';
        document.querySelector('.container').insertBefore(symbolInput, document.querySelector('main'));

        symbolInput.addEventListener('change', (e) => {
            const newSymbol = e.target.value || 'NASDAQ:AAPL';
            updateSymbol(newSymbol);
        });

        // Initialize with default symbol
        updateSymbol('NASDAQ:AAPL');
    });
</script>
```

**Notes**:
- The `updateSymbol` function dynamically updates the `symbol` property for all widgets.
- For the Ticker Tape widget, the new symbol is added to the `symbols` array.
- Avoid dynamic injection via `innerHTML` for scripts to prevent browser security issues. Instead, create new `<script>` elements.[](https://www.tradingview.com/widget-docs/faq/general/)
- This script assumes all widgets are present. Adjust the `widgets` array if fewer widgets are used.

## Step 5: Ensure Responsive Design
To make the page responsive:
- Use `width: "100%"` and `autosize: true` in widget configurations for fluid layouts.
- Set a container height (e.g., `500px`) in CSS to prevent widgets from collapsing when `Use container size` is enabled.[](https://www.tradingview.com/widget-docs/tutorials/set-widget-size/)
- Test the page on different screen sizes to ensure widgets adapt correctly. Use `displayMode: "adaptive"` for widgets like Ticker Tape.[](https://www.tradingview.com/widget-docs/faq/general/)

## Step 6: Test and Debug
- **Test the Page**: Open the HTML file in a browser or host it on a web server to verify widget functionality.
- **Check for Errors**:
  - Ensure the container has a defined height if `autosize` is enabled.[](https://www.tradingview.com/widget-docs/tutorials/set-widget-size/)
  - Verify that scripts load correctly and are not blocked by the browser. Avoid dynamic injection via libraries like jQuery.[](https://www.tradingview.com/widget-docs/faq/general/)
- **Customization Issues**: If widgets don’t match your site’s style, adjust `colorTheme` or `isTransparent` settings.[](https://www.tradingview.com/widget-docs/tutorials/build-page/widget-integration/)
- **Attribution**: Ensure the TradingView attribution remains unless you’ve obtained permission to remove it.[](https://www.tradingview.com/widget-docs/tutorials/build-page/getting-started/)

## Step 7: Additional Customizations
- **Lazy Loading**: To improve page load times, configure lazy loading by loading widget scripts only when they enter the viewport. See TradingView’s lazy loading tutorial for details.[](https://www.tradingview.com/widget-docs/widgets/charts/)
- **Custom Links**: Redirect symbol clicks to your own chart pages using the `largeChartUrl` parameter (e.g., `https://yoursite.com/?tvwidgetsymbol={symbolname}`).[](https://www.tradingview.com/widget-docs/faq/general/)
- **Language Support**: Set the `locale` parameter to one of the 30+ supported languages to match your audience.[](https://in.tradingview.com/widget/)

## Final Notes
- Widgets come with built-in data from TradingView, eliminating the need for external data sources.[](https://www.tradingview.com/widget-docs/getting-started/)
- Pine Scripts or trading strategies cannot be added to widgets directly. Instead, publish them as ideas on TradingView and embed the idea.[](https://www.tradingview.com/widget-docs/faq/general/)
- For advanced charting needs, explore TradingView’s Charting Libraries, but note that these require your own data sources.[](https://www.tradingview.com/widget-docs/getting-started/)
- View the final demo page and source code on TradingView’s tutorial page for inspiration.[](https://www.tradingview.com/widget-docs/tutorials/build-page/)

This guide provides a complete framework for embedding TradingView widgets. Save this Markdown file and use it as a reference to build and customize your stock information page.