#!/bin/bash

# COVID-19 DataViz Architecture Installation Script
# This script sets up the new Route → Controller → Service architecture

set -e

echo "🚀 COVID-19 DataViz - Architecture Setup"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "covid19-datavizback" ]; then
    echo -e "${RED}❌ Error: covid19-datavizback directory not found${NC}"
    echo "Please run this script from the Covid-19_DataViz root directory"
    exit 1
fi

echo -e "${YELLOW}📁 Creating directory structure...${NC}"

# Create directories
mkdir -p covid19-datavizback/routes
mkdir -p covid19-datavizback/controllers
mkdir -p covid19-datavizback/services

echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Backup existing server.mjs
echo -e "${YELLOW}💾 Backing up existing server.mjs...${NC}"
if [ -f "covid19-datavizback/server.mjs" ]; then
    cp covid19-datavizback/server.mjs covid19-datavizback/server.mjs.backup
    echo -e "${GREEN}✅ Backup created: server.mjs.backup${NC}"
else
    echo -e "${RED}⚠️  server.mjs not found, skipping backup${NC}"
fi
echo ""

# Check for required artifacts
echo -e "${YELLOW}📝 Checking for artifact files...${NC}"
echo ""
echo "Please make sure you have created the following files:"
echo "  1. routes/covidRoutes.js"
echo "  2. controllers/covidController.js"
echo "  3. services/covidService.js"
echo "  4. middleware/errorMiddleware.js"
echo "  5. middleware/validationMiddleware.js"
echo "  6. server.mjs (new version)"
echo "  7. docker-compose.yml"
echo "  8. covid19-datavizback/Dockerfile"
echo "  9. covid19-datavizfront/Dockerfile"
echo " 10. .dockerignore (in both directories)"
echo ""

read -p "Have you created all these files? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Please create all required files first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All files ready${NC}"
echo ""

# Check Node.js version
echo -e "${YELLOW}🔍 Checking Node.js version...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js $NODE_VERSION found${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo ""

# Check Docker
echo -e "${YELLOW}🐳 Checking Docker...${NC}"
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ $DOCKER_VERSION found${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found. You'll need it for docker-compose${NC}"
fi
echo ""

# Install dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd covid19-datavizback
npm install
echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo ""

cd ..

# Test structure
echo -e "${YELLOW}🧪 Testing file structure...${NC}"
FILES=(
    "covid19-datavizback/routes/covidRoutes.js"
    "covid19-datavizback/controllers/covidController.js"
    "covid19-datavizback/services/covidService.js"
    "covid19-datavizback/middleware/errorMiddleware.js"
    "covid19-datavizback/middleware/validationMiddleware.js"
    "covid19-datavizback/server.mjs"
)

ALL_FILES_EXIST=true
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file${NC}"
    else
        echo -e "${RED}❌ $file - MISSING${NC}"
        ALL_FILES_EXIST=false
    fi
done
echo ""

if [ "$ALL_FILES_EXIST" = false ]; then
    echo -e "${RED}❌ Some files are missing. Please create them first.${NC}"
    exit 1
fi

# Summary
echo ""
echo "========================================="
echo -e "${GREEN}✅ Architecture setup complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Start MongoDB + Redis:"
echo -e "${YELLOW}   docker-compose up mongodb redis${NC}"
echo ""
echo "2. Run data cleaning (if needed):"
echo -e "${YELLOW}   cd covid19-datavizback && npm run clean${NC}"
echo ""
echo "3. Import data:"
echo -e "${YELLOW}   node importCleanedData.mjs${NC}"
echo ""
echo "4. Start backend:"
echo -e "${YELLOW}   npm run dev${NC}"
echo ""
echo "5. Test endpoints:"
echo -e "${YELLOW}   curl http://localhost:5000/api${NC}"
echo -e "${YELLOW}   curl http://localhost:5000/api/get_country${NC}"
echo ""
echo "Or start everything with Docker:"
echo -e "${YELLOW}   docker-compose up --build${NC}"
echo ""
echo "📚 Read IMPLEMENTATION_GUIDE.md for detailed instructions"
echo ""