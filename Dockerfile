FROM node:22-slim

# Install system dependencies if needed
# sourcex scraper might need browser dependencies if it uses puppeteer?
# If so, we need to install chrome/chromium libraries. 
# For now, assuming standard node env or simple HTTP scraping.
# If Puppeteer is used:
# RUN apt-get update && apt-get install -y wget gnupg \
#     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
#     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
#     && apt-get update \
#     && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
#       --no-install-recommends \
#     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# --- Setup Scrapers ---
COPY scrapers ./scrapers

# Install dependencies for SourceX scraper
WORKDIR /app/scrapers/sourcex
RUN npm install --production

# --- Setup Backend ---
WORKDIR /app
COPY backend ./backend

WORKDIR /app/backend
RUN npm install --production

# Ensure permissions for entrypoint
RUN chmod +x entrypoint.sh

# Environment Setup
ENV PORT=3000
ENV NODE_ENV=production

# Expose the port
EXPOSE 3000

# Start
CMD ["./entrypoint.sh"]
