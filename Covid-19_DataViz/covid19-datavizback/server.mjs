import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import CovidData from './models/CovidData.js';
import covidRoutes from './routes/covidRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===== MIDDLEWARES =====
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    const count = await CovidData.countDocuments();
    if (count === 0) {
      console.log('⚠️  No data in database. Run cleaning + import first:');
      console.log('   1. npm run clean');
      console.log('   2. node importCleanedData.mjs');
    } else {
      const countries = await CovidData.distinct('Country_Region');
      console.log(`📊 Database has ${count} documents from ${countries.length} countries`);
    }
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ===== ROUTES =====
app.use('/api', covidRoutes);

// Legacy root route for backward compatibility
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'COVID-19 DataViz API',
    version: '2.0',
    endpoints: '/api/*'
  });
});

// ===== ERROR HANDLING =====
app.use(notFoundHandler);
app.use(errorHandler);

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});