# Security Specification: Shale - Namma Pride

## Data Invariants
1. A Meal record cannot exist without a valid date, matching the document ID.
2. Only Admins can create/update/delete Meals, Facilities, and Student achievements.
3. Feedback can be anonymous or linked to a user, but only admins can read all feedback.
4. Users can only edit their own profile.
5. All IDs must match '^[a-zA-Z0-9_\\-]+$'.

## The "Dirty Dozen" Payloads (Red Team Tests)

### T1: Identity Spoofing (User Profile)
**Attempt:** Create a profile for `victim_uid` while logged in as `attacker_uid`.
**Payload:** `setDoc(doc(db, 'users', 'victim_uid'), { uid: 'victim_uid', role: 'admin' })`
**Expected:** PERMISSION_DENIED

### T2: Privilege Escalation (User Profile)
**Attempt:** Update own role to 'admin'.
**Payload:** `updateDoc(doc(db, 'users', 'attacker_uid'), { role: 'admin' })`
**Expected:** PERMISSION_DENIED (isValidUser checks role, and update only allows specific keys)

### T3: Meal Poisoning (Unauthorized Write)
**Attempt:** Parent tries to post a meal update.
**Payload:** `addDoc(collection(db, 'meals'), { menuEn: 'Free Chocolate for everyone', ... })`
**Expected:** PERMISSION_DENIED

### T4: Resource Exhaustion (ID Poisoning)
**Attempt:** Inject a 1.5KB string as a document ID.
**Payload:** `setDoc(doc(db, 'meals', 'a'.repeat(1500)), { ... })`
**Expected:** PERMISSION_DENIED (isValidId checks size)

### T5: Shadow Update (Ghost Field)
**Attempt:** Add `isVerified: true` to a student record.
**Payload:** `addDoc(collection(db, 'students'), { name: 'Rahul', isVerified: true, ... })`
**Expected:** PERMISSION_DENIED (isValidStudent checks keys size)

### T6: Feedback Scraping (Unauthorized Read)
**Attempt:** Parent tries to list all feedback.
**Payload:** `getDocs(collection(db, 'feedback'))`
**Expected:** PERMISSION_DENIED (read only for isAdmin)

### T7: Feedback Spoofing
**Attempt:** User tries to send feedback as another user.
**Payload:** `addDoc(collection(db, 'feedback'), { userId: 'victim_uid', isAnonymous: false, ... })`
**Expected:** PERMISSION_DENIED (isAnonymous gate or userId check)

### T8: State Shortcutting (Feedback Status)
**Attempt:** User tries to mark their own feedback as 'reviewed'.
**Payload:** `updateDoc(doc(db, 'feedback', 'fb_123'), { status: 'reviewed' })`
**Expected:** PERMISSION_DENIED (update only for isAdmin)

### T9: Immutable Field Tampering
**Attempt:** Change `createdAt` on a feedback record.
**Payload:** `updateDoc(doc(db, 'feedback', 'fb_123'), { createdAt: '2000-01-01' })`
**Expected:** PERMISSION_DENIED (affectedKeys doesn't include createdAt)

### T10: Anonymous Read Leak
**Attempt:** List all student achievers without being signed in.
**Expected:** ALLOWED (read is public for transparency)

### T11: PII Leak (User Profile)
**Attempt:** Read another user's profile with phone number.
**Payload:** `getDoc(doc(db, 'users', 'victim_uid'))`
**Expected:** ALLOWED (profiles are semi-public for the school community, but rules allow `get: if isSignedIn()`)
*Note: I should reconsider if phone numbers should be public. I'll restrict it to isAdmin or isOwner.*

### T12: Orphaned Data (Relational Integrity)
**Attempt:** Create a student achievement with a non-existent date pattern.
**Payload:** `addDoc(collection(db, 'students'), { date: 'invalid-date', ... })`
**Expected:** PERMISSION_DENIED (isValidId or custom regex)

## Conflict Report & Patch Plan
- **PII Leak:** Currently `match /users/{userId} { allow get: if isSignedIn(); }`. This leaks phone numbers.
- **Patch:** Change `get` to check `isOwner()` or `isAdmin()`.
- **Identity Spoofing:** `isAdmin` check was hardened with `email_verified`.
