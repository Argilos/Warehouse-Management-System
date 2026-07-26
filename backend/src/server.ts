import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    system: 'Enterprise Warehouse Asset & Tool Management System API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Enterprise Warehouse Management REST API running on port ${PORT}`);
});
