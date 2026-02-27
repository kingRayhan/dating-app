# Backend API and Database Design Plan

**Version:** 1.0  
**Date:** February 27, 2026  
**Project:** Dating App - OTP Authentication System

---

## 1. Executive Summary

This document outlines the complete backend API design and database entity structure for the dating application with OTP-only phone number authentication. The system follows a microservices architecture with clean separation of concerns and scalable design patterns.

---

## 2. System Architecture Overview

### 2.1 Hybrid Architecture Structure

```
Frontend Clients
    ↓ (Queries - Direct Convex)
    Convex Data Layer (Pure Data Operations)
    ↑ (Mutations - Via API)
Your API Services (Business Logic Layer)
    ↓ (External Integrations)
Third-party Services (Twilio, Stripe, etc.)
```

### 2.2 Component Responsibilities

**Convex Data Layer:**
- Pure data storage and retrieval
- Real-time subscriptions and synchronization
- ACID-compliant transactions
- Automatic scaling and infrastructure management
- Schema management and indexing

**API Services Layer:**
- Business logic and validation
- Authentication and authorization
- External service integrations
- Complex workflows and orchestration
- Rate limiting and security policies

### 2.4 Technology Stack

**API Services Layer:**
- **Runtime:** Node.js 18+ with Express/NestJS framework
- **Authentication:** Custom OTP service with Twilio
- **External Services:** Twilio (SMS), Stripe (Payments), Cloud Storage
- **API Documentation:** Swagger/OpenAPI 3.0
- **Deployment:** Docker containers with Kubernetes orchestration

**Convex Data Layer:**
- **Platform:** Convex (headless database)
- **Language:** TypeScript (schema, queries, mutations)
- **Real-time:** Built-in WebSocket management
- **Scaling:** Automatic serverless scaling
- **Deployment:** Managed Convex cloud hosting

**Read Operations (Queries):**
```
Frontend → Convex Client → Direct Data Access
(Low latency, real-time updates, no business logic)
```

**Write Operations (Mutations):**
```
Frontend → Your API Service → Business Logic → Convex Mutation
(Full validation, security checks, complex workflows)
```

---

## 3. Convex Schema Design

### 3.1 Core Data Tables (Convex Schema)

#### Users Table
```typescript
// schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    phone_number: v.string(),
    otp_hash: v.optional(v.string()),
    otp_expires_at: v.optional(v.number()),
    is_verified: v.boolean(),
    last_login: v.optional(v.number()),
    created_at: v.number(),
    updated_at: v.number()
  }).index("by_phone", ["phone_number"]),
  
  user_profiles: defineTable({
    user_id: v.id("users"),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    birth_date: v.optional(v.number()),
    gender: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number()
    })),
    location_name: v.optional(v.string()),
    max_distance: v.number(),
    age_min: v.number(),
    age_max: v.number(),
    show_me: v.string(),
    created_at: v.number(),
    updated_at: v.number()
  }).index("by_user", ["user_id"]),
  
  profile_photos: defineTable({
    user_id: v.id("users"),
    photo_url: v.string(),
    is_primary: v.boolean(),
    order_index: v.number(),
    created_at: v.number()
  }).index("by_user", ["user_id"]),
  
  user_interests: defineTable({
    user_id: v.id("users"),
    interest_name: v.string(),
    category: v.optional(v.string()),
    created_at: v.number()
  }).index("by_user", ["user_id"]),
  
  matches: defineTable({
    user1_id: v.id("users"),
    user2_id: v.id("users"),
    matched_at: v.number(),
    is_active: v.boolean(),
    created_at: v.number()
  }).index("by_user1", ["user1_id"])
    .index("by_user2", ["user2_id"]),
  
  messages: defineTable({
    match_id: v.id("matches"),
    sender_id: v.id("users"),
    content: v.string(),
    message_type: v.string(),
    is_read: v.boolean(),
    sent_at: v.number()
  }).index("by_match", ["match_id"])
    .index("by_sender", ["sender_id"]),
  
  swipes: defineTable({
    swiper_id: v.id("users"),
    swiped_id: v.id("users"),
    action: v.union(v.literal("like"), v.literal("pass")),
    created_at: v.number()
  }).index("by_swiper", ["swiper_id"])
    .index("by_swiped", ["swiped_id"])
    .index("by_pair", ["swiper_id", "swiped_id"]),
  
  subscriptions: defineTable({
    user_id: v.id("users"),
    plan_type: v.string(),
    status: v.string(),
    started_at: v.number(),
    expires_at: v.optional(v.number()),
    created_at: v.number()
  }).index("by_user", ["user_id"]),
  
  reports: defineTable({
    reporter_id: v.id("users"),
    reported_user_id: v.id("users"),
    reason: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    created_at: v.number()
  }).index("by_reporter", ["reporter_id"])
    .index("by_reported", ["reported_user_id"])
});
```

### 3.2 Pure Query Functions (Direct Client Access)

#### User Profile Queries
```typescript
// queries/profile.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getCurrentUserProfile = query({
  args: {},
  handler: async ({ db }, _args) => {
    // Direct data access - no business logic
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const user = await db
      .query("users")
      .filter(q => q.eq(q.field("phone_number"), identity.phone))
      .unique();
      
    if (!user) return null;
    
    const profile = await db
      .query("user_profiles")
      .filter(q => q.eq(q.field("user_id"), user._id))
      .unique();
      
    return profile;
  }
});

export const getDiscoveryFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async ({ db }, { limit = 20 }) => {
    // Pure data query for discovery feed
    const identity = await ctx.auth.getUserIdentity();
    // Return potential matches based on location/preferences
    // No complex business logic here
  }
});

export const getUserMatches = query({
  args: {},
  handler: async ({ db }) => {
    // Direct match data retrieval
    const identity = await ctx.auth.getUserIdentity();
    // Return user's matches with minimal processing
  }
});
```

### 3.3 Mutation Functions (Called via API Services)

#### Authentication Mutations
```typescript
// mutations/auth.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    phone_number: v.string()
  },
  handler: async ({ db }, { phone_number }) => {
    // Pure data creation - called from your API service
    const existingUser = await db
      .query("users")
      .filter(q => q.eq(q.field("phone_number"), phone_number))
      .unique();
      
    if (existingUser) {
      return { user_id: existingUser._id };
    }
    
    const userId = await db.insert("users", {
      phone_number,
      is_verified: false,
      created_at: Date.now(),
      updated_at: Date.now()
    });
    
    return { user_id: userId };
  }
});

export const setOTP = mutation({
  args: {
    user_id: v.id("users"),
    otp_hash: v.string(),
    expires_at: v.number()
  },
  handler: async ({ db }, { user_id, otp_hash, expires_at }) => {
    // Pure data update - business logic handled in API service
    await db.patch(user_id, {
      otp_hash,
      otp_expires_at: expires_at,
      updated_at: Date.now()
    });
  }
});
```

---

## 4. API Endpoints Design (Business Logic Layer)

### 4.1 Authentication Service (`/api/v1/auth`)

#### POST `/send-otp`
Send OTP to user's phone number (business logic + Convex call)
```javascript
// api/auth/send-otp.js
app.post('/api/v1/auth/send-otp', async (req, res) => {
  const { phone_number } = req.body;
  
  // Business logic: validation, rate limiting, fraud detection
  if (!isValidPhoneNumber(phone_number)) {
    return res.status(400).json({ error: 'Invalid phone number' });
  }
  
  // Business logic: check rate limits
  const canSend = await checkRateLimit(phone_number);
  if (!canSend) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  
  // Generate OTP
  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  // Call Convex for pure data operation
  const userResult = await convexClient.mutation(
    api.auth.createUser,
    { phone_number }
  );
  
  await convexClient.mutation(
    api.auth.setOTP,
    { 
      user_id: userResult.user_id,
      otp_hash: otpHash,
      expires_at: expiresAt
    }
  );
  
  // Business logic: send SMS via Twilio
  await sendSMSThroughTwilio(phone_number, otp);
  
  res.json({
    success: true,
    message: "OTP sent successfully",
    expires_in: 300
  });
});
```

#### POST `/verify-otp`
Verify OTP and generate session (business logic + Convex call)
```javascript
// api/auth/verify-otp.js
app.post('/api/v1/auth/verify-otp', async (req, res) => {
  const { phone_number, otp } = req.body;
  
  // Business logic: validation
  if (!phone_number || !otp) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Call Convex to get user and OTP data
  const userData = await convexClient.query(
    api.auth.getUserByPhone,
    { phone_number }
  );
  
  if (!userData) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Business logic: verify OTP
  const isValid = verifyOTP(otp, userData.otp_hash);
  const isExpired = Date.now() > userData.otp_expires_at;
  
  if (!isValid || isExpired) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }
  
  // Business logic: generate JWT token
  const token = generateJWT(userData.user_id);
  
  // Call Convex to update user status
  await convexClient.mutation(
    api.auth.markUserVerified,
    { user_id: userData.user_id }
  );
  
  res.json({
    success: true,
    token,
    user: {
      id: userData.user_id,
      phone_number: userData.phone_number,
      is_verified: true
    }
  });
});
```

### 4.2 Profile Management Service (`/api/v1/profile`)

#### PUT `/me`
Update user profile with validation (business logic + Convex call)
```javascript
// api/profile/update.js
app.put('/api/v1/profile/me', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const profileData = req.body;
  
  // Business logic: validation and sanitization
  const validationErrors = validateProfileData(profileData);
  if (validationErrors.length > 0) {
    return res.status(400).json({ errors: validationErrors });
  }
  
  // Business logic: check subscription limits
  const userSubscription = await getUserSubscription(userId);
  if (profileData.photos && profileData.photos.length > getMaxPhotos(userSubscription.plan)) {
    return res.status(400).json({ error: 'Photo limit exceeded for your plan' });
  }
  
  // Business logic: geocoding if location changed
  if (profileData.location) {
    const geocodedLocation = await geocodeLocation(profileData.location_name);
    profileData.location = geocodedLocation;
  }
  
  // Call Convex for pure data update
  await convexClient.mutation(
    api.profiles.updateUserProfile,
    { 
      user_id: userId,
      ...sanitizeProfileData(profileData)
    }
  );
  
  res.json({
    success: true,
    message: "Profile updated successfully"
  });
});
```

### 4.3 Matching Service (`/api/v1/matching`)

#### POST `/swipe`
Record swipe with business logic (complex validation + Convex call)
```javascript
// api/matching/swipe.js
app.post('/api/v1/matching/swipe', authenticateToken, async (req, res) => {
  const swiperId = req.user.id;
  const { target_user_id, action } = req.body;
  
  // Business logic: validation
  if (!target_user_id || !['like', 'pass'].includes(action)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  // Business logic: prevent self-swiping
  if (swiperId === target_user_id) {
    return res.status(400).json({ error: 'Cannot swipe on yourself' });
  }
  
  // Business logic: rate limiting
  const canSwipe = await checkSwipeRateLimit(swiperId);
  if (!canSwipe) {
    return res.status(429).json({ error: 'Swipe limit reached' });
  }
  
  // Business logic: check if already swiped
  const existingSwipe = await convexClient.query(
    api.swipes.getSwipe,
    { swiper_id: swiperId, swiped_id: target_user_id }
  );
  
  if (existingSwipe) {
    return res.status(400).json({ error: 'Already swiped on this user' });
  }
  
  // Business logic: fraud detection
  const isSuspicious = await detectFraudulentSwiping(swiperId, target_user_id);
  if (isSuspicious) {
    return res.status(403).json({ error: 'Suspicious activity detected' });
  }
  
  // Call Convex to record the swipe
  const swipeResult = await convexClient.mutation(
    api.swipes.recordSwipe,
    { 
      swiper_id: swiperId,
      swiped_id: target_user_id,
      action
    }
  );
  
  // Business logic: check for match and send notifications
  if (swipeResult.isMatch) {
    await sendMatchNotification(swipeResult.match_id);
    
    // Business logic: award premium features for match
    await awardMatchBonus(swiperId);
  }
  
  res.json({
    success: true,
    is_match: swipeResult.isMatch,
    match_id: swipeResult.match_id
  });
});
```

### 4.4 Direct Convex Queries (Client → Convex)

#### Frontend Usage Examples
```javascript
// Frontend - Direct Convex queries (no business logic needed)
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

// Get user profile (direct query)
const profile = useQuery(api.queries.getCurrentUserProfile);

// Get discovery feed (direct query)
const feed = useQuery(api.queries.getDiscoveryFeed, { limit: 20 });

// Get matches (direct query)
const matches = useQuery(api.queries.getUserMatches);

// Subscribe to real-time messages
const messages = useQuery(api.queries.getConversationMessages, { 
  match_id: currentMatchId 
});
```

---

## 5. Real-time Communication

### 5.1 WebSocket Events

#### Connection
```javascript
// Client connects with auth token
socket.emit('authenticate', { token: 'jwt-token' });

// Server responds
socket.on('authenticated', (data) => {
  console.log('Connected as user:', data.user_id);
});
```

#### Match Events
```javascript
// New match notification
socket.on('new_match', (data) => {
  console.log('New match with:', data.user.first_name);
});

// Match removed
socket.on('match_removed', (data) => {
  console.log('Match removed:', data.match_id);
});
```

#### Message Events
```javascript
// New message received
socket.on('new_message', (data) => {
  console.log('New message:', data.message.content);
});

// Message read confirmation
socket.on('message_read', (data) => {
  console.log('Message read by:', data.reader_id);
});
```

#### Typing Indicators
```javascript
// User is typing
socket.emit('typing_start', { match_id: 'match-uuid' });
socket.emit('typing_stop', { match_id: 'match-uuid' });

// Receive typing events
socket.on('user_typing', (data) => {
  console.log(`${data.user_id} is typing...`);
});
```

---

## 6. Security Considerations

### 6.1 Authentication Flow
1. User sends phone number to `/auth/send-otp`
2. System generates 6-digit OTP and stores hash
3. OTP sent via Twilio SMS (expires in 5 minutes)
4. User submits OTP to `/auth/verify-otp`
5. System validates OTP hash and generates JWT
6. JWT contains user ID and expires in 24 hours
7. Refresh tokens rotate every request

### 6.2 Rate Limiting
- OTP requests: 3 per hour per phone number
- Login attempts: 5 per hour per IP
- API requests: 1000 per hour per user
- Message sending: 60 per minute per user

### 6.3 Data Protection
- All sensitive data encrypted at rest
- TLS 1.3 for all communications
- Phone numbers obfuscated in logs
- GDPR/CCPA compliant data handling
- Automatic data purging after inactivity

---

## 7. Deployment Architecture

### 7.1 Container Orchestration
```yaml
# docker-compose.yml excerpt
version: '3.8'
services:
  api-gateway:
    image: dating-app/api-gateway
    ports: ["3000:3000"]
    
  user-service:
    image: dating-app/user-service
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...
      
  postgres:
    image: postgres:14
    volumes: ["postgres_data:/var/lib/postgresql/data"]
    
  redis:
    image: redis:7-alpine
```

### 7.2 Environment Variables
```bash
# Required environment variables
DATABASE_URL=postgresql://user:pass@host:5432/dating_app
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

---

## 8. Monitoring and Logging

### 8.1 Key Metrics to Track
- Authentication success/failure rates
- API response times and error rates
- Database query performance
- Real-time connection counts
- Message delivery success rates
- Subscription conversion rates

### 8.2 Health Checks
```http
GET /health
Response: { "status": "healthy", "services": {...} }
```

---

This plan provides a comprehensive foundation for building a scalable, secure dating app backend with OTP-only authentication. The microservices architecture ensures each component can scale independently while maintaining clean separation of concerns.