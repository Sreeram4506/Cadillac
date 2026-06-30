const fs = require('fs');
const path = require('path');

// Indian names and phone formats
const firstNames = ['Arjun', 'Rahul', 'Priya', 'Anita', 'Vikram', 'Suresh', 'Deepa', 'Meera', 'Rajesh', 'Kavita', 'Amit', 'Neha', 'Vijay', 'Pooja', 'Sanjay', 'Sunita', 'Alok', 'Rekha', 'Manish', 'Sneha', 'Ravi', 'Lata', 'Sunil', 'Savita', 'Dinesh', 'Geeta', 'Mukesh', 'Kiran', 'Harish', 'Anjali', 'Pradeep', 'Shweta', 'Ashok', 'Madhuri', 'Ramesh', 'Sarita', 'Kumar', 'Shilpa', 'Vinod', 'Kumari'];
const lastNames = ['Sharma', 'Patel', 'Singh', 'Kumar', 'Verma', 'Gupta', 'Malhotra', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Pillai', 'Rao', 'Chopra', 'Kapoor', 'Saxena', 'Bhatia', 'Chauhan', 'Yadav', 'Joshi', 'Desai', 'Mehta', 'Shah', 'Parekh', 'Trivedi', 'Pandey', 'Tiwari', 'Dubey', 'Mishra', 'Srivastava'];

// Vehicle models (Indian market)
const vehicleModels = [
  { id: 1, name: 'Mahindra XUV700', type: 'SUV', priceRange: [1300000, 2400000] },
  { id: 2, name: 'Hyundai Creta', type: 'SUV', priceRange: [1100000, 2000000] },
  { id: 3, name: 'Tata Nexon', type: 'SUV', priceRange: [800000, 1500000] },
  { id: 4, name: 'Maruti Suzuki Brezza', type: 'SUV', priceRange: [1000000, 1400000] },
  { id: 5, name: 'Kia Seltos', type: 'SUV', priceRange: [1100000, 2000000] },
  { id: 6, name: 'Honda City', type: 'Sedan', priceRange: [1200000, 1700000] },
  { id: 7, name: 'Maruti Suzuki Swift', type: 'Hatchback', priceRange: [650000, 1000000] },
  { id: 8, name: 'Hyundai i20', type: 'Hatchback', priceRange: [750000, 1300000] },
  { id: 9, name: 'Tata Punch', type: 'SUV', priceRange: [600000, 900000] },
  { id: 10, name: 'Toyota Innova Crysta', type: 'MPV', priceRange: [2000000, 2600000] }
];

// Salespeople
const salespeople = [
  { id: 1, name: 'Rajesh Kumar', avatar: 'RK', rating: 4.5, aiScore: 85, specialties: ['finance', 'business', 'negotiation'] },
  { id: 2, name: 'Priya Sharma', avatar: 'PS', rating: 4.8, aiScore: 92, specialties: ['premium', 'family', 'comfort'] },
  { id: 3, name: 'Vikram Singh', avatar: 'VS', rating: 4.2, aiScore: 78, specialties: ['budget', 'first-time', 'value'] },
  { id: 4, name: 'Anita Patel', avatar: 'AP', rating: 4.6, aiScore: 88, specialties: ['trade-in', 'finance', 'follow-up'] },
  { id: 5, name: 'Suresh Reddy', avatar: 'SR', rating: 4.3, aiScore: 82, specialties: ['suv', 'mpv', 'delivery'] }
];

// Lost sale reasons
const lostSaleReasons = ['Price', 'Stock', 'Finance', 'Competitor', 'Color Availability', 'Salesperson Communication', 'Waiting Time'];

// Journey stages
const journeyStages = ['Checked In', 'Assigned to Salesperson', 'Vehicle Viewed', 'Test Drive', 'Finance Discussion', 'Quotation Given', 'Converted', 'Lost'];

// Helper functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBool = () => Math.random() > 0.5;
const formatCurrency = (amount) => `₹${amount.toLocaleString('en-IN')}`;
const generatePhone = () => `+91 ${randomInt(700, 999)}${randomInt(100, 999)}${randomInt(10000, 99999)}`;
const reactionOptions = ['Very positive', 'Positive', 'Neutral', 'Concerned', 'Negative'];
const comfortOptions = ['Loved the comfort', 'Comfortable enough', 'Wanted more space', 'Wanted a softer ride', 'Not a fit'];
const priceOptions = ['Comfortable with price', 'Needs EMI support', 'Comparing other options', 'Feels expensive', 'Waiting for a better offer'];
const followUpOptions = ['Wants follow-up', 'Will revisit later', 'Needs family discussion', 'Ready for test drive', 'Not interested right now'];
const stageFeedbackStages = ['Assigned to Salesperson', 'Vehicle Viewed', 'Test Drive', 'Finance Discussion', 'Quotation Given', 'Converted'];
const customerFeedbackOptions = ['Loved it', 'Liked it', 'Neutral', 'Concerned', 'Rejected', 'Needs more time'];
const salespersonResponseOptions = ['Showed variants', 'Explained EMI', 'Shared comparison', 'Offered test drive', 'Escalated to manager', 'Scheduled follow-up'];
const inventoryNotesOptions = [
  'Push the most popular trim with the best value proposition.',
  'Highlight the variant that matches the customer budget and color preference.',
  'Offer a vehicle with stronger boot space and comfort features.',
  'Recommend the unit with faster delivery availability.',
  'Focus on the model that best supports the customer financing plan.',
];

// Generate random date within last 30 days
const randomDate = (daysBack = 30) => {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(0, daysBack));
  return date.toISOString();
};

// Generate customers
const generateCustomers = (count) => {
  const customers = [];
  for (let i = 1; i <= count; i++) {
    const vehicle = randomItem(vehicleModels);
    const budget = randomInt(vehicle.priceRange[0] * 0.8, vehicle.priceRange[1] * 1.2);
    const isConverted = randomBool();
    const stageIndex = isConverted ? 6 : randomInt(0, 5);
    
    const customer = {
      id: i,
      name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
      phone: generatePhone(),
      email: `customer${i}@example.com`,
      preferredVehicle: vehicle.name,
      purchaseIntent: randomItem([
        'Looking for a family-friendly SUV with strong mileage',
        'Needs a comfortable daily commuter with easy finance',
        'Wants a premium upgrade with modern features',
        'Comparing options for a first-time purchase',
        'Needs a practical car with good boot space',
        'Looking for a vehicle for business use',
      ]),
      buyingPurpose: randomItem([
        'Family use',
        'Daily commute',
        'Upgrade',
        'First car',
        'Business use',
        'Gift',
      ]),
      colorPreference: randomItem(['White', 'Black', 'Silver', 'Red', 'Blue', 'Grey']),
      featurePriorities: randomItem([
        ['Mileage', 'Safety'],
        ['Boot Space', 'Comfort'],
        ['Technology', 'Safety'],
        ['Low Maintenance', 'Mileage'],
        ['Comfort', 'Boot Space'],
      ]),
      vehicleReaction: randomItem(reactionOptions),
      comfortReaction: randomItem(comfortOptions),
      priceReaction: randomItem(priceOptions),
      followUpIntent: randomItem(followUpOptions),
      salesReview: randomItem([
        'Liked the styling and asked for a test drive.',
        'Compared price with a competitor and wants a clearer EMI split.',
        'Was impressed with comfort and boot space.',
        'Needs family input before deciding.',
        'Liked the vehicle but wants a better colour choice.',
      ]),
      inventoryPush: Array.from(
        new Set([
          vehicle.name,
          randomItem(vehicleModels).name,
          randomItem(vehicleModels).name,
        ])
      ).slice(0, randomInt(1, 3)),
      inventoryNotes: randomItem(inventoryNotesOptions),
      stageFeedbacks: stageFeedbackStages.map((stage) => ({
        stage,
        customerFeedback: randomItem(customerFeedbackOptions),
        salespersonResponse: randomItem(salespersonResponseOptions),
        nextStep: randomItem([
          'Schedule follow-up',
          'Share variant comparison',
          'Prepare EMI options',
          'Set appointment',
        ]),
        notes: randomItem([
          'Customer wanted a quick summary.',
          'Customer asked for clearer pricing.',
          'Customer needs more family discussion.',
          'Customer responded well to options.',
        ]),
      })),
      appointments: [
        {
          id: 1,
          title: randomItem(['Test drive', 'Finance review', 'Family visit', 'Follow-up call']),
          date: randomDate(10),
          time: `${randomInt(9, 17)}:${randomItem(['00', '30'])}`,
          status: randomItem(['scheduled', 'completed']),
          notes: randomItem([
            'Confirmed by customer.',
            'Awaiting family approval.',
            'Visit moved to weekend.',
            'Finance team to prepare documents.',
          ]),
        },
      ],
      budget: budget,
      financeRequired: randomBool(),
      tradeIn: randomBool(),
      timeline: randomItem(['Immediate', 'Within 1 week', 'Within 1 month', 'Just browsing']),
      notes: randomItem([
        'Looking for family car',
        'First-time buyer',
        'Upgrading from hatchback',
        'Corporate purchase',
        'Gift for family member',
        'Comparing multiple options'
      ]),
      status: isConverted ? 'Converted' : (stageIndex === 5 ? 'Quotation Given' : journeyStages[stageIndex]),
      assignedSalesperson: randomItem(salespeople),
      checkInDate: randomDate(30),
      journey: generateJourney(stageIndex, isConverted),
      rating: isConverted ? randomInt(4, 5) : null,
      lostReason: !isConverted && stageIndex >= 3 ? randomItem(lostSaleReasons) : null
    };
    customer.aiAnalysis = generateCustomerAIAnalysis(customer);
    customers.push(customer);
  }
  return customers;
};

// Generate journey timeline
const generateJourney = (maxStage, isConverted) => {
  const journey = [];
  const baseDate = new Date();
  
  for (let i = 0; i <= maxStage; i++) {
    const stageDate = new Date(baseDate);
    stageDate.setDate(stageDate.getDate() - (maxStage - i) * randomInt(1, 3));
    
    journey.push({
      stage: journeyStages[i],
      timestamp: stageDate.toISOString(),
      status: i === maxStage ? 'active' : 'done',
      note: i > 0 ? randomItem([
        'Customer showed interest',
        'Discussed features',
        'Negotiation in progress',
        'Follow-up scheduled',
        'Documentation started'
      ]) : null
    });
  }
  
  return journey;
};

const generateCustomerAIAnalysis = (customer) => {
  const priorities = customer.featurePriorities?.length ? customer.featurePriorities : ['Value'];
  const objections = [];
  const reactionText = [
    customer.vehicleReaction,
    customer.comfortReaction,
    customer.priceReaction,
    customer.followUpIntent,
    customer.salesReview,
    ...(customer.stageFeedbacks || []).flatMap((item) => [item.customerFeedback, item.salespersonResponse, item.nextStep, item.notes]),
  ].filter(Boolean).join(' ').toLowerCase();

  if (customer.financeRequired) objections.push('EMI and approval speed');
  if (customer.tradeIn) objections.push('Trade-in valuation');
  if (reactionText.includes('expensive')) objections.push('Price sensitivity');
  if (reactionText.includes('later') || reactionText.includes('discussion')) objections.push('Decision timing');
  if (customer.timeline === 'Within 1 month' || customer.timeline === 'Just browsing') objections.push('Decision timing');

  const positiveReaction = ['very positive', 'positive', 'loved', 'comfortable with price', 'ready for test drive'].some((phrase) => reactionText.includes(phrase));
  const negativeReaction = ['negative', 'concerned', 'not a fit', 'feels expensive', 'needs emi support'].some((phrase) => reactionText.includes(phrase));
  const customerSentiment = negativeReaction ? 'cautious' : positiveReaction ? 'positive' : 'neutral';
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

  return {
    intentSummary: `${customer.name} is looking for a ${customer.buyingPurpose || 'vehicle'} and cares most about ${priorities.join(', ')}.`,
    buyingReason: customer.buyingPurpose || 'Not specified',
    topPriorities: priorities,
    likelyObjections: objections,
    customerSentiment,
    buyingProbability: customer.status === 'Converted' ? 88 : customer.status === 'Lost' ? 14 : buyingProbability,
    urgency: customer.timeline === 'Immediate' ? 'high' : customer.timeline === 'Within 1 week' ? 'high' : customer.timeline === 'Within 1 month' ? 'medium' : 'low',
    recommendedSalesperson: randomItem(salespeople).name,
    recommendedNextAction: customer.followUpIntent?.includes('test drive')
      ? 'Schedule the test drive and prepare a side-by-side comparison.'
      : customer.financeRequired
        ? 'Share EMI options and book a follow-up.'
        : 'Arrange a test drive and a quick comparison walkthrough.',
    ownerInsight: objections.length ? `Main concern appears to be ${objections[0]}. Customer sentiment is ${customerSentiment}.` : `Intent appears clear with ${customerSentiment} sentiment.`,
    coachingTip: customer.financeRequired
      ? 'Lead with finance clarity and keep the conversation structured.'
      : positiveReaction
        ? 'Use the positive reaction to move toward booking and confirmation.'
        : 'Anchor the discussion on the customer priorities and vehicle fit.',
  };
};

// Generate dashboard KPIs
const generateDashboardKPIs = (customers) => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayCustomers = customers.filter(c => new Date(c.checkInDate).toDateString() === today.toDateString());
  const yesterdayCustomers = customers.filter(c => new Date(c.checkInDate).toDateString() === yesterday.toDateString());
  
  const todaySales = customers.filter(c => c.status === 'Converted' && new Date(c.checkInDate).toDateString() === today.toDateString());
  const yesterdaySales = customers.filter(c => c.status === 'Converted' && new Date(c.checkInDate).toDateString() === yesterday.toDateString());
  
  const converted = customers.filter(c => c.status === 'Converted');
  const conversionRate = ((converted.length / customers.length) * 100).toFixed(1);
  
  const lost = customers.filter(c => c.status === 'Lost' || c.lostReason);
  const pending = customers.filter(c => !['Converted', 'Lost'].includes(c.status));
  
  const ratings = customers.filter(c => c.rating).map(c => c.rating);
  const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;
  
  return {
    todayVisitors: {
      value: todayCustomers.length,
      delta: todayCustomers.length - yesterdayCustomers.length,
      trend: Array.from({length: 7}, () => randomInt(5, 20))
    },
    todaySales: {
      value: todaySales.length,
      delta: todaySales.length - yesterdaySales.length,
      trend: Array.from({length: 7}, () => randomInt(1, 8))
    },
    conversionRate: {
      value: parseFloat(conversionRate),
      delta: randomInt(-5, 5),
      trend: Array.from({length: 7}, () => randomInt(20, 45))
    },
    lostCustomers: {
      value: lost.length,
      delta: randomInt(-3, 3),
      trend: Array.from({length: 7}, () => randomInt(2, 10))
    },
    pendingFollowups: {
      value: pending.length,
      delta: randomInt(-2, 4),
      trend: Array.from({length: 7}, () => randomInt(5, 15))
    },
    avgRating: {
      value: parseFloat(avgRating),
      delta: randomInt(-1, 1) / 10,
      trend: Array.from({length: 7}, () => randomInt(35, 50) / 10)
    }
  };
};

// Generate AI insights
const generateAIInsights = () => [
  { id: 1, text: "Customers requesting finance convert 42% more than cash buyers", type: "opportunity" },
  { id: 2, text: "Mahindra XUV700 has highest test drive conversion at 38%", type: "trend" },
  { id: 3, text: "Weekend visitors are 2.3x more likely to purchase within 7 days", type: "insight" },
  { id: 4, text: "Price objections dropped 15% after introducing EMI calculator", type: "improvement" },
  { id: 5, text: "Priya Sharma's customers show 23% higher satisfaction scores", type: "performance" },
  { id: 6, text: "Customers who test drive convert 3x more than those who don't", type: "opportunity" },
  { id: 7, text: "Finance approval delays causing 12% of lost sales this month", type: "risk" },
  { id: 8, text: "Hyundai Creta demand peaks on Tuesdays - consider scheduling more demos", type: "trend" }
];

// Generate lost sale analysis data
const generateLostSaleAnalysis = (customers) => {
  const lostCustomers = customers.filter(c => c.lostReason);
  const reasonCounts = {};
  lostCustomers.forEach(c => {
    reasonCounts[c.lostReason] = (reasonCounts[c.lostReason] || 0) + 1;
  });
  
  return {
    byReason: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count })),
    trend: Array.from({length: 30}, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: randomInt(0, 5)
    })),
    records: lostCustomers.map(c => ({
      id: c.id,
      customer: c.name,
      vehicle: c.preferredVehicle,
      reason: c.lostReason,
      date: c.checkInDate,
      salesperson: c.assignedSalesperson.name
    }))
  };
};

// Generate salesperson performance data
const generateSalespersonPerformance = (customers) => {
  return salespeople.map(sp => {
    const spCustomers = customers.filter(c => c.assignedSalesperson.id === sp.id);
    const converted = spCustomers.filter(c => c.status === 'Converted');
    const testDrives = spCustomers.filter(c => c.journey.some(j => j.stage === 'Test Drive'));
    
    return {
      ...sp,
      customersHandled: spCustomers.length,
      conversionRate: spCustomers.length > 0 ? ((converted.length / spCustomers.length) * 100).toFixed(1) : 0,
      testDrives: testDrives.length,
      bookings: converted.length,
      performanceTrend: Array.from({length: 7}, () => randomInt(0, 5)),
      strengths: randomItem([
        'Excellent product knowledge',
        'Strong closing skills',
        'Great customer rapport',
        'Effective follow-up'
      ]),
      weaknesses: randomItem([
        'Could improve finance knowledge',
        'Needs more test drive conversions',
        'Follow-up timing could be better',
        'Documentation speed'
      ]),
      aiCoachingTip: randomItem([
        'Focus on highlighting finance options early',
        'Schedule more test drives on weekends',
        'Use customer testimonials to build trust',
        'Follow up within 24 hours of first visit'
      ])
    };
  });
};

// Generate vehicle demand data
const generateVehicleDemand = (customers) => {
  const demand = {};
  customers.forEach(c => {
    demand[c.preferredVehicle] = (demand[c.preferredVehicle] || 0) + 1;
  });
  
  return Object.entries(demand)
    .map(([vehicle, count]) => ({ vehicle, count }))
    .sort((a, b) => b.count - a.count);
};

// Generate activity feed
const generateActivityFeed = (customers) => {
  const activities = [];
  customers.slice(0, 15).forEach(c => {
    activities.push({
      id: activities.length + 1,
      type: randomItem(['check-in', 'conversion', 'test-drive', 'follow-up']),
      customer: c.name,
      vehicle: c.preferredVehicle,
      salesperson: c.assignedSalesperson.name,
      timestamp: randomDate(7),
      description: randomItem([
        'New customer checked in',
        'Vehicle test drive completed',
        'Quotation provided',
        'Follow-up call scheduled',
        'Sale converted successfully'
      ])
    });
  });
  return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

// Main data generation
const generateAllData = () => {
  const customers = generateCustomers(40);
  
  const data = {
    customers,
    salespeople,
    vehicles: vehicleModels,
    dashboard: {
      kpis: generateDashboardKPIs(customers),
      aiInsights: generateAIInsights(),
      vehicleDemand: generateVehicleDemand(customers),
      activityFeed: generateActivityFeed(customers),
      salesFunnel: [
        { stage: 'Visitors', value: customers.length },
        { stage: 'Test Drives', value: customers.filter(c => c.journey.some(j => j.stage === 'Test Drive')).length },
        { stage: 'Quotations', value: customers.filter(c => c.journey.some(j => j.stage === 'Quotation Given')).length },
        { stage: 'Conversions', value: customers.filter(c => c.status === 'Converted').length }
      ],
      topSalesperson: salespeople.reduce((best, sp) => {
        const spConverted = customers.filter(c => c.assignedSalesperson.id === sp.id && c.status === 'Converted').length;
        const bestConverted = customers.filter(c => c.assignedSalesperson.id === best.id && c.status === 'Converted').length;
        return spConverted > bestConverted ? sp : best;
      }, salespeople[0])
    },
    lostSaleAnalysis: generateLostSaleAnalysis(customers),
    salespersonPerformance: generateSalespersonPerformance(customers),
    branches: [
      { name: 'Main Branch', sales: 25, visitors: 120 },
      { name: 'North Branch', sales: 18, visitors: 85 },
      { name: 'South Branch', sales: 22, visitors: 95 }
    ]
  };
  
  return data;
};

// Write data to file
const data = generateAllData();
const dataPath = path.join(__dirname, 'data.json');
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log('Mock data generated successfully!');
console.log(`Data written to: ${dataPath}`);
console.log(`Generated ${data.customers.length} customers, ${data.salespeople.length} salespeople, ${data.vehicles.length} vehicles`);
