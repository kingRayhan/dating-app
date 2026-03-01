# Traditional SQL Database Schema & API Plans

**Version:** 1.0  
**Date:** February 27, 2026  
**Database:** PostgreSQL  
**Architecture:** Traditional REST API with SQL database

---

## 🗄️ DATABASE SCHEMA

### Core Tables

#### `users` Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    otp_hash VARCHAR(255),
    otp_expires_at TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    
    -- Profile data
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    birth_date DATE,
    gender VARCHAR(20),
    bio TEXT,
    location POINT,
    location_name VARCHAR(100),
    max_distance INTEGER DEFAULT 50,
    age_min INTEGER DEFAULT 18,
    age_max INTEGER DEFAULT 100,
    show_me VARCHAR(20) DEFAULT 'everyone',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_verified ON users(is_verified);
CREATE INDEX idx_users_location ON users USING GIST(location);
CREATE INDEX idx_users_created_at ON users(created_at);
```

#### `profile_photos` Table
```sql
CREATE TABLE profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_photos_user ON profile_photos(user_id);
CREATE INDEX idx_photos_primary ON profile_photos(user_id, is_primary);
```

#### `user_interests` Table
```sql
CREATE TABLE interests (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES interest_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    popularity_score INTEGER DEFAULT 0,  -- For trending/suggestions
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, name)
);

-- Indexes
CREATE INDEX idx_interests_user ON user_interests(user_id);
CREATE INDEX idx_interests_name ON user_interests(interest_name);

-- User interests mapping
CREATE TABLE user_interests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, interest_id)
);
```

#### `swipes` Table
```sql
CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swiper_id UUID REFERENCES users(id) ON DELETE CASCADE,
    swiped_id UUID REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(10) CHECK (action IN ('like', 'pass')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(swiper_id, swiped_id)
);

-- Indexes
CREATE INDEX idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX idx_swipes_created_at ON swipes(created_at);
```

#### `matches` Table
```sql
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (user1_id != user2_id),
    UNIQUE(user1_id, user2_id)
);

-- Indexes
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_matches_active ON matches(is_active);
CREATE INDEX idx_matches_matched_at ON matches(matched_at);
```

#### `messages` Table
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

-- Indexes
CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(match_id, is_read);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
```

#### `subscriptions` Table
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expiry ON subscriptions(expires_at);
```

#### `reports` Table
```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
```

#### `user_blocks` Table
```sql
CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(blocker_id, blocked_id)
);

-- Indexes
CREATE INDEX idx_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_id);
```

#### `notifications` Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    related_id VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

---

## 🚀 API ENDPOINTS

### Authentication Endpoints

#### POST `/api/v1/auth/send-otp`
```javascript
// Request
{
  "phone_number": "+1234567890"
}

// Response
{
  "success": true,
  "message": "OTP sent successfully",
  "expires_in": 300,
  "user_exists": true
}

// SQL Operations:
// 1. SELECT * FROM users WHERE phone_number = $1
// 2. INSERT INTO users (phone_number, otp_hash, otp_expires_at) VALUES ($1, $2, $3)
//    ON CONFLICT (phone_number) DO UPDATE SET otp_hash = $2, otp_expires_at = $3
```

#### POST `/api/v1/auth/verify-otp`
```javascript
// Request
{
  "phone_number": "+1234567890",
  "otp": "123456"
}

// Response
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "user_id": "uuid",
    "phone_number": "+1234567890",
    "is_verified": true
  }
}

// SQL Operations:
// 1. SELECT * FROM users WHERE phone_number = $1
// 2. UPDATE users SET is_verified = true, last_login = NOW() WHERE id = $1
```

### Profile Endpoints

#### GET `/api/v1/profile/me`
```javascript
// Response
{
  "success": true,
  "user": {
    "user_id": "uuid",
    "phone_number": "+1234567890",
    "is_verified": true,
    "last_login": "timestamp"
  },
  "profile": {
    "first_name": "John",
    "last_name": "Doe",
    "birth_date": "1990-01-01",
    "gender": "male",
    "bio": "Software developer",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "max_distance": 50,
    "age_min": 18,
    "age_max": 100,
    "show_me": "everyone"
  },
  "photos": [
    {
      "photo_id": "uuid",
      "url": "https://...",
      "is_primary": true,
      "order_index": 0
    }
  ],
  "interests": ["technology", "travel", "music"]
}

// SQL Operations:
// 1. SELECT * FROM users WHERE id = $1
// 2. SELECT * FROM profile_photos WHERE user_id = $1 ORDER BY order_index
// 3. SELECT * FROM user_interests WHERE user_id = $1
```

#### PUT `/api/v1/profile/me`
```javascript
// Request
{
  "first_name": "John",
  "last_name": "Doe",
  "birth_date": "1990-01-01",
  "gender": "male",
  "bio": "Updated bio",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "max_distance": 30,
  "age_min": 25,
  "age_max": 40,
  "show_me": "women"
}

// Response
{
  "success": true,
  "message": "Profile updated successfully"
}

// SQL Operations:
// 1. UPDATE users SET 
//    first_name = $1, last_name = $2, birth_date = $3, gender = $4,
//    bio = $5, location = POINT($6, $7), max_distance = $8,
//    age_min = $9, age_max = $10, show_me = $11, updated_at = NOW()
//    WHERE id = $12
```

### Discovery Endpoints

#### GET `/api/v1/discovery/feed`
```javascript
// Query Parameters: ?limit=20&offset=0

// Response
{
  "success": true,
  "users": [
    {
      "user_id": "uuid",
      "first_name": "Jane",
      "age": 28,
      "bio": "Designer",
      "distance_km": 5.2,
      "photos": ["https://..."]
    }
  ]
}

// SQL Operations:
// 1. Get current user: SELECT * FROM users WHERE id = $1
// 2. Calculate age range dates
// 3. Complex query to find matching users:
/*
SELECT u.id, u.first_name, u.birth_date, u.bio, u.location,
       calculate_distance(current_user.location, u.location) as distance_km
FROM users u
WHERE u.id != $1  -- Not self
  AND u.birth_date BETWEEN $2 AND $3  -- Age range
  AND u.location IS NOT NULL  -- Has location
  AND calculate_distance(current_user.location, u.location) <= $4  -- Distance filter
  AND (
    $5 = 'everyone' OR 
    (u.gender = 'male' AND $5 = 'men') OR 
    (u.gender = 'female' AND $5 = 'women')
  )  -- Show preference
  AND u.id NOT IN (  -- Not already swiped
    SELECT swiped_id FROM swipes WHERE swiper_id = $1
  )
ORDER BY distance_km
LIMIT $6 OFFSET $7
*/
```

### Matching Endpoints

#### POST `/api/v1/matching/swipe`
```javascript
// Request
{
  "target_user_id": "uuid",
  "action": "like"  // or "pass"
}

// Response
{
  "success": true,
  "is_match": true,
  "match_id": "uuid"  // if is_match = true
}

// SQL Operations:
// 1. INSERT INTO swipes (swiper_id, swiped_id, action) VALUES ($1, $2, $3)
// 2. Check for mutual like:
/*
SELECT COUNT(*) FROM swipes 
WHERE swiper_id = $2 AND swiped_id = $1 AND action = 'like'
*/
// 3. If mutual like, create match:
// INSERT INTO matches (user1_id, user2_id, matched_at) VALUES ($1, $2, NOW())
```

#### GET `/api/v1/matching/matches`
```javascript
// Query Parameters: ?limit=50

// Response
{
  "success": true,
  "matches": [
    {
      "match_id": "uuid",
      "user": {
        "user_id": "uuid",
        "first_name": "Jane",
        "photo_url": "https://..."
      },
      "matched_at": "timestamp",
      "last_message": {
        "content": "Hello!",
        "sent_at": "timestamp",
        "is_read": false
      }
    }
  ]
}

// SQL Operations:
// 1. Get matches where user is user1:
/*
SELECT m.*, u.first_name, pp.photo_url
FROM matches m
JOIN users u ON u.id = m.user2_id
LEFT JOIN profile_photos pp ON pp.user_id = u.id AND pp.is_primary = true
WHERE m.user1_id = $1 AND m.is_active = true
UNION
SELECT m.*, u.first_name, pp.photo_url
FROM matches m
JOIN users u ON u.id = m.user1_id
LEFT JOIN profile_photos pp ON pp.user_id = u.id AND pp.is_primary = true
WHERE m.user2_id = $1 AND m.is_active = true
ORDER BY matched_at DESC
LIMIT $2
*/
```

### Messaging Endpoints

#### GET `/api/v1/messages/conversation/:matchId`
```javascript
// Query Parameters: ?limit=50&before=timestamp

// Response
{
  "success": true,
  "messages": [
    {
      "message_id": "uuid",
      "sender_id": "uuid",
      "content": "Hello!",
      "message_type": "text",
      "sent_at": "timestamp",
      "is_read": true
    }
  ]
}

// SQL Operations:
// 1. Verify access to conversation:
// SELECT * FROM matches WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
// 2. Get messages:
/*
SELECT * FROM messages 
WHERE match_id = $1 
ORDER BY sent_at DESC 
LIMIT $2
*/
// 3. Mark as read:
// UPDATE messages SET is_read = true 
// WHERE match_id = $1 AND sender_id != $2 AND is_read = false
```

#### POST `/api/v1/messages/send`
```javascript
// Request
{
  "match_id": "uuid",
  "content": "Hello there!",
  "message_type": "text"
}

// Response
{
  "success": true,
  "message": {
    "message_id": "uuid",
    "content": "Hello there!",
    "sent_at": "timestamp"
  }
}

// SQL Operations:
// 1. Verify match access
// 2. INSERT INTO messages (match_id, sender_id, content, message_type) VALUES ($1, $2, $3, $4)
// 3. Create notification for recipient:
/*
INSERT INTO notifications (user_id, type, related_id, title, message)
SELECT 
  CASE 
    WHEN user1_id = $2 THEN user2_id 
    ELSE user1_id 
  END,
  'new_message',
  $3,  -- message_id
  'New Message',
  LEFT($4, 50)  -- truncated content
FROM matches 
WHERE id = $1
*/
```

### Subscription Endpoints

#### POST `/api/v1/subscriptions`
```javascript
// Request
{
  "plan_type": "premium_monthly",
  "payment_token": "stripe_token"
}

// Response
{
  "success": true,
  "subscription": {
    "subscription_id": "uuid",
    "plan_type": "premium_monthly",
    "status": "active",
    "expires_at": "timestamp"
  }
}

// SQL Operations:
// 1. Expire existing subscriptions:
// UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1 AND status = 'active'
// 2. Create new subscription:
// INSERT INTO subscriptions (user_id, plan_type, status, expires_at) VALUES ($1, $2, 'active', $3)
```

---

## 🔄 DATABASE FUNCTIONS

### Distance Calculation Function
```sql
CREATE OR REPLACE FUNCTION calculate_distance(
    point1 POINT,
    point2 POINT
) RETURNS NUMERIC AS $$
BEGIN
    RETURN ROUND(
        6371 * acos(
            cos(radians(point1[1])) * cos(radians(point2[1])) *
            cos(radians(point2[0]) - radians(point1[0])) +
            sin(radians(point1[1])) * sin(radians(point2[1]))
        )::NUMERIC,
        2
    );
END;
$$ LANGUAGE plpgsql;
```

### Age Calculation Function
```sql
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
    RETURN EXTRACT(YEAR FROM AGE(birth_date))::INTEGER;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 PERFORMANCE OPTIMIZATIONS

### Materialized Views for Discovery Feed
```sql
-- Pre-computed discovery candidates
CREATE MATERIALIZED VIEW discovery_candidates AS
SELECT 
    u1.id as user_id,
    u2.id as candidate_id,
    calculate_distance(u1.location, u2.location) as distance_km,
    calculate_age(u2.birth_date) as age,
    u2.first_name,
    u2.bio
FROM users u1
CROSS JOIN users u2
WHERE u1.id != u2.id
  AND u2.is_verified = true
  AND u2.location IS NOT NULL
  AND u2.birth_date IS NOT NULL;

CREATE INDEX idx_discovery_candidates_user ON discovery_candidates(user_id);
CREATE INDEX idx_discovery_candidates_distance ON discovery_candidates(distance_km);
```

### Refresh materialized view periodically
```sql
-- Schedule this to run every hour
REFRESH MATERIALIZED VIEW CONCURRENTLY discovery_candidates;
```

---

This traditional SQL approach provides full control over your data and infrastructure while maintaining the same functionality as the Convex version.