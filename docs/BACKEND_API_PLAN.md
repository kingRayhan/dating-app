# Backend API and Database Design Plan

**Version:** 1.0  
**Date:** February 27, 2026  
**Project:** Dating App - OTP Authentication System

---

## 1. Executive Summary

This document outlines the complete backend API design and database entity structure for the dating application with OTP-only phone number authentication. The system follows a microservices architecture with clean separation of concerns and scalable design patterns.

---

## 2. System Architecture Overview

### 2.1 Microservices Structure

```
dating-app-backend/
├── user-service/           # User management and authentication
├── profile-service/        # Profile creation and management
├── matching-service/       # Recommendation engine and matching
├── messaging-service/      # Real-time chat and notifications
├── media-service/          # Photo storage and processing
├── payment-service/        # Subscription and billing
├── moderation-service/     # Content moderation and safety
└── api-gateway/           # Entry point and routing
```

### 2.2 Technology Stack

- **Runtime:** Node.js 18+ with NestJS framework
- **Database:** PostgreSQL 14+ (primary), Redis 7+ (caching)
- **ORM:** Prisma ORM
- **Authentication:** Custom OTP service with Twilio
- **Real-time:** Socket.IO
- **API Documentation:** Swagger/OpenAPI 3.0
- **Deployment:** Docker containers with Kubernetes orchestration

---

## 3. Database Entity Design

### 3.1 Core Entities

#### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### UserProfiles Table
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    birth_date DATE,
    gender VARCHAR(20),
    bio TEXT,
    location POINT,
    location_name VARCHAR(255),
    max_distance INTEGER DEFAULT 50,
    age_min INTEGER DEFAULT 18,
    age_max INTEGER DEFAULT 100,
    show_me VARCHAR(20) DEFAULT 'everyone',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
```

#### ProfilePhotos Table
```sql
CREATE TABLE profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### UserInterests Table
```sql
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interest_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, interest_name)
);
```

#### Matches Table
```sql
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id)
);
```

#### Messages Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Swipes Table
```sql
CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swiper_id UUID REFERENCES users(id) ON DELETE CASCADE,
    swiped_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(10) NOT NULL, -- 'like' or 'pass'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(swiper_id, swiped_id)
);
```

#### Subscriptions Table
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Reports Table
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 Indexes for Performance

```sql
-- Performance indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_verified ON users(is_verified);
CREATE INDEX idx_profiles_location ON user_profiles USING GIST(location);
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
```

---

## 4. API Endpoints Design

### 4.1 Authentication Service (`/api/v1/auth`)

#### POST `/send-otp`
Send OTP to user's phone number
```json
Request:
{
  "phone_number": "+1234567890"
}

Response (200):
{
  "success": true,
  "message": "OTP sent successfully",
  "expires_in": 300
}
```

#### POST `/verify-otp`
Verify OTP and generate session token
```json
Request:
{
  "phone_number": "+1234567890",
  "otp": "123456"
}

Response (200):
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "phone_number": "+1234567890",
    "is_verified": true
  }
}
```

#### POST `/refresh-token`
Refresh authentication token
```json
Headers: { "Authorization": "Bearer <token>" }

Response (200):
{
  "success": true,
  "token": "new-jwt-token-here"
}
```

#### POST `/logout`
Logout and invalidate session
```json
Headers: { "Authorization": "Bearer <token>" }

Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 4.2 User Profile Service (`/api/v1/profile`)

#### GET `/me`
Get current user's profile
```json
Headers: { "Authorization": "Bearer <token>" }

Response (200):
{
  "success": true,
  "profile": {
    "id": "uuid-here",
    "first_name": "John",
    "last_name": "Doe",
    "birth_date": "1995-05-15",
    "gender": "male",
    "bio": "Software developer",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "photos": [
      {
        "id": "photo-uuid",
        "url": "https://storage.url/photo.jpg",
        "is_primary": true
      }
    ],
    "interests": ["technology", "travel", "music"]
  }
}
```

#### PUT `/me`
Update user profile
```json
Headers: { "Authorization": "Bearer <token>" }
Request:
{
  "first_name": "John",
  "last_name": "Doe",
  "birth_date": "1995-05-15",
  "gender": "male",
  "bio": "Updated bio",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "preferences": {
    "max_distance": 50,
    "age_min": 25,
    "age_max": 35,
    "show_me": "women"
  }
}

Response (200):
{
  "success": true,
  "message": "Profile updated successfully"
}
```

#### POST `/photos`
Upload profile photo
```json
Headers: { 
  "Authorization": "Bearer <token>",
  "Content-Type": "multipart/form-data"
}
Form Data: { "photo": <file>, "is_primary": true }

Response (200):
{
  "success": true,
  "photo": {
    "id": "photo-uuid",
    "url": "https://storage.url/new-photo.jpg",
    "is_primary": true
  }
}
```

#### DELETE `/photos/{photoId}`
Delete profile photo
```json
Headers: { "Authorization": "Bearer <token>" }

Response (200):
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

### 4.3 Matching Service (`/api/v1/matching`)

#### GET `/feed`
Get potential matches feed
```json
Headers: { "Authorization": "Bearer <token>" }

Response (200):
{
  "success": true,
  "users": [
    {
      "id": "user-uuid",
      "first_name": "Jane",
      "age": 28,
      "bio": "Designer",
      "distance_km": 5.2,
      "photos": ["https://photo1.jpg", "https://photo2.jpg"],
      "interests": ["art", "photography"],
      "mutual_interests": ["travel", "music"]
    }
  ]
}
```

#### POST `/swipe`
Record swipe action
```json
Headers: { "Authorization": "Bearer <token>" }
Request:
{
  "target_user_id": "target-uuid",
  "action": "like"  // or "pass"
}

Response (200):
{
  "success": true,
  "is_match": true,
  "match_id": "match-uuid"  // only if it's a match
}
```

#### GET `/matches`
Get user's matches
```json
Headers: { "Authorization": "Bearer <token>" }

Response (200):
{
  "success": true,
  "matches": [
    {
      "id": "match-uuid",
      "user": {
        "id": "user-uuid",
        "first_name": "Jane",
        "photos": ["https://photo.jpg"]
      },
      "matched_at": "2026-02-27T10:30:00Z",
      "last_message": {
        "content": "Hey there!",
        "sent_at": "2026-02-27T15:45:00Z"
      }
    }
  ]
}
```

### 4.4 Messaging Service (`/api/v1/messages`)

#### GET `/conversations/{matchId}`
Get conversation messages
```json
Headers: { "Authorization": "Bearer <token>" }
Query: { "limit": 50, "before": "timestamp" }

Response (200):
{
  "success": true,
  "messages": [
    {
      "id": "message-uuid",
      "sender_id": "user-uuid",
      "content": "Hello!",
      "sent_at": "2026-02-27T15:30:00Z",
      "is_read": true
    }
  ]
}
```

#### POST `/send`
Send message
```json
Headers: { "Authorization": "Bearer <token>" }
Request:
{
  "match_id": "match-uuid",
  "content": "Hi there!",
  "message_type": "text"  // or "photo", "gif"
}

Response (200):
{
  "success": true,
  "message": {
    "id": "message-uuid",
    "content": "Hi there!",
    "sent_at": "2026-02-27T15:30:00Z"
  }
}
```

#### POST `/mark-read`
Mark messages as read
```json
Headers: { "Authorization": "Bearer <token>" }
Request:
{
  "match_id": "match-uuid",
  "message_ids": ["msg1-uuid", "msg2-uuid"]
}

Response (200):
{
  "success": true,
  "marked_count": 2
}
```

### 4.5 Safety Service (`/api/v1/safety`)

#### POST `/report`
Report user
```json
Headers: { "Authorization": "Bearer <token>" }
Request:
{
  "reported_user_id": "user-uuid",
  "reason": "inappropriate_behavior",
  "description": "User sent inappropriate messages"
}

Response (200):
{
  "success": true,
  "report_id": "report-uuid"
}
```

#### POST `/block`
Block user
```json
Headers: { "Authorization": "Bearer <token>" }
Request:
{
  "user_id": "user-uuid"
}

Response (200):
{
  "success": true,
  "message": "User blocked successfully"
}
```

### 4.6 Payment Service (`/api/v1/billing`)

#### GET `/plans`
Get subscription plans
```json
Response (200):
{
  "success": true,
  "plans": [
    {
      "id": "premium_monthly",
      "name": "Premium Monthly",
      "price": 19.99,
      "interval": "month",
      "features": [
        "Unlimited likes",
        "See who liked you",
        "Rewind feature"
      ]
    }
  ]
}
```

#### POST `/subscribe`
Create subscription
```json
Headers: { "Authorization": "Bearer <token>" }
Request:
{
  "plan_id": "premium_monthly",
  "payment_method": {
    "type": "card",
    "token": "stripe_token_here"
  }
}

Response (200):
{
  "success": true,
  "subscription": {
    "id": "sub-uuid",
    "status": "active",
    "expires_at": "2026-03-27T00:00:00Z"
  }
}
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