import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import * as aiController from '../controllers/ai.js';

const router = Router();

// Apply requireAuth middleware to all AI routes
router.post('/food-analysis', requireAuth, aiController.getFoodAnalysis);
router.post('/meal-plan', requireAuth, aiController.createMealPlan);
router.post('/nutrition-news', requireAuth, aiController.getNutritionNews);
router.post('/symptom-remedy', requireAuth, aiController.getSymptomRemedy);
router.post('/grocery-list', requireAuth, aiController.getGroceryList);
router.post('/dosha-analyzer', requireAuth, aiController.analyzeDosha);
router.post('/food-log-summary', requireAuth, aiController.getFoodLogSummary);
router.post('/hydration-advisor', requireAuth, aiController.getHydrationAdvice);

export default router;
