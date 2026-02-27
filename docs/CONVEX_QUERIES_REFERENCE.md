# Convex Query Functions Reference

**Version:** 1.0  
**Date:** February 27, 2026  
**Format:** Pseudocode with return types only

---

## Authentication Queries

### `getUserByPhone(phone_number: string)`
```
PSEUDOCODE:
1. Search users table using phone number index
2. Return the matching user record
3. Return null if no user found

RETURN TYPE: UserObject | null
```

### `getCurrentUser()`
```
PSEUDOCODE:
1. Get current user's phone number from auth context
2. Find user in database by phone number
3. Return user object or null if not found

RETURN TYPE: UserObject | null
```

### `getUserProfileById(user_id: ID)`
```
PSEUDOCODE:
1. Get user record by ID
2. Fetch all profile photos for this user
3. Fetch all interests for this user
4. Return structured profile data with user info, photos, and interests

RETURN TYPE: {
  user: UserObject,
  profile: ProfileObject,
  photos: PhotoArray,
  interests: StringArray
} | null
```

---

## Discovery Feed Queries

### `getDiscoveryFeed(limit: number, offset: number)`
```
PSEUDOCODE:
1. Get current authenticated user
2. Validate user has complete profile (location and birth date)
3. Set default preferences (distance, age range, gender preferences)
4. Calculate age range timestamps
5. Find all users within age range who have locations
6. Filter by:
   - Distance (within max_distance)
   - Gender preferences (show_me setting)
   - Not self
7. Remove users already swiped on
8. Sort by distance (closest first)
9. Apply pagination (limit/offset)
10. Return simplified user data for feed

RETURN TYPE: DiscoveryFeedArray [{
  user_id: ID,
  first_name: string,
  age: number,
  bio: string,
  distance_km: number,
  photos: array
}]
```

### `getUserDiscoveryDetails(user_id: ID)`
```
PSEUDOCODE:
1. Get user record by ID
2. Fetch user's primary profile photo
3. Fetch up to 5 user interests
4. Calculate user's age from birth date
5. Return simplified profile data for discovery view

RETURN TYPE: {
  user_id: ID,
  first_name: string,
  age: number,
  bio: string,
  photos: StringArray,
  interests: StringArray,
  location_name: string
} | null
```

---

## Matching Queries

### `getUserMatches(limit: number)`
```
PSEUDOCODE:
1. Get current authenticated user
2. Find all matches where user is user1
3. Find all matches where user is user2
4. Combine and deduplicate match records
5. For each match:
   - Identify the other user in the match
   - Get their profile information
   - Get their primary photo
   - Get the last message in the conversation
6. Return structured match data with user info and last message

RETURN TYPE: MatchArray [{
  match_id: ID,
  user: {
    user_id: ID,
    first_name: string,
    photo_url: string
  },
  matched_at: timestamp,
  last_message: MessageObject | null
}]
```

### `getMatchById(match_id: ID)`
```
PSEUDOCODE:
1. Get current authenticated user
2. Fetch match record by ID
3. Verify current user is part of this match (user1_id or user2_id)
4. Return match record if authorized, throw error if not

RETURN TYPE: MatchObject | null
```

---

## Messaging Queries

### `getConversationMessages(match_id: ID, limit: number, before: timestamp)`
```
PSEUDOCODE:
1. Get current authenticated user
2. Verify user has access to this conversation (is user1 or user2 in match)
3. Fetch messages for this match
4. Apply pagination if timestamp provided
5. Order messages chronologically (oldest first for display)
6. Return message data with read status

RETURN TYPE: MessageArray [{
  message_id: ID,
  sender_id: ID,
  content: string,
  message_type: string,
  sent_at: timestamp,
  is_read: boolean
}]
```

### `getUnreadMessageCount()`
```
PSEUDOCODE:
1. Get current authenticated user
2. Find all active matches for this user
3. For each match:
   - Count unread messages sent by the other user
4. Sum all unread message counts
5. Return total unread message count

RETURN TYPE: number
```

---

## Profile Queries

### `getCurrentUserProfile()`
```
PSEUDOCODE:
1. Get current authenticated user by phone number
2. Fetch all profile photos for this user
3. Fetch all user interests
4. Get active subscription information
5. Return complete profile data including:
   - User authentication info
   - Profile details with defaults
   - Photos with ordering
   - Interests list
   - Subscription status

RETURN TYPE: {
  user: UserObject,
  profile: ProfileObject,
  photos: [{
    photo_id: ID,
    url: string,
    is_primary: boolean,
    order_index: number
  }],
  interests: StringArray,
  subscription: SubscriptionObject | null
} | null
```

### `searchUsers(query: string, limit: number)`
```
PSEUDOCODE:
1. Get current authenticated user
2. Search users table by first name using search index
3. Exclude current user from results
4. For each matching user:
   - Get their basic profile information
   - Fetch their primary photo
5. Return search results with user details and photos

RETURN TYPE: SearchResultArray [{
  user_id: ID,
  first_name: string,
  last_name: string,
  bio: string,
  photo_url: string,
  location_name: string
}]
```

---

## Data Types Reference

### UserObject
```
{
  _id: ID,
  phone_number: string,
  is_verified: boolean,
  last_login: timestamp,
  first_name: string,
  last_name: string,
  birth_date: timestamp,
  gender: string,
  bio: string,
  location: { latitude: number, longitude: number },
  location_name: string,
  max_distance: number,
  age_min: number,
  age_max: number,
  show_me: string
}
```

### ProfileObject
```
{
  first_name: string,
  last_name: string,
  birth_date: timestamp,
  gender: string,
  bio: string,
  location: { latitude: number, longitude: number },
  location_name: string,
  max_distance: number,
  age_min: number,
  age_max: number,
  show_me: string
}
```

### MatchObject
```
{
  _id: ID,
  user1_id: ID,
  user2_id: ID,
  matched_at: timestamp,
  is_active: boolean
}
```

### MessageObject
```
{
  _id: ID,
  match_id: ID,
  sender_id: ID,
  content: string,
  message_type: string,
  is_read: boolean,
  sent_at: timestamp
}
```

### SubscriptionObject
```
{
  _id: ID,
  user_id: ID,
  plan_type: string,
  status: string,
  started_at: timestamp,
  expires_at: timestamp
}
```

---

This reference provides a clean overview of all Convex query functions with their logic flow and return types, without implementation details.