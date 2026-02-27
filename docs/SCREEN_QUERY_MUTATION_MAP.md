# Screen Name to Query/Mutation Mapping

**Version:** 1.0  
**Date:** February 27, 2026  
**Purpose:** Map UI screens to required backend functions

---

## 📱 AUTHENTICATION SCREENS

### `WelcomeScreen`
**Purpose:** Initial app entry point
**Queries Needed:** None
**Mutations Needed:** None
**Navigation:** → `PhoneInputScreen`

---

### `PhoneInputScreen`
**Purpose:** Collect user's phone number
**Queries Needed:** 
- `getUserByPhone(phone_number)` - Check if user exists
**Mutations Needed:**
- `createUser(phone_number)` - Create new user record
**Navigation:** 
- New user → `OTPScreen`
- Existing user → `OTPScreen`

---

### `OTPScreen`
**Purpose:** Verify phone number with OTP
**Queries Needed:**
- `getUserByPhone(phone_number)` - Get user for verification
**Mutations Needed:**
- `setOTP(user_id, otp_hash, expires_at)` - Store OTP for user
- `verifyUser(user_id)` - Mark user as verified after successful OTP
**Navigation:**
- Success → `OnboardingFlow` (if new user) or `MainAppTabs` (if returning user)

---

## 🚀 ONBOARDING SCREENS

### `OnboardingFlow`
**Purpose:** Container for onboarding steps
**Queries Needed:**
- `getCurrentUser()` - Get current user status
- `getCurrentUserProfile()` - Check onboarding progress
**Mutations Needed:**
- `startOnboarding(user_id)` - Initialize onboarding session
**Navigation:** → First onboarding step based on progress

---

### `ProfileSetupScreen`
**Purpose:** Collect basic profile information
**Queries Needed:**
- `getCurrentUser()` - Get existing profile data
**Mutations Needed:**
- `completeProfileStep(user_id, profile_data)` - Save profile information
**Navigation:** → `PhotoUploadScreen`

---

### `PhotoUploadScreen`
**Purpose:** Upload profile photos
**Queries Needed:**
- `getCurrentUserProfile()` - Get existing photos
**Mutations Needed:**
- `uploadOnboardingPhotos(user_id, photos)` - Upload and save photos
**Navigation:** → `InterestSelectionScreen`

---

### `InterestSelectionScreen`
**Purpose:** Select personal interests
**Queries Needed:**
- `getCurrentUserProfile()` - Get existing interests
**Mutations Needed:**
- `selectInterests(user_id, interests)` - Save interest selections
**Navigation:** → `LocationSetupScreen`

---

### `LocationSetupScreen`
**Purpose:** Set location and discovery preferences
**Queries Needed:**
- `getCurrentUser()` - Get current location data
**Mutations Needed:**
- `setLocationPreferences(user_id, location_data, preferences)` - Save location and preferences
**Navigation:** → `OnboardingCompleteScreen`

---

### `OnboardingCompleteScreen`
**Purpose:** Final onboarding confirmation
**Queries Needed:** None
**Mutations Needed:**
- `completeOnboarding(user_id)` - Finalize onboarding process
**Navigation:** → `MainAppTabs`

---

## 🏠 MAIN APP SCREENS

### `MainAppTabs`
**Purpose:** Bottom tab navigator
**Child Screens:**
- `DiscoveryTab`
- `MatchesTab` 
- `MessagesTab`
- `ProfileTab`

---

### `DiscoveryTab`
**Purpose:** Browse potential matches
**Queries Needed:**
- `getDiscoveryFeed(limit, offset)` - Get discovery feed users
- `getUserDiscoveryDetails(user_id)` - Get detailed user info for expanded view
**Mutations Needed:**
- `recordSwipe(swiper_id, swiped_id, action)` - Record user swipes
**Navigation:** 
- Tap user → `UserProfileModal`
- Like/Pass → Update feed

---

### `UserProfileModal`
**Purpose:** Detailed view of discovery user
**Queries Needed:**
- `getUserDiscoveryDetails(user_id)` - Get complete user profile
**Mutations Needed:**
- `recordSwipe(swiper_id, swiped_id, action)` - Handle swipe from modal
**Navigation:** 
- Close → Back to `DiscoveryTab`
- Swipe → Back to `DiscoveryTab` with updated feed

---

### `MatchesTab`
**Purpose:** View all matches
**Queries Needed:**
- `getUserMatches(limit)` - Get user's matches
- `getMatchById(match_id)` - Get specific match details
**Mutations Needed:**
- `unmatchUsers(match_id)` - Remove match
**Navigation:**
- Tap match → `ChatScreen`

---

### `MessagesTab`
**Purpose:** List all conversations
**Queries Needed:**
- `getUserMatches(limit)` - Get matches with last messages
- `getUnreadMessageCount()` - Show notification badges
**Mutations Needed:** None
**Navigation:**
- Tap conversation → `ChatScreen`

---

### `ChatScreen`
**Purpose:** Individual conversation
**Queries Needed:**
- `getMatchById(match_id)` - Verify match access
- `getConversationMessages(match_id, limit, before)` - Load conversation messages
**Mutations Needed:**
- `sendMessage(match_id, sender_id, content, message_type)` - Send new message
- `markConversationAsRead(match_id, user_id)` - Mark messages as read
**Navigation:** 
- Back → `MessagesTab` or `MatchesTab`

---

### `ProfileTab`
**Purpose:** User's own profile management
**Queries Needed:**
- `getCurrentUserProfile()` - Load current profile data
**Mutations Needed:**
- `updateUserProfile(user_id, updates)` - Update profile fields
- `addProfilePhoto(user_id, photo_url, is_primary)` - Add new photos
- `removeProfilePhoto(photo_id)` - Remove photos
- `addUserInterest(user_id, interest_name, category)` - Add interests
- `removeUserInterest(user_id, interest_name)` - Remove interests
**Navigation:** 
- Edit sections → Various profile edit modals

---

## ⚙️ SETTINGS SCREENS

### `SettingsScreen`
**Purpose:** App settings and preferences
**Queries Needed:**
- `getCurrentUserProfile()` - Get current preferences
**Mutations Needed:**
- `updateUserProfile(user_id, updates)` - Update preferences
- `cancelSubscription(subscription_id)` - Cancel subscription
**Navigation:** 
- Various sub-setting screens

---

### `SubscriptionScreen`
**Purpose:** Manage premium subscriptions
**Queries Needed:**
- `getCurrentUserProfile()` - Get current subscription status
**Mutations Needed:**
- `createSubscription(user_id, plan_type, duration_days)` - Purchase new subscription
- `cancelSubscription(subscription_id)` - Cancel existing subscription
**Navigation:** 
- Payment processing → External payment flow

---

## 🔍 SEARCH & FILTER SCREENS

### `SearchScreen`
**Purpose:** Search for specific users
**Queries Needed:**
- `searchUsers(query, limit)` - Search users by name
**Mutations Needed:** None
**Navigation:**
- Tap result → `UserProfileModal` or direct chat if matched

---

### `FilterScreen`
**Purpose:** Adjust discovery preferences
**Queries Needed:**
- `getCurrentUserProfile()` - Get current preferences
**Mutations Needed:**
- `updateUserProfile(user_id, updates)` - Update discovery filters
**Navigation:** 
- Apply → Back to `DiscoveryTab` with updated feed

---

## 🛡️ SAFETY & REPORT SCREENS

### `ReportUserScreen`
**Purpose:** Report inappropriate users
**Queries Needed:**
- `getUserProfileById(user_id)` - Get reported user info
**Mutations Needed:**
- `createReport(reporter_id, reported_user_id, reason, description)` - Submit report
**Navigation:** 
- Submit → Confirmation and return to previous screen

---

### `BlockUserScreen`
**Purpose:** Block problematic users
**Queries Needed:** None
**Mutations Needed:**
- `blockUser(blocker_id, blocked_id)` - Block user
**Navigation:** 
- Confirm → Return to previous screen

---

## 📊 ADMIN/DEBUG SCREENS

### `DebugInfoScreen`
**Purpose:** Developer diagnostics
**Queries Needed:**
- `getCurrentUser()` - User auth status
- `getCurrentUserProfile()` - Complete profile data
- `getUnreadMessageCount()` - Message statistics
**Mutations Needed:** None
**Navigation:** 
- Various diagnostic views

---

## 🔁 STATE MANAGEMENT FLOWS

### `LoadingScreen`
**Purpose:** Handle app initialization
**Queries Needed:**
- `getCurrentUser()` - Check auth status
- `getCurrentUserProfile()` - Check onboarding status
**Mutations Needed:** None
**Navigation:**
- Authenticated + Onboarded → `MainAppTabs`
- Authenticated + Not onboarded → `OnboardingFlow`
- Not authenticated → `WelcomeScreen`

---

## 🔄 REAL-TIME UPDATES

### Background Subscriptions:
- **Match notifications:** Subscribe to new matches
- **Message notifications:** Subscribe to new messages  
- **Profile updates:** Subscribe to own profile changes
- **Subscription expiry:** Subscribe to subscription status changes

**Implementation:** Use Convex real-time subscriptions for automatic UI updates

---

## 📱 SCREEN TO FUNCTION MATRIX

| Screen | Primary Query | Primary Mutation | Secondary Functions |
|--------|---------------|------------------|-------------------|
| WelcomeScreen | None | None | Navigation only |
| PhoneInputScreen | getUserByPhone | createUser | Form validation |
| OTPScreen | getUserByPhone | setOTP, verifyUser | Timer management |
| ProfileSetupScreen | getCurrentUser | completeProfileStep | Data validation |
| PhotoUploadScreen | getCurrentUserProfile | uploadOnboardingPhotos | Image processing |
| InterestSelectionScreen | getCurrentUserProfile | selectInterests | Multi-select logic |
| LocationSetupScreen | getCurrentUser | setLocationPreferences | Geolocation |
| DiscoveryTab | getDiscoveryFeed | recordSwipe | Infinite scroll |
| UserProfileModal | getUserDiscoveryDetails | recordSwipe | Modal presentation |
| MatchesTab | getUserMatches | unmatchUsers | List management |
| ChatScreen | getConversationMessages | sendMessage, markConversationAsRead | Real-time updates |
| ProfileTab | getCurrentUserProfile | updateUserProfile, add/remove photos/interests | Form handling |

This mapping ensures each screen knows exactly which backend functions it needs to implement its functionality.