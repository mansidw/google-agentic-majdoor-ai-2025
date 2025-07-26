#!/bin/bash

echo "🚀 PWA Testing Script for Wallet Insight Buddy"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 PWA Features Checklist:${NC}"
echo ""

# Check if files exist
echo -e "${YELLOW}📁 Checking PWA files...${NC}"

if [ -f "dist/manifest.webmanifest" ]; then
    echo -e "  ✅ Web App Manifest: ${GREEN}dist/manifest.webmanifest${NC}"
else
    echo -e "  ❌ Web App Manifest: ${RED}Missing${NC}"
fi

if [ -f "dist/sw.js" ]; then
    echo -e "  ✅ Service Worker: ${GREEN}dist/sw.js${NC}"
else
    echo -e "  ❌ Service Worker: ${RED}Missing${NC}"
fi

if [ -f "dist/pwa-192x192.png" ]; then
    echo -e "  ✅ App Icon (192x192): ${GREEN}dist/pwa-192x192.png${NC}"
else
    echo -e "  ❌ App Icon (192x192): ${RED}Missing${NC}"
fi

if [ -f "dist/pwa-512x512.png" ]; then
    echo -e "  ✅ App Icon (512x512): ${GREEN}dist/pwa-512x512.png${NC}"
else
    echo -e "  ❌ App Icon (512x512): ${RED}Missing${NC}"
fi

if [ -f "dist/apple-touch-icon.png" ]; then
    echo -e "  ✅ Apple Touch Icon: ${GREEN}dist/apple-touch-icon.png${NC}"
else
    echo -e "  ❌ Apple Touch Icon: ${RED}Missing${NC}"
fi

if [ -f "dist/offline.html" ]; then
    echo -e "  ✅ Offline Page: ${GREEN}dist/offline.html${NC}"
else
    echo -e "  ❌ Offline Page: ${RED}Missing${NC}"
fi

echo ""
echo -e "${YELLOW}📦 Build Information...${NC}"
echo -e "  📊 Total files: $(find dist -type f | wc -l | xargs)"
echo -e "  📂 Build size: $(du -sh dist | cut -f1)"

echo ""
echo -e "${BLUE}🧪 Testing Instructions:${NC}"
echo ""
echo -e "${YELLOW}1. Desktop Testing (Chrome/Edge):${NC}"
echo "   • Open: http://localhost:4173"
echo "   • Look for install icon in address bar"
echo "   • Open DevTools → Application → Manifest"
echo "   • Check Service Workers tab"
echo ""
echo -e "${YELLOW}2. Mobile Testing (Chrome):${NC}"
echo "   • Open app on mobile device"
echo "   • Look for 'Add to Home Screen' banner"
echo "   • Test offline mode by disabling network"
echo ""
echo -e "${YELLOW}3. PWA Audit:${NC}"
echo "   • Open DevTools → Lighthouse"
echo "   • Run PWA audit"
echo "   • Aim for score > 90"
echo ""
echo -e "${YELLOW}4. Installation Test:${NC}"
echo "   • Install the app when prompted"
echo "   • Check if app appears in app drawer/menu"
echo "   • Verify standalone mode (no browser UI)"
echo ""
echo -e "${GREEN}🎉 PWA setup complete! Your app is ready for installation.${NC}"
echo ""
echo -e "${BLUE}📖 For detailed documentation, see: PWA_README.md${NC}"
