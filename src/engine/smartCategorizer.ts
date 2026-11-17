// MONETRA V3 - Smart Category Detection Engine
// Identifies transaction categories intelligently from expenditure descriptions,
// merchant brands, keywords, and historical user habits.
import type { Category, Transaction, TransactionType } from '../types';

export interface SmartCategoryMatch {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0.0 to 1.0
  source: 'history' | 'brand' | 'keyword';
}

// Comprehensive Dictionary of Brands & Keywords mapped to Standard Category Names
export const EXPENDITURE_KEYWORD_RULES: Record<string, string[]> = {
  // Food & Dining
  Food: [
    'biriyani', 'biryani', 'briyani', 'biriyaani', 'dum biryani', 'hyderabadi biryani', 'chicken biriyani', 'mutton biriyani',
    'parotta', 'porotta', 'roti', 'naan', 'chapati', 'chappathi', 'paratha', 'kulcha', 'puri', 'poori', 'bhature', 'chole bhature',
    'dosa', 'dosai', 'masala dosa', 'ghee roast', 'idli', 'vada', 'vadai', 'sambar', 'rasam', 'pongal', 'upma', 'uttapam', 'meals', 'thali', 'curry', 'korma', 'kurma',
    'chicken', 'mutton', 'fish', 'prawns', 'egg', 'omelette', 'kebabs', 'kebab', 'kabab', 'tikka', 'tandoori', 'shawarma', 'grill chicken', 'alfaham',
    'pizza', 'burger', 'sandwich', 'noodles', 'chowmein', 'maggi', 'pasta', 'roll', 'kathi roll', 'frankie', 'momos', 'dimsum', 'samosa', 'kachori', 'panipuri', 'pani puri', 'chaat', 'bhel', 'pav bhaji', 'vada pav', 'vadapav', 'fries', 'nuggets',
    'tea', 'chai', 'coffee', 'boba', 'juice', 'shake', 'milkshake', 'lassi', 'smoothie', 'soda', 'beverage', 'dessert', 'ice cream', 'cake', 'pastry', 'falooda', 'kulfi', 'sweet', 'mithai', 'halwa', 'gulab jamun', 'rasgulla', 'jalebi', 'laddu', 'brownie', 'waffle',
    'swiggy', 'zomato', 'eats', 'box8', 'faasos', 'magicpin', 'eatclub', 'mcdonalds', 'mcd', 'kfc', 'burger king', 'dominos', 'pizza hut', 'subway', 'starbucks', 'cafe coffee day', 'ccd', 'third wave', 'blue tokai', 'chaayos', 'chai point', 'haldirams', 'barbeque nation', 'bbq', 'taco bell', 'bikanervala', 'baskin robbins', 'baskin', 'dunkin',
    'food', 'dinner', 'lunch', 'breakfast', 'brunch', 'snacks', 'tiffin', 'dining', 'restaurant', 'hotel', 'dhaba', 'mess', 'canteen', 'cafe', 'bhojanalaya', 'eatery'
  ],

  // Groceries & Daily Needs
  Groceries: [
    'blinkit', 'zepto', 'instamart', 'bigbasket', 'bbdaily', 'dunzo', 'fipola', 'licious',
    'dmart', 'd-mart', 'reliance fresh', 'reliance smart', 'more retail', 'spencer',
    'nature basket', 'star bazaar', 'hypermarket', 'supermarket', 'kirana', 'provision',
    'groceries', 'grocery', 'vegetables', 'veggies', 'fruits', 'milk', 'curd', 'paneer',
    'dairy', 'atta', 'rice', 'dal', 'oil', 'spices', 'meat', 'chicken', 'fish', 'eggs',
    'bread', 'butter', 'super market', 'ration', 'sabzi', 'mandi'
  ],

  // Transport & Commute
  Transport: [
    'uber', 'ola', 'rapido', 'auto', 'rickshaw', 'taxi', 'cab', 'driver',
    'metro', 'subway', 'bus', 'bmtc', 'dtc', 'best bus', 'train', 'irctc',
    'railway', 'local train', 'fastag', 'toll', 'parking', 'valet', 'commute',
    'chalo', 'redbus', 'abhibus', 'ride'
  ],

  // Fuel & Vehicle
  Fuel: [
    'petrol', 'diesel', 'fuel', 'cng', 'gas station', 'hp petrol', 'ioc',
    'indian oil', 'bharat petroleum', 'bpcl', 'hpcl', 'shell petrol', 'reliance petroleum',
    'nayara', 'ev charging', 'charge point', 'ather grid', 'fuel pump'
  ],

  // Rent & Housing
  Rent: [
    'rent', 'house rent', 'room rent', 'flat rent', 'pg rent', 'hostel fee',
    'landlord', 'brokerage', 'maintenance', 'society maintenance', 'lease',
    'nobroker', 'magicbricks', 'housing'
  ],

  // Shopping & Fashion
  Shopping: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tira', 'tata cliq',
    'zara', 'h&m', 'uniqlo', 'westside', 'pantaloons', 'max fashion', 'zudio',
    'decathlon', 'ikea', 'croma', 'reliance digital', 'apple store', 'vijay sales',
    'shopping', 'clothes', 'dress', 'shirt', 'shoes', 'sneakers', 'tshirt',
    'jeans', 'footwear', 'cosmetics', 'makeup', 'perfume', 'bag', 'watch',
    'jewellery', 'order', 'parcel', 'mall', 'bazaar'
  ],

  // Healthcare & Medicines
  Healthcare: [
    'apollo', '1mg', 'tata 1mg', 'pharmeasy', 'netmeds', 'medplus', 'wellness forever',
    'lal path', 'thyrocare', 'metropolis', 'dr lal', 'practo',
    'pharmacy', 'medicine', 'medicines', 'drugs', 'chemist', 'doctor', 'hospital',
    'clinic', 'consultation', 'dentist', 'dental', 'physiotherapy', 'therapy',
    'scan', 'xray', 'blood test', 'health checkup', 'optician', 'lenskart',
    'glasses', 'medical', 'tablets', 'syrup', 'injection'
  ],

  // Entertainment & Outings
  Entertainment: [
    'pvr', 'inox', 'cinepolis', 'bookmyshow', 'movie', 'cinema', 'concert',
    'show', 'amusement', 'gaming', 'bowling', 'pub', 'bar', 'club', 'party',
    'festival', 'event ticket', 'theatre', 'wonderla', 'museum'
  ],

  // Subscriptions & Digital
  Subscriptions: [
    'netflix', 'amazon prime', 'prime video', 'hotstar', 'disney', 'spotify',
    'youtube premium', 'apple music', 'audible', 'icloud', 'google one',
    'chatgpt', 'openai', 'gemini', 'github', 'playstation', 'xbox', 'subscription',
    'membership', 'patreon', 'substack', 'medium'
  ],

  // Mobile Recharge & Telecom
  'Mobile Recharge': [
    'jio recharge', 'airtel recharge', 'vi recharge', 'bsnl recharge', 'vodafone recharge',
    'mobile recharge', 'phone recharge', 'cell recharge', 'data recharge', 'data pack',
    'jio prepaid', 'airtel prepaid', 'vi prepaid', 'jio postpaid', 'airtel postpaid', 'vi postpaid',
    'jio', 'airtel', 'vi', 'vodafone', 'idea', 'bsnl', 'mtnl',
    'recharge', 'prepaid', 'postpaid', 'talktime', 'phone bill', 'mobile bill',
    'sim card', 'sim', 'topup', 'top up', 'validity pack', 'unlimited pack'
  ],

  // Internet & Broadband
  Internet: [
    'wifi', 'wi-fi', 'broadband', 'fiber', 'fibernet', 'airtel xstream',
    'jio fiber', 'act fibernet', 'hathway', 'excitel', 'router', 'internet bill'
  ],

  // Electricity & Power
  Electricity: [
    'electricity', 'electric bill', 'power bill', 'current bill', 'bescom',
    'tneb', 'mseb', 'cesc', 'adani electricity', 'tata power', 'bses', 'bijli'
  ],

  // Water & Utilities
  Water: [
    'water bill', 'water tanker', 'bisleri', 'aquaguard', 'can water', 'bwssb',
    'water delivery', 'water purifier'
  ],

  // Travel & Vacations
  Travel: [
    'flight', 'indigo', 'air india', 'vistara', 'spicejet', 'makemytrip',
    'mmt', 'goibibo', 'cleartrip', 'easemytrip', 'booking.com', 'agoda',
    'airbnb', 'hotel stay', 'resort', 'vacation', 'trip', 'tour', 'visa',
    'passport', 'luggage', 'holiday'
  ],

  // Personal Care & Grooming
  'Personal Care': [
    'gym', 'cult.fit', 'cult', 'fitness', 'salon', 'spa', 'haircut',
    'urban company', 'uc service', 'massage', 'barber', 'grooming',
    'skincare', 'dermatologist', 'beauty parlour'
  ],

  // Education & Learning
  Education: [
    'school fee', 'college fee', 'tuition', 'coaching', 'course', 'udemy',
    'coursera', 'unacademy', 'byjus', 'books', 'stationery', 'exam fee',
    'test series', 'classes', 'textbook'
  ],

  // Family & Dependents
  Family: [
    'mom', 'dad', 'parents', 'brother', 'sister', 'wife', 'husband', 'kid',
    'baby', 'diapers', 'toys', 'pocket money', 'family support', 'child'
  ],

  // Friends & Social Outings
  Friend: [
    'friend', 'friends', 'buddy', 'buddies', 'bestie', 'besties', 'dost', 'dosti', 'yaar',
    'friend outing', 'outing with friends', 'gift to friend', 'friend gift', 'friend treat',
    'treat to friend', 'party with friends', 'hangout with friends', 'with friends',
    'dinner with friends', 'lunch with friends', 'drinks with friends', 'trip with friends',
    'friends trip', 'college friend', 'school friend', 'office friend', 'roommate', 'flatmate'
  ],

  // Lending Money & Loans Given to Others
  'Lending Money': [
    'lending money', 'lending', 'lent', 'money lent', 'loan given', 'lent to',
    'giving money', 'borrowed by', 'debt given', 'gave loan', 'loan to friend',
    'money given to', 'advance given', 'udhar', 'kadan', 'hand loan',
    'lend', 'lent cash', 'lent amount', 'given to friend', 'loaned to',
    'loan to rahul', 'lent money', 'credit given', 'borrowed from me',
    'loaned'
  ],

  // EMI & Financial Obligations
  EMI: [
    'emi', 'loan', 'home loan', 'car loan', 'personal loan', 'credit card bill',
    'hdfc cred', 'cred', 'paylater', 'simpl', 'lazypay', 'bajaj finance',
    'interest payment', 'installment'
  ],

  // Income: Salary
  Salary: [
    'salary', 'payroll', 'paycheck', 'stipend', 'wages', 'monthly salary',
    'ctc', 'company credit', 'earnings'
  ],

  // Income: Bonus
  Bonus: [
    'bonus', 'diwali bonus', 'performance bonus', 'incentive', 'appraisal'
  ],

  // Income: Freelance
  Freelance: [
    'freelance', 'client payment', 'upwork', 'fiverr', 'consulting',
    'project payment', 'contract payment', 'gig work'
  ],

  // Income: Business
  Business: [
    'business', 'sales', 'invoice', 'customer payment', 'revenue',
    'shop income', 'client deposit'
  ],

  // Income: Interest
  Interest: [
    'interest', 'fd interest', 'savings interest', 'dividend', 'returns',
    'mutual fund returns', 'fixed deposit'
  ],

  // Income: Refund
  Refund: [
    'refund', 'cashback', 'reversal', 'return refund', 'tax refund',
    'it refund', 'discount'
  ],

  // Income: Gift
  Gift: [
    'gift', 'shagun', 'birthday gift', 'festive gift', 'gift received'
  ],
};

export class SmartCategorizer {
  /**
   * Identifies the most appropriate category for a given description.
   * Priority:
   * 1. Historical habit matching (past transactions with same/similar description)
   * 2. Direct keyword / brand matching in dictionary
   * 3. Substring / token matching
   */
  static identifyCategory(
    description: string,
    type: TransactionType,
    categories: Category[],
    pastTransactions: Transaction[] = []
  ): SmartCategoryMatch | null {
    const query = description.trim().toLowerCase();
    if (!query) return null;

    // Filter candidate categories by type
    const candidateCategories = categories.filter((c) => {
      if (type === 'income') return c.type === 'income';
      return c.type === 'expense';
    });

    if (candidateCategories.length === 0) return null;

    // 1. Check Historical Habit Memory
    if (pastTransactions.length > 0) {
      const historicalMatch = this.matchFromHistory(query, type, candidateCategories, pastTransactions);
      if (historicalMatch) {
        return historicalMatch;
      }
    }

    // 2. Check Dictionary Keyword / Brand Rules
    // Clean tokens and words
    const words = query.split(/[\s,.-_]+/).filter(Boolean);

    // Flatten all category keywords and sort by length descending (longest phrase first)
    const ruleEntries: Array<{ categoryName: string; keyword: string }> = [];
    for (const [categoryName, keywords] of Object.entries(EXPENDITURE_KEYWORD_RULES)) {
      for (const kw of keywords) {
        ruleEntries.push({ categoryName, keyword: kw.toLowerCase() });
      }
    }
    // Sort longer/multi-word phrases first so "jio fiber" matches before "jio"
    ruleEntries.sort((a, b) => b.keyword.length - a.keyword.length);

    for (const { categoryName, keyword } of ruleEntries) {
      const matchedCategory = candidateCategories.find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );
      if (!matchedCategory) continue;

      const isShortWord = keyword.length <= 3;
      // Short words (e.g. 'vi', 'jio', 'cng', 'emi') must match as full tokens to avoid false substring matches like 'movie'
      const isMatched = isShortWord
        ? query === keyword || words.includes(keyword)
        : query === keyword || words.includes(keyword) || query.includes(keyword);

      if (isMatched) {
        return {
          categoryId: matchedCategory.id,
          categoryName: matchedCategory.name,
          confidence: query === keyword ? 0.98 : 0.88,
          source: keyword.length > 3 ? 'brand' : 'keyword',
        };
      }
    }

    // 3. Fallback: Direct Category Name Match
    const directNameMatch = candidateCategories.find((c) => {
      const catLower = c.name.toLowerCase();
      return query.includes(catLower) || catLower.includes(query);
    });

    if (directNameMatch) {
      return {
        categoryId: directNameMatch.id,
        categoryName: directNameMatch.name,
        confidence: 0.75,
        source: 'keyword',
      };
    }

    return null;
  }

  /**
   * Matches against historical transactions using frequency and similarity.
   */
  private static matchFromHistory(
    query: string,
    type: TransactionType,
    candidateCategories: Category[],
    pastTransactions: Transaction[]
  ): SmartCategoryMatch | null {
    const validPastTxns = pastTransactions.filter(
      (t) => !t.is_deleted && t.type === (type === 'transfer' ? 'expense' : type) && t.description
    );

    // Count occurrences of categoryId for descriptions containing the query words
    const categoryVoteCounts: Record<string, number> = {};

    for (const t of validPastTxns) {
      const pastDesc = t.description.toLowerCase().trim();
      if (!pastDesc) continue;

      if (pastDesc === query || pastDesc.includes(query) || query.includes(pastDesc)) {
        categoryVoteCounts[t.category_id] = (categoryVoteCounts[t.category_id] || 0) + 1;
      }
    }

    // Find highest voted category
    let topCategoryId: string | null = null;
    let maxVotes = 0;

    for (const [catId, votes] of Object.entries(categoryVoteCounts)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        topCategoryId = catId;
      }
    }

    if (topCategoryId) {
      const matchedCat = candidateCategories.find((c) => c.id === topCategoryId);
      if (matchedCat) {
        return {
          categoryId: matchedCat.id,
          categoryName: matchedCat.name,
          confidence: Math.min(0.99, 0.85 + maxVotes * 0.03),
          source: 'history',
        };
      }
    }

    return null;
  }
}
