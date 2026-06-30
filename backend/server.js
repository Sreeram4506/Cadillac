const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB || 'dealership_ai';
const APP_STATE_ID = 'app-state';
let mongoClient = null;
let stateCollection = null;
let appStateCache = null;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simulate API latency
const simulateLatency = (min = 400, max = 800) => {
  return new Promise(resolve => {
    setTimeout(resolve, Math.random() * (max - min) + min);
  });
};

// Read seed data from JSON file
const readSeedData = () => {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return null;
  }
};

const initializeDataStore = async () => {
  const seedData = readSeedData();
  appStateCache = seedData;

  if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not set. Using local JSON file fallback.');
    return;
  }

  mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();

  const db = mongoClient.db(MONGODB_DB_NAME);
  stateCollection = db.collection('app_state');

  const existing = await stateCollection.findOne({ _id: APP_STATE_ID });
  if (!existing) {
    await stateCollection.insertOne({
      _id: APP_STATE_ID,
      ...seedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`MongoDB initialized in database "${MONGODB_DB_NAME}".`);
    return;
  }

  const { _id, createdAt, updatedAt, ...state } = existing;
  appStateCache = state;
  console.log(`Loaded application state from MongoDB database "${MONGODB_DB_NAME}".`);
};

const readData = () => appStateCache;

const persistData = async (data) => {
  if (!stateCollection) {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing data file:', error);
    }
    return;
  }

  try {
    await stateCollection.updateOne(
      { _id: APP_STATE_ID },
      { $set: { ...data, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error writing MongoDB data:', error);
  }
};

const writeData = (data) => {
  appStateCache = data;
  void persistData(data);
  return true;
};

const salespersonProfiles = {
  1: ['finance', 'value', 'negotiation', 'business'],
  2: ['premium', 'family', 'comfort', 'white'],
  3: ['budget', 'first-time', 'value', 'mileage'],
  4: ['trade-in', 'finance', 'follow-up', 'red'],
  5: ['suv', 'mpv', 'delivery', 'boot space'],
};

const normalizeText = (value) => String(value || '').toLowerCase();
const normalizeRole = (value) => normalizeText(value);

const stageFeedbackStages = ['Assigned to Salesperson', 'Vehicle Viewed', 'Test Drive', 'Finance Discussion', 'Quotation Given', 'Converted'];

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const hasOpenAI = () => Boolean(OPENAI_API_KEY);

const extractJsonObject = (text) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch (innerError) {
        return null;
      }
    }
    return null;
  }
};

const callOpenAIText = async ({ system, user, temperature = 0.2 }) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const result = await response.json();
  return result?.choices?.[0]?.message?.content || '';
};

const callOpenAIJson = async ({ system, user, temperature = 0.2 }) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI JSON request failed with status ${response.status}`);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content || '{}';
  return extractJsonObject(content) || {};
};

const buildCustomerIntelligencePrompt = (customer) => {
  const evidence = {
    name: customer.name,
    vehicle: customer.preferredVehicle,
    purchaseIntent: customer.purchaseIntent,
    buyingPurpose: customer.buyingPurpose,
    colorPreference: customer.colorPreference,
    featurePriorities: customer.featurePriorities,
    vehicleReaction: customer.vehicleReaction,
    comfortReaction: customer.comfortReaction,
    priceReaction: customer.priceReaction,
    followUpIntent: customer.followUpIntent,
    salesReview: customer.salesReview,
    inventoryPush: customer.inventoryPush,
    inventoryNotes: customer.inventoryNotes,
    stageFeedbacks: customer.stageFeedbacks,
    appointments: customer.appointments,
    budget: customer.budget,
    financeRequired: customer.financeRequired,
    tradeIn: customer.tradeIn,
    timeline: customer.timeline,
    notes: customer.notes,
  };

  return JSON.stringify(evidence, null, 2);
};

const buildFallbackCustomerAnalysis = (customer, assignedSalesperson) => {
  const intentText = normalizeText([
    customer.purchaseIntent,
    customer.buyingPurpose,
    customer.colorPreference,
    (customer.featurePriorities || []).join(' '),
    customer.vehicleReaction,
    customer.comfortReaction,
    customer.priceReaction,
    customer.followUpIntent,
    customer.salesReview,
    customer.inventoryPush,
    customer.inventoryNotes,
    ...(customer.stageFeedbacks || []).flatMap((item) => [item.customerFeedback, item.salespersonResponse, item.nextStep, item.notes]),
    customer.notes,
    customer.preferredVehicle,
    customer.timeline,
  ].filter(Boolean).join(' '));

  const topPriorities = [];
  ['mileage', 'boot space', 'safety', 'comfort', 'technology', 'low maintenance'].forEach((item) => {
    if (intentText.includes(item)) topPriorities.push(item.replace(/\b\w/g, (c) => c.toUpperCase()));
  });

  if (!topPriorities.length && customer.featurePriorities?.length) {
    topPriorities.push(...customer.featurePriorities);
  }

  const likelyObjections = [];
  if (customer.financeRequired) likelyObjections.push('Monthly EMI or approval speed');
  if (customer.tradeIn) likelyObjections.push('Trade-in valuation');
  if (normalizeText(customer.priceReaction).includes('expensive')) likelyObjections.push('Price sensitivity');
  if (intentText.includes('price') || intentText.includes('budget')) likelyObjections.push('Price sensitivity');
  if (intentText.includes('delivery')) likelyObjections.push('Delivery timing');
  if (normalizeText(customer.followUpIntent).includes('later')) likelyObjections.push('Decision timing');

  const positiveReaction = ['positive', 'very positive', 'loved', 'comfortable with price', 'ready for test drive'].some(
    (phrase) => intentText.includes(phrase)
  );
  const negativeReaction = ['negative', 'concerned', 'not a fit', 'feels expensive', 'needs emi support'].some(
    (phrase) => intentText.includes(phrase)
  );
  const buyingProbability = Math.max(
    5,
    Math.min(
      95,
      55
        + (positiveReaction ? 12 : 0)
        - (negativeReaction ? 14 : 0)
        + (customer.financeRequired ? 6 : 0)
        + (customer.tradeIn ? -3 : 0)
    )
  );

  const customerSentiment = negativeReaction
    ? 'cautious'
    : positiveReaction
      ? 'positive'
      : 'neutral';

  return {
    intentSummary: `${customer.name} is looking for a ${customer.buyingPurpose || 'vehicle'}${customer.preferredVehicle ? ` in a ${customer.preferredVehicle}` : ''}.`,
    buyingReason: customer.buyingPurpose || 'Not specified',
    topPriorities,
    likelyObjections,
    customerSentiment,
    buyingProbability,
    urgency: customer.timeline === 'Immediate' ? 'high' : customer.timeline === 'Within 1 week' ? 'high' : customer.timeline === 'Within 1 month' ? 'medium' : 'low',
    recommendedSalesperson: assignedSalesperson?.name || 'Auto-assigned',
    recommendedNextAction: customer.followUpIntent?.includes('test drive')
      ? 'Schedule the test drive and prepare a side-by-side comparison.'
      : customer.financeRequired
        ? 'Share EMI options and schedule a focused follow-up.'
        : 'Arrange a test drive and send a short variant comparison.',
    ownerInsight: likelyObjections.length
      ? `Primary risk is ${likelyObjections[0]}. Customer sentiment is ${customerSentiment}.`
      : `Customer sentiment is ${customerSentiment} and the visit appears well aligned.`,
    coachingTip: customer.financeRequired
      ? 'Lead with finance clarity and keep the conversation structured.'
      : positiveReaction
        ? 'Use the positive reaction to move toward booking and confirmation.'
        : 'Use feature comparisons and vehicle walkthroughs to build confidence.',
  };
};

const analyzeCustomerIntelligence = async (customer, assignedSalesperson, salespeople) => {
  if (hasOpenAI()) {
    try {
      const payload = buildCustomerIntelligencePrompt(customer);
      const analysis = await callOpenAIJson({
        system: [
          'You are a dealership CRM assistant.',
          'Analyze a customer visit and return only valid JSON with these keys:',
          'intentSummary, buyingReason, topPriorities, likelyObjections, customerSentiment, buyingProbability, urgency, recommendedSalesperson, recommendedNextAction, ownerInsight, coachingTip.',
          'topPriorities and likelyObjections must be arrays of strings.',
          'buyingProbability must be an integer from 0 to 100.',
          'customerSentiment must be one of positive, neutral, or cautious.',
          'urgency must be one of low, medium, or high.',
          'Keep the output concise but specific.',
          `Salespeople available: ${salespeople.map((sp) => `${sp.name} (${sp.aiScore} AI score${sp.specialties?.length ? `, specialties: ${sp.specialties.join(', ')}` : ''})`).join('; ')}`,
        ].join(' '),
        user: payload,
        temperature: 0.2,
      });

      return {
        intentSummary: String(analysis.intentSummary || customer.purchaseIntent || customer.notes || 'Customer intent captured.'),
        buyingReason: String(analysis.buyingReason || customer.buyingPurpose || 'Not specified'),
        topPriorities: Array.isArray(analysis.topPriorities) ? analysis.topPriorities.filter(Boolean) : (customer.featurePriorities || []),
        likelyObjections: Array.isArray(analysis.likelyObjections) ? analysis.likelyObjections.filter(Boolean) : [],
        customerSentiment: ['positive', 'neutral', 'cautious'].includes(String(analysis.customerSentiment)) ? analysis.customerSentiment : undefined,
        buyingProbability: Math.max(0, Math.min(100, parseInt(analysis.buyingProbability, 10) || 55)),
        urgency: ['low', 'medium', 'high'].includes(String(analysis.urgency)) ? analysis.urgency : 'medium',
        recommendedSalesperson: String(analysis.recommendedSalesperson || assignedSalesperson?.name || 'Auto-assigned'),
        recommendedNextAction: String(analysis.recommendedNextAction || 'Schedule a follow-up and test drive.'),
        ownerInsight: String(analysis.ownerInsight || 'Customer intent is being tracked.'),
        coachingTip: String(analysis.coachingTip || 'Keep the conversation structured and document objections clearly.'),
      };
    } catch (error) {
      console.error('OpenAI customer analysis error:', error);
    }
  }

  return buildFallbackCustomerAnalysis(customer, assignedSalesperson);
};

const chooseSalespersonForCustomer = (salespeople, customer) => {
  const explicitId = Number(customer.assignedSalespersonId);
  const explicitFromPayload = customer.assignedSalesperson?.id;
  const explicit = salespeople.find(sp => sp.id === explicitId || sp.id === explicitFromPayload);
  if (explicit) return explicit;

  const intentText = normalizeText([
    customer.purchaseIntent,
    customer.buyingPurpose,
    customer.colorPreference,
    (customer.featurePriorities || []).join(' '),
    customer.notes,
    customer.preferredVehicle,
    customer.timeline,
  ].filter(Boolean).join(' '));

  const budget = Number(customer.budget) || 0;

  let bestSalesperson = salespeople[0] || null;
  let bestScore = -Infinity;

  salespeople.forEach((sp) => {
    const profile = salespersonProfiles[sp.id] || [];
    let score = (Number(sp.aiScore) || 0) * 2 + (Number(sp.rating) || 0) * 10;

    if (customer.financeRequired && profile.includes('finance')) score += 25;
    if (customer.tradeIn && profile.includes('trade-in')) score += 20;
    if (budget > 1800000 && profile.includes('premium')) score += 20;
    if (budget < 1000000 && profile.includes('budget')) score += 20;
    if (normalizeText(customer.buyingPurpose).includes('family') && profile.includes('family')) score += 18;
    if (normalizeText(customer.buyingPurpose).includes('business') && profile.includes('business')) score += 18;
    if (normalizeText(customer.colorPreference) && profile.includes(normalizeText(customer.colorPreference))) score += 15;
    if (normalizeText(customer.vehicleReaction).includes('positive') && (profile.includes('premium') || profile.includes('family'))) score += 10;
    if (normalizeText(customer.comfortReaction).includes('loved') && profile.includes('comfort')) score += 12;
    if (normalizeText(customer.priceReaction).includes('emi') || normalizeText(customer.priceReaction).includes('expensive')) score += 14;
    if (normalizeText(customer.followUpIntent).includes('test drive') && profile.includes('delivery')) score += 10;
    if (normalizeText(customer.salesReview).includes('family') && profile.includes('family')) score += 10;

    profile.forEach((keyword) => {
      if (intentText.includes(keyword)) score += 30;
    });

    if (customer.preferredVehicle) {
      const vehicle = normalizeText(customer.preferredVehicle);
      if (profile.includes('suv') && vehicle.includes('suv')) score += 12;
      if (profile.includes('mpv') && vehicle.includes('innova')) score += 12;
      if (profile.includes('family') && (intentText.includes('family') || vehicle.includes('creta') || vehicle.includes('xuv'))) score += 8;
      if (profile.includes('delivery') && intentText.includes('immediate')) score += 8;
      if (profile.includes('first-time') && intentText.includes('first-time')) score += 12;
      if (profile.includes('mileage') && intentText.includes('mileage')) score += 12;
      if (profile.includes('boot space') && intentText.includes('boot space')) score += 12;
    }

    if (score > bestScore) {
      bestScore = score;
      bestSalesperson = sp;
    }
  });

  return bestSalesperson;
};

const mergeCustomerUpdate = (customer, updates, role) => {
  const normalizedRole = normalizeRole(role);
  const canEditEverything = normalizedRole === 'owner' || normalizedRole === 'manager';
  const canEditLimited = normalizedRole === 'salesman' || normalizedRole === 'salesperson';

  if (canEditEverything) {
    const merged = { ...customer, ...updates };
    if (updates.budget !== undefined) merged.budget = Number(updates.budget);
    if (updates.assignedSalespersonId !== undefined && updates.assignedSalesperson) {
      merged.assignedSalesperson = updates.assignedSalesperson;
    }
    return merged;
  }

  if (canEditLimited) {
    const merged = { ...customer };
    if (updates.status) merged.status = updates.status;
    if (updates.lostReason !== undefined) merged.lostReason = updates.lostReason;
    if (updates.status === 'Converted') merged.lostReason = null;
    if (updates.status === 'Lost' && !updates.lostReason && !customer.lostReason) {
      throw new Error('Lost deals require a reason from the salesperson.');
    }
    return merged;
  }

  throw new Error('You are not allowed to update this customer.');
};

// API Routes

// Get all dashboard data
app.get('/api/dashboard', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    res.json(data.dashboard);
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Get all customers
app.get('/api/customers', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    res.json(data.customers);
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Get single customer
app.get('/api/customers/:id', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    const customer = data.customers.find(c => c.id === parseInt(req.params.id));
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Create new customer
app.post('/api/customers', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    const heuristicSalesperson = chooseSalespersonForCustomer(data.salespeople, req.body);
    const aiAnalysis = await analyzeCustomerIntelligence(req.body, heuristicSalesperson, data.salespeople);
    const aiRecommendedSalesperson = data.salespeople.find(
      (sp) => normalizeText(sp.name) === normalizeText(aiAnalysis.recommendedSalesperson)
    );
    const assignedSalesperson = aiRecommendedSalesperson || heuristicSalesperson;

    if (aiRecommendedSalesperson) {
      aiAnalysis.recommendedSalesperson = aiRecommendedSalesperson.name;
    }

    const newCustomer = {
      id: data.customers.length + 1,
      ...req.body,
      budget: Number(req.body.budget),
      assignedSalesperson,
      aiAnalysis,
      status: 'Checked In',
      checkInDate: new Date().toISOString(),
      inventoryPush: Array.isArray(req.body.inventoryPush) ? req.body.inventoryPush : [],
      inventoryNotes: String(req.body.inventoryNotes || ''),
      stageFeedbacks: Array.isArray(req.body.stageFeedbacks) ? req.body.stageFeedbacks : [],
      appointments: Array.isArray(req.body.appointments) ? req.body.appointments : [],
      journey: [
        {
          stage: 'Checked In',
          timestamp: new Date().toISOString(),
          status: 'active',
          note: 'Customer just checked in'
        }
      ],
      rating: null,
      lostReason: null
    };
    data.customers.push(newCustomer);
    
    // Update dashboard data
    data.dashboard.kpis.todayVisitors.value += 1;
    data.dashboard.activityFeed.unshift({
      id: data.dashboard.activityFeed.length + 1,
      type: 'check-in',
      customer: newCustomer.name,
      vehicle: newCustomer.preferredVehicle,
      salesperson: newCustomer.assignedSalesperson?.name || 'Unassigned',
      timestamp: new Date().toISOString(),
      description: `New customer checked in${newCustomer.buyingPurpose ? ` - ${newCustomer.buyingPurpose}` : ''}`
    });
    
    if (writeData(data)) {
      res.status(201).json(newCustomer);
    } else {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Update customer journey
app.put('/api/customers/:id/journey', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    const customer = data.customers.find(c => c.id === parseInt(req.params.id));
    if (customer) {
      customer.journey = req.body.journey;
      customer.status = req.body.status || customer.status;
      
      if (writeData(data)) {
        res.json(customer);
      } else {
        res.status(500).json({ error: 'Failed to save data' });
      }
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Update customer details with role-based restrictions
app.put('/api/customers/:id', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (!data) {
    res.status(500).json({ error: 'Failed to read data' });
    return;
  }

  const customer = data.customers.find(c => c.id === parseInt(req.params.id));
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  try {
    const updatedCustomer = mergeCustomerUpdate(customer, req.body, req.body.role);
    if (req.body.role && normalizeRole(req.body.role) !== 'owner' && normalizeRole(req.body.role) !== 'manager') {
      updatedCustomer.status = req.body.status || customer.status;
      if (updatedCustomer.status === 'Converted') {
        updatedCustomer.lostReason = null;
      }
    }

    const assignedSalesperson = updatedCustomer.assignedSalesperson || customer.assignedSalesperson;
    const aiAnalysis = await analyzeCustomerIntelligence(updatedCustomer, assignedSalesperson, data.salespeople);
    updatedCustomer.aiAnalysis = aiAnalysis;
    updatedCustomer.assignedSalesperson = assignedSalesperson;

    const index = data.customers.findIndex(c => c.id === customer.id);
    data.customers[index] = updatedCustomer;

    if (writeData(data)) {
      res.json(updatedCustomer);
    } else {
      res.status(500).json({ error: 'Failed to save data' });
    }
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update customer' });
  }
});

// Add appointment to customer
app.post('/api/customers/:id/appointments', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (!data) {
    res.status(500).json({ error: 'Failed to read data' });
    return;
  }

  const customer = data.customers.find(c => c.id === parseInt(req.params.id));
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const role = normalizeRole(req.body.role);
  if (role !== 'owner' && role !== 'manager') {
    res.status(403).json({ error: 'Only manager or owner can manage appointments.' });
    return;
  }

  const appointments = Array.isArray(customer.appointments) ? customer.appointments : [];
  const appointment = {
    id: appointments.length + 1,
    title: String(req.body.title || 'Follow-up'),
    date: String(req.body.date || ''),
    time: String(req.body.time || ''),
    status: 'scheduled',
    notes: String(req.body.notes || ''),
  };

  customer.appointments = [...appointments, appointment];

  if (writeData(data)) {
    res.status(201).json(appointment);
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Get salespeople
app.get('/api/salespeople', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    res.json(data.salespeople);
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Get vehicles
app.get('/api/vehicles', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    res.json(data.vehicles);
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Add vehicle to inventory
app.post('/api/vehicles', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (!data) {
    res.status(500).json({ error: 'Failed to read data' });
    return;
  }

  const name = String(req.body.name || '').trim();
  const type = String(req.body.type || '').trim();
  const minPrice = Number(req.body.minPrice);
  const maxPrice = Number(req.body.maxPrice);

  if (!name || !type || !Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) {
    res.status(400).json({ error: 'Name, type, minimum price, and maximum price are required.' });
    return;
  }

  if (minPrice <= 0 || maxPrice <= 0 || maxPrice < minPrice) {
    res.status(400).json({ error: 'Please enter a valid price range.' });
    return;
  }

  const duplicate = (data.vehicles || []).some((vehicle) => normalizeText(vehicle.name) === normalizeText(name));
  if (duplicate) {
    res.status(409).json({ error: 'This vehicle already exists in inventory.' });
    return;
  }

  const nextId = (data.vehicles || []).reduce((max, vehicle) => Math.max(max, Number(vehicle.id) || 0), 0) + 1;
  const vehicle = {
    id: nextId,
    name,
    type,
    priceRange: [Math.round(minPrice), Math.round(maxPrice)],
  };

  data.vehicles = [...(data.vehicles || []), vehicle];

  if (writeData(data)) {
    res.status(201).json(vehicle);
  } else {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Get lost sale analysis
app.get('/api/lost-sales', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    res.json(data.lostSaleAnalysis);
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Get salesperson performance
app.get('/api/salesperson-performance', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    res.json(data.salespersonPerformance);
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// Get AI insights
app.get('/api/ai-insights', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    res.json(data.dashboard.aiInsights);
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// AI Chat endpoint (OpenAI with fallback)
app.post('/api/ai-chat', async (req, res) => {
  await simulateLatency();
  const { question, context } = req.body;

  if (hasOpenAI()) {
    try {
      const answer = await callOpenAIText({
        system: 'You are an AI assistant for a car dealership. Be concise, specific, and action-oriented.',
        user: `Answer based on this dealership context:\n${JSON.stringify(context, null, 2)}\n\nQuestion: ${question}\n\nProvide specific numbers when possible and end with a practical recommendation.`,
        temperature: 0.2,
      });

      res.json({
        answer,
        source: 'openai'
      });
      return;
    } catch (error) {
      console.error('OpenAI chat error:', error);
    }
  }
  
  // Fallback to canned responses
  const lowerQuestion = question.toLowerCase();
  let answer = '';
  
  if (lowerQuestion.includes('leaving') || lowerQuestion.includes('lost')) {
    const lostData = context?.lostSaleAnalysis?.byReason || [];
    const topReason = lostData[0]?.reason || 'Price';
    answer = `Based on the data, customers are primarily leaving due to **${topReason}**. This month, ${lostData[0]?.count || 0} customers cited this reason. **Recommendation**: Address this objection proactively in sales conversations and consider offering flexible solutions.`;
  } else if (lowerQuestion.includes('demand') || lowerQuestion.includes('vehicle')) {
    const demand = context?.dashboard?.vehicleDemand || [];
    const topVehicle = demand[0]?.vehicle || 'Mahindra XUV700';
    answer = `The **${topVehicle}** is currently in highest demand with ${demand[0]?.count || 0} interested customers. **Recommendation**: Ensure adequate stock and prioritize test drives for this model.`;
  } else if (lowerQuestion.includes('salesperson') || lowerQuestion.includes('coaching')) {
    const performance = context?.salespersonPerformance || [];
    const lowestPerformer = performance[performance.length - 1];
    answer = `${lowestPerformer?.name || 'One salesperson'} could benefit from coaching. Their conversion rate is ${lowestPerformer?.conversionRate || 0}%. **Recommendation**: ${lowestPerformer?.aiCoachingTip || 'Focus on improving follow-up timing and product knowledge.'}`;
  } else if (lowerQuestion.includes('week') || lowerQuestion.includes('comparison')) {
    answer = `This week shows a **15% improvement** in visitor-to-conversion ratio compared to last week. Test drive conversions are up by 8%. **Recommendation**: Continue the current weekend promotion strategy.`;
  } else {
    answer = `Based on the current dealership data, I can see that conversion rates are trending positively. The top performing vehicle is the Mahindra XUV700, and Priya Sharma is leading in sales performance. **Recommendation**: Focus on increasing test drive rates, as customers who test drive are 3x more likely to convert.`;
  }
  
  res.json({
    answer,
    source: 'fallback'
  });
});

// Get branches
app.get('/api/branches', async (req, res) => {
  await simulateLatency();
  const data = readData();
  if (data) {
    res.json(data.branches);
  } else {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

const startServer = async () => {
  await initializeDataStore();

  app.listen(PORT, () => {
    console.log(`Dealership API server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
