# Dating App Query & Mutation Pseudocode Reference

**Version:** 1.0  
**Date:** February 27, 2026  
**Format:** Clean pseudocode with return types

---

## 🚀 ONBOARDING MUTATIONS

### `startOnboarding(user_id: ID)`
```
PSEUDOCODE:
1. Create onboarding progress record for user
2. Set initial step to "profile_setup"
3. Set status to "in_progress"
4. Set started_at timestamp
5. Return onboarding session ID

RETURN TYPE: ID
```

### `completeProfileStep(user_id: ID, profile_data: ProfileDataObject)`
```
PSEUDOCODE:
1. Validate required profile fields (first_name, birth_date, gender)
2. Update user profile with provided data
3. Update onboarding progress to "profile_completed"
4. Update updated_at timestamp
5. Return success status

RETURN TYPE: { success: boolean, next_step: string }
```

### `uploadOnboardingPhotos(user_id: ID, photos: PhotoArray)`
```
PSEUDOCODE:
1. Validate photo array (1-6 photos)
2. Process each photo:
   - Upload to storage
   - Generate thumbnails
   - Set first photo as primary
3. Create profile photo records for each photo
4. Update onboarding progress to "photos_uploaded"
5. Return uploaded photo URLs

RETURN TYPE: { 
  success: boolean, 
  photos: [{ photo_id: ID, url: string, is_primary: boolean }] 
}
```

### `selectInterests(user_id: ID, interests: StringArray)`
```
PSEUDOCODE:
1. Validate interests array (minimum 3, maximum 20)
2. Clear existing user interests
3. Add each interest to user_interests table
4. Update onboarding progress to "interests_selected"
5. Return success status

RETURN TYPE: { success: boolean, next_step: string }
```

### `setLocationPreferences(user_id: ID, location_data: LocationObject, preferences: PreferenceObject)`
```
PSEUDOCODE:
1. Validate location coordinates
2. Reverse geocode to get location name
3. Update user location data
4. Set discovery preferences:
   - max_distance
   - age_min
   - age_max
   - show_me
5. Update onboarding progress to "preferences_set"
6. Return success status

RETURN TYPE: { success: boolean, next_step: string }
```

### `completeOnboarding(user_id: ID)`
```
PSEUDOCODE:
1. Verify all onboarding steps are completed
2. Update user status to "onboarding_complete"
3. Set onboarding progress status to "completed"
4. Set completed_at timestamp
5. Create welcome notification
6. Award free trial subscription if applicable
7. Return completion status

RETURN TYPE: { 
  success: boolean, 
  user_ready: boolean,
  trial_days: number | null
}
```

### `skipOnboardingStep(user_id: ID, step: string)`
```
PSEUDOCODE:
1. Validate step name is valid
2. Update onboarding progress to skip this step
3. Set step status to "skipped"
4. Determine next required step
5. Return next step information

RETURN TYPE: { success: boolean, next_step: string, can_skip: boolean }
```

### `resetOnboarding(user_id: ID)`
```
PSEUDOCODE:
1. Delete existing onboarding progress record
2. Reset user profile to minimal state
3. Remove uploaded photos
4. Clear selected interests
5. Create new onboarding progress record
6. Return reset status

RETURN TYPE: { success: boolean, new_session_id: ID }
```

---

## 🔐 AUTHENTICATION QUERIES

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

## 🌟 DISCOVERY FEED QUERIES

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

## 💕 MATCHING QUERIES

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

## 💬 MESSAGING QUERIES

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

## 👤 PROFILE QUERIES

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

## 🔐 AUTHENTICATION MUTATIONS

### `createUser(phone_number: string)`
```
PSEUDOCODE:
1. Check if user with this phone number already exists
2. If exists, return existing user ID
3. If not exists, create new user record
4. Set initial values: is_verified = false
5. Return user ID and existence status

RETURN TYPE: { user_id: ID, existed: boolean }
```

### `setOTP(user_id: ID, otp_hash: string, expires_at: timestamp)`
```
PSEUDOCODE:
1. Update user record with OTP hash and expiration time
2. Set updated_at timestamp

RETURN TYPE: void
```

### `verifyUser(user_id: ID)`
```
PSEUDOCODE:
1. Update user record to set is_verified = true
2. Set last_login to current timestamp
3. Update updated_at timestamp

RETURN TYPE: void
```

### `createInitialProfile(user_id: ID, first_name: string, birth_date: timestamp, gender: string)`
```
PSEUDOCODE:
1. Update existing user with profile data
2. Set default preferences:
   - max_distance = 50
   - age_min = 18
   - age_max = 100
   - show_me = "everyone"
3. Update updated_at timestamp

RETURN TYPE: void
```

---

## 👤 PROFILE MUTATIONS

### `updateUserProfile(user_id: ID, updates: ProfileUpdatesObject)`
```
PSEUDOCODE:
1. Update user profile data with provided updates
2. Only update fields that are provided in updates object
3. Update updated_at timestamp

RETURN TYPE: void
```

### `addProfilePhoto(user_id: ID, photo_url: string, is_primary: boolean)`
```
PSEUDOCODE:
1. If setting as primary, unset current primary photo
2. Get next order index for photo ordering
3. Insert new photo record with:
   - user_id
   - photo_url
   - is_primary flag
   - order_index
   - created_at timestamp
4. Return new photo ID

RETURN TYPE: ID
```

### `removeProfilePhoto(photo_id: ID)`
```
PSEUDOCODE:
1. Delete photo record by ID

RETURN TYPE: void
```

### `addUserInterest(user_id: ID, interest_name: string, category: string)`
```
PSEUDOCODE:
1. Check if interest already exists for this user
2. If exists, return existing interest ID
3. If not exists, create new interest record
4. Return interest ID

RETURN TYPE: ID
```

### `removeUserInterest(user_id: ID, interest_name: string)`
```
PSEUDOCODE:
1. Find interest record for this user and interest name
2. Delete the interest record if found

RETURN TYPE: void
```

---

## 💕 MATCHING MUTATIONS

### `recordSwipe(swiper_id: ID, swiped_id: ID, action: "like"|"pass")`
```
PSEUDOCODE:
1. Check if swipe already exists between these users
2. If exists, throw error
3. Record the swipe with:
   - swiper_id
   - swiped_id
   - action (like/pass)
   - created_at timestamp
4. If action is "like":
   - Check for reverse swipe (mutual like)
   - If mutual like exists, create match record
   - Set match matched_at timestamp
   - Set match is_active = true
5. Return swipe result with match information

RETURN TYPE: {
  swipe_id: ID,
  is_match: boolean,
  match_id: ID | null
}
```

### `unmatchUsers(match_id: ID)`
```
PSEUDOCODE:
1. Update match record to set is_active = false
2. Update updated_at timestamp

RETURN TYPE: void
```

---

## 💬 MESSAGING MUTATIONS

### `sendMessage(match_id: ID, sender_id: ID, content: string, message_type: string)`
```
PSEUDOCODE:
1. Verify sender is part of the match (user1_id or user2_id)
2. Check if match is active
3. Insert new message record with:
   - match_id
   - sender_id
   - content
   - message_type
   - is_read = false
   - sent_at timestamp
4. Create notification for recipient:
   - Type: "new_message"
   - Related ID: message ID
   - Truncated message content
5. Return message ID

RETURN TYPE: ID
```

### `markMessageAsRead(message_id: ID)`
```
PSEUDOCODE:
1. Update message record to set is_read = true

RETURN TYPE: void
```

### `markConversationAsRead(match_id: ID, user_id: ID)`
```
PSEUDOCODE:
1. Get match record to identify other user
2. Find all unread messages in conversation sent by other user
3. Mark all those messages as read (is_read = true)

RETURN TYPE: void
```

---

## 💰 SUBSCRIPTION MUTATIONS

### `createSubscription(user_id: ID, plan_type: string, duration_days: number)`
```
PSEUDOCODE:
1. Expire any existing active subscriptions for this user
2. Calculate expiration timestamp from duration
3. Create new subscription record with:
   - user_id
   - plan_type
   - status = "active"
   - started_at = now
   - expires_at = calculated timestamp
   - created_at = now
4. Return subscription ID

RETURN TYPE: ID
```

### `cancelSubscription(subscription_id: ID)`
```
PSEUDOCODE:
1. Update subscription record to set status = "cancelled"
2. Update updated_at timestamp

RETURN TYPE: void
```

### `expireSubscription(subscription_id: ID)`
```
PSEUDOCODE:
1. Update subscription record to set status = "expired"
2. Update updated_at timestamp

RETURN TYPE: void
```

---

## 📊 DATA TYPES REFERENCE

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

This reference provides clean pseudocode for all query and mutation functions without implementation details.