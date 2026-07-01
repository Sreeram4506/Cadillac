export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  preferredVehicle: string;
  purchaseIntent?: string;
  buyingPurpose?: string;
  colorPreference?: string;
  featurePriorities?: string[];
  vehicleReaction?: string;
  comfortReaction?: string;
  priceReaction?: string;
  followUpIntent?: string;
  salesReview?: string;
  inventoryPush?: string[];
  inventoryNotes?: string;
  stageFeedbacks?: StageFeedback[];
  appointments?: Appointment[];
  budget: number;
  financeRequired: boolean;
  tradeIn: boolean;
  timeline: string;
  notes: string;
  status: string;
  assignedSalesperson: Salesperson | null;
  aiAnalysis?: CustomerAIAnalysis;
  checkInDate: string;
  journey: JourneyEvent[];
  rating: number | null;
  lostReason: string | null;
}

export interface CustomerAIAnalysis {
  intentSummary: string;
  buyingReason: string;
  topPriorities: string[];
  likelyObjections: string[];
  customerSentiment?: string;
  buyingProbability: number;
  urgency: "low" | "medium" | "high";
  recommendedSalesperson: string;
  recommendedNextAction: string;
  ownerInsight: string;
  coachingTip: string;
}

export interface StageFeedback {
  stage: "Assigned to Salesperson" | "Vehicle Viewed" | "Test Drive" | "Finance Discussion" | "Quotation Given" | "Converted";
  customerFeedback: string;
  salespersonResponse: string;
  nextStep: string;
  notes?: string;
}

export interface Appointment {
  id: number;
  title: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
}

export interface Salesperson {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  aiScore: number;
  customersHandled?: number;
  conversionRate?: string;
  testDrives?: number;
  bookings?: number;
  performanceTrend?: number[];
  strengths?: string;
  weaknesses?: string;
  aiCoachingTip?: string;
  specialties?: string[];
}

export interface Vehicle {
  id: number;
  name: string;
  type: string;
  priceRange: [number, number];
}

export interface JourneyEvent {
  stage: string;
  timestamp: string;
  status: 'pending' | 'active' | 'done';
  note: string | null;
}

export interface DashboardKPI {
  todayVisitors: KPIData;
  todaySales: KPIData;
  conversionRate: KPIData;
  lostCustomers: KPIData;
  pendingFollowups: KPIData;
  avgRating: KPIData;
}

export interface KPIData {
  value: number;
  delta: number;
  trend: number[];
}

export interface DashboardData {
  kpis: DashboardKPI;
  aiInsights: AIInsight[];
  vehicleDemand: VehicleDemand[];
  activityFeed: ActivityFeedItem[];
  salesFunnel: FunnelStage[];
  topSalesperson: Salesperson;
}

export interface AIInsight {
  id: number;
  text: string;
  type: 'opportunity' | 'trend' | 'insight' | 'improvement' | 'performance' | 'risk';
}

export interface VehicleDemand {
  vehicle: string;
  count: number;
}

export interface ActivityFeedItem {
  id: number;
  type: string;
  customer: string;
  vehicle: string;
  salesperson: string;
  timestamp: string;
  description: string;
}

export interface FunnelStage {
  stage: string;
  value: number;
}

export interface LostSaleAnalysis {
  byReason: LostSaleReason[];
  trend: LostSaleTrend[];
  records: LostSaleRecord[];
}

export interface LostSaleReason {
  reason: string;
  count: number;
}

export interface LostSaleTrend {
  date: string;
  count: number;
}

export interface LostSaleRecord {
  id: number;
  customer: string;
  vehicle: string;
  reason: string;
  date: string;
  salesperson: string;
}

export interface Branch {
  name: string;
  sales: number;
  visitors: number;
}

export interface AIChatResponse {
  answer: string;
  source: 'openai' | 'fallback';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "manager" | "salesperson";
  roleLabel?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface OwnerAnalyticsCustomerRisk {
  id: number;
  name: string;
  vehicle: string;
  status: string;
  reason: string;
  salesperson: string;
  probability: number | null;
  nextAction: string;
  ownerInsight: string;
}

export interface OwnerAnalyticsResponse {
  metrics: {
    totalCustomers: number;
    activeCustomers: number;
    convertedCustomers: number;
    lostCustomers: number;
    stageFeedbackCompletion: number;
  };
  topPerformers: Salesperson[];
  bottomPerformers: Salesperson[];
  reasonBreakdown: LostSaleReason[];
  customerRiskList: OwnerAnalyticsCustomerRisk[];
  topReason: string;
  highestRiskCustomer: {
    id: number;
    name: string;
    vehicle: string;
    reason: string;
    salesperson: string;
    ownerInsight: string;
  } | null;
  aiBrief: {
    dashboardNote: string;
    performanceNote: string;
    lossNote: string;
    customerNote: string;
  };
  ownerSummary?: {
    dashboardNote: string;
    performanceNote: string;
    lossNote: string;
    customerNote: string;
    executiveSummary?: string;
  };
}
