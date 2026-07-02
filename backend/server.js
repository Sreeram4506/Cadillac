const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const { MongoClient } = require('mongodb');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB_NAME = process.env.MONGODB_DB || 'dealership_ai';
const APP_STATE_ID = 'app-state';
const AUTH_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || 'dealership-auth-secret';
let mongoClient = null;
let stateCollection = null;
let appStateCache = null;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/login') {
    next();
    return;
  }

  const user = getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  req.user = user;
  next();
});

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

const roleLabels = {
  owner: 'Owner',
  manager: 'Manager',
  salesperson: 'Salesperson',
};

const toSlug = (value) =>
  normalizeText(value)
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

const getDefaultAuthUsers = (data) => {
  const salespersonUsers = Array.isArray(data?.salespeople)
    ? data.salespeople.map((salesperson) => ({
        id: `salesperson-${salesperson.id}`,
        name: salesperson.name,
        email: `${toSlug(salesperson.name) || `salesperson-${salesperson.id}`}@demo.local`,
        password: 'sales123',
        role: 'salesperson',
      }))
    : [];

  return [
    {
      id: 'owner-demo',
      name: 'Owner',
      email: 'owner@demo.local',
      password: 'owner123',
      role: 'owner',
    },
    {
      id: 'manager-demo',
      name: 'Manager',
      email: 'manager@demo.local',
      password: 'manager123',
      role: 'manager',
    },
    {
      id: 'salesperson-demo',
      name: 'Salesperson',
      email: 'salesperson@demo.local',
      password: 'sales123',
      role: 'salesperson',
    },
    ...salespersonUsers,
  ];
};

const createAuthToken = (user) => {
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      iat: Date.now(),
    })
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifyAuthToken = (token) => {
  const [payload, signature] = String(token || '').split('.');
  if (!payload || !signature) return null;

  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (signature.length !== expected.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (error) {
    return null;
  }
};

const getAuthUserFromRequest = (req) => {
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.headers['x-auth-token'];
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
};

const requireAuth = (req, res, next) => {
  const user = getAuthUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  req.user = user;
  next();
};

const requireRoles = (roles) => (req, res, next) => {
  const normalized = normalizeRole(req.user?.role);
  if (!roles.includes(normalized)) {
    res.status(403).json({ error: 'You do not have access to this resource.' });
    return;
  }
  next();
};

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

const buildCopilotContextSummary = (context) => {
  const dashboard = context?.dashboard || {};
  const lostSales = context?.lostSales?.byReason || context?.lostSaleAnalysis?.byReason || [];
  const salespersonPerformance = context?.salespersonPerformance || [];
  const vehicles = context?.vehicles || [];
  const customers = context?.customers || [];

  return {
    kpis: dashboard.kpis || null,
    vehicleDemand: Array.isArray(dashboard.vehicleDemand) ? dashboard.vehicleDemand.slice(0, 5) : [],
    activityFeed: Array.isArray(dashboard.activityFeed) ? dashboard.activityFeed.slice(0, 5) : [],
    topLostReasons: lostSales.slice(0, 5),
    topSalespeople: salespersonPerformance.slice(0, 5),
    bottomSalespeople: salespersonPerformance.slice(-3),
    vehicles: vehicles.slice(0, 8),
    activeCustomers: customers
      .filter((customer) => !["Converted", "Lost"].includes(customer.status))
      .slice(0, 8)
      .map((customer) => ({
        name: customer.name,
        vehicle: customer.preferredVehicle,
        status: customer.status,
        budget: customer.budget,
        financeRequired: customer.financeRequired,
        tradeIn: customer.tradeIn,
        aiAnalysis: customer.aiAnalysis,
      })),
  };
};

const buildOwnerAnalyticsSummary = (data) => {
  const customers = data?.customers || [];
  const salespersonPerformance = data?.salespersonPerformance || [];
  const lostSales = data?.lostSaleAnalysis || data?.lostSales || { byReason: [], trend: [], records: [] };
  const converted = customers.filter((customer) => customer.status === 'Converted').length;
  const lost = customers.filter((customer) => customer.status === 'Lost').length;
  const active = customers.length - converted - lost;
  const stageCompletion = customers.reduce(
    (acc, customer) => {
      const completed = (customer.stageFeedbacks || []).filter(
        (item) => item.customerFeedback || item.salespersonResponse || item.nextStep || item.notes
      ).length;
      acc.total += completed;
      acc.maximum += 6;
      return acc;
    },
    { total: 0, maximum: 0 }
  );

  const customerRiskList = customers
    .filter((customer) => customer.status === 'Lost' || customer.lostReason || (customer.aiAnalysis?.buyingProbability || 0) < 55)
    .slice(0, 12)
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      vehicle: customer.preferredVehicle,
      status: customer.status,
      reason: customer.lostReason || customer.aiAnalysis?.likelyObjections?.[0] || 'Under review',
      salesperson: customer.assignedSalesperson?.name || 'Unassigned',
      probability: customer.aiAnalysis?.buyingProbability ?? null,
      nextAction: customer.aiAnalysis?.recommendedNextAction || 'Follow up directly',
      ownerInsight: customer.aiAnalysis?.ownerInsight || 'AI analysis not available yet.',
    }));

  const topPerformers = salespersonPerformance.slice(0, 5);
  const bottomPerformers = salespersonPerformance.slice(-5);
  const reasonBreakdown = lostSales.byReason || [];
  const topReason = reasonBreakdown[0]?.reason || 'No dominant loss reason yet';
  const highestRiskCustomer = customers.find((customer) => customer.status === 'Lost' || customer.lostReason) || null;

  return {
    metrics: {
      totalCustomers: customers.length,
      activeCustomers: active,
      convertedCustomers: converted,
      lostCustomers: lost,
      stageFeedbackCompletion: stageCompletion.maximum ? Math.round((stageCompletion.total / stageCompletion.maximum) * 100) : 0,
    },
    topPerformers,
    bottomPerformers,
    reasonBreakdown,
    customerRiskList,
    topReason,
    highestRiskCustomer: highestRiskCustomer
      ? {
          id: highestRiskCustomer.id,
          name: highestRiskCustomer.name,
          vehicle: highestRiskCustomer.preferredVehicle,
          reason: highestRiskCustomer.lostReason || highestRiskCustomer.aiAnalysis?.likelyObjections?.[0] || 'Needs review',
          salesperson: highestRiskCustomer.assignedSalesperson?.name || 'Unassigned',
          ownerInsight: highestRiskCustomer.aiAnalysis?.ownerInsight || 'No AI note available yet.',
        }
      : null,
    aiBrief: {
      dashboardNote: `The dealership currently has ${customers.length} customers, ${converted} converted, ${lost} lost, and ${active} active.`,
      performanceNote:
        topPerformers[0]
          ? `${topPerformers[0].name} is leading performance, while ${bottomPerformers[0]?.name || 'the lower half of the team'} needs coaching focus.`
          : 'Performance data is still loading.',
      lossNote: reasonBreakdown[0]
        ? `The biggest customer drop-off reason is ${reasonBreakdown[0].reason}.`
        : 'No loss reason has emerged yet.',
      customerNote: highestRiskCustomer
        ? `${highestRiskCustomer.name} is the most urgent customer to review.`
        : 'No urgent customer is flagged yet.',
    },
  };
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
    if (budget > 75000 && profile.includes('premium')) score += 20;
    if (budget < 45000 && profile.includes('budget')) score += 20;
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
      if (profile.includes('mpv') && vehicle.includes('escalade')) score += 12;
      if (profile.includes('family') && (intentText.includes('family') || vehicle.includes('xt5') || vehicle.includes('lyriq'))) score += 8;
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
  const canEditLimited = normalizedRole === 'salesperson';

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

app.post('/api/auth/login', async (req, res) => {
  await simulateLatency(150, 300);
  const { email, password } = req.body || {};
  const data = readData();
  const authUsers = getDefaultAuthUsers(data);
  const normalizedEmail = normalizeText(email);
  const user = authUsers.find((entry) => normalizeText(entry.email) === normalizedEmail);

  if (!user || String(user.password) !== String(password || '')) {
    res.status(401).json({ error: 'Invalid credentials.' });
    return;
  }

  const sessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: roleLabels[user.role] || user.role,
  };

  res.json({
    token: createAuthToken(sessionUser),
    user: sessionUser,
  });
});

app.get('/api/auth/me', async (req, res) => {
  await simulateLatency(100, 200);
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  res.json({
    user: {
      ...user,
      roleLabel: roleLabels[user.role] || user.role,
    },
  });
});

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
    const role = req.user?.role;
    const updatedCustomer = mergeCustomerUpdate(customer, req.body, role);
    if (normalizeRole(role) !== 'owner' && normalizeRole(role) !== 'manager') {
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

  const role = normalizeRole(req.user?.role);
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
  const role = normalizeRole(req.user?.role);
  if (role !== 'owner' && role !== 'manager') {
    res.status(403).json({ error: 'Only manager or owner can manage inventory.' });
    return;
  }

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

app.get('/api/owner-analytics', async (req, res) => {
  await simulateLatency();
  if (normalizeRole(req.user?.role) !== 'owner') {
    res.status(403).json({ error: 'Owner access required.' });
    return;
  }

  const data = readData();
  if (!data) {
    res.status(500).json({ error: 'Failed to read data' });
    return;
  }

  const snapshot = buildOwnerAnalyticsSummary(data);
  let ownerSummary = snapshot.aiBrief;

  if (hasOpenAI()) {
    try {
      const answer = await callOpenAIText({
        system: 'You are an executive dealership analyst. Summarize the numbers into a concise owner brief and end with practical action items.',
        user: `Create an owner-focused analytics summary from this data:\n${JSON.stringify(snapshot, null, 2)}\n\nReturn a short executive summary with 3 priorities and mention the main customer loss reason.`,
        temperature: 0.2,
      });
      ownerSummary = {
        ...snapshot.aiBrief,
        executiveSummary: answer,
      };
    } catch (error) {
      console.error('Owner analytics OpenAI error:', error);
    }
  }

  res.json({
    ...snapshot,
    ownerSummary,
  });
});

// AI Chat endpoint (OpenAI with fallback)
app.post('/api/ai-chat', async (req, res) => {
  await simulateLatency();
  const { question, context } = req.body;
  const contextSummary = buildCopilotContextSummary(context);

  if (hasOpenAI()) {
    try {
      const answer = await callOpenAIText({
        system: 'You are an AI dealership copilot. Use the provided project data, answer with specific numbers when available, and always end with a practical solution or next step.',
        user: `Use this dealership project data and answer the question directly. If the question asks for a solution, give a short action plan.\n\nProject data:\n${JSON.stringify(contextSummary, null, 2)}\n\nQuestion: ${question}\n\nRequirements:\n- Be concise but intelligent.\n- Mention the most relevant customer, vehicle, salesperson, or KPI details.\n- If data is incomplete, say what is missing and give the best next step anyway.`,
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
  const topDemand = contextSummary.vehicleDemand[0];
  const topLost = contextSummary.topLostReasons[0];
  const topSalesperson = contextSummary.topSalespeople[0];
  const weakestSalesperson = contextSummary.bottomSalespeople[contextSummary.bottomSalespeople.length - 1];
  const activeCustomer = contextSummary.activeCustomers[0];
  
  if (lowerQuestion.includes('leaving') || lowerQuestion.includes('lost') || lowerQuestion.includes('objection')) {
    const reason = topLost?.reason || 'Price';
    const count = topLost?.count || 0;
    answer = `Customers are mainly leaving because of ${reason}, which appears ${count} times in the current data. Solution: address this objection earlier in the conversation, show a clearer value comparison, and offer the next best action immediately after the concern comes up.`;
  } else if (lowerQuestion.includes('demand') || lowerQuestion.includes('vehicle') || lowerQuestion.includes('stock')) {
    const vehicle = topDemand?.vehicle || contextSummary.vehicles[0]?.name || 'Cadillac Escalade';
    const count = topDemand?.count || 0;
    answer = `The strongest demand is for ${vehicle}, with ${count} interested customers. Solution: keep more visibility on this vehicle, prioritize test drives for it, and use it as a lead model when the customer profile matches.`;
  } else if (lowerQuestion.includes('salesperson') || lowerQuestion.includes('coaching')) {
    const name = weakestSalesperson?.name || topSalesperson?.name || 'the team';
    const score = weakestSalesperson?.conversionRate || topSalesperson?.conversionRate || 'n/a';
    answer = `${name} looks like the best coaching candidate right now, with a conversion rate of ${score}. Solution: tighten follow-up timing, use more structured discovery questions, and pair them with a stronger closer for the next few customers.`;
  } else if (lowerQuestion.includes('week') || lowerQuestion.includes('comparison') || lowerQuestion.includes('trend')) {
    const visitors = contextSummary.kpis?.todayVisitors?.value ?? 'available';
    const sales = contextSummary.kpis?.todaySales?.value ?? 'available';
    answer = `The project data shows ${visitors} visitors and ${sales} sales in the current dashboard snapshot. Solution: keep the current conversion flow, but improve test-drive conversion and follow-up speed to lift results further.`;
  } else if (lowerQuestion.includes('customer') || lowerQuestion.includes('profile') || lowerQuestion.includes('what should i do') || lowerQuestion.includes('solution')) {
    if (activeCustomer) {
      const aiInsight = activeCustomer.aiAnalysis?.ownerInsight || 'The customer needs a clearer next step.';
      answer = `${activeCustomer.name} is currently interested in ${activeCustomer.vehicle} and has a ${activeCustomer.status} status. ${aiInsight} Solution: follow up with a specific next action, address finance/trade-in concerns if present, and move the customer toward test drive or booking.`;
    } else {
      answer = `The project data suggests the best move is to focus on active customers, top vehicle demand, and the biggest lost-sale reason. Solution: prioritize those three areas first, then use salesperson coaching to improve conversion.`;
    }
  } else {
    const vehicle = topDemand?.vehicle || contextSummary.vehicles[0]?.name || 'the top-demand vehicle';
    const salesperson = topSalesperson?.name || 'the best-performing salesperson';
    answer = `From the current dealership data, ${vehicle} is one of the strongest opportunities and ${salesperson} is among the strongest performers. Solution: use the high-demand model as the conversation anchor, route complex customers to the strongest salesperson, and keep pushing test drives because they are the fastest path to conversion.`;
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
