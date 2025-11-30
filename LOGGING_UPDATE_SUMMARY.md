# Gunapad Logging Update Summary

## ✅ COMPLETED TASKS

### 1. Database Migration Created
**File:** `migration_add_mapping_column.sql`

### 2. Updated Logging Module
**File:** `src/logStoryToDB.js`

---

## 📋 STEP-BY-STEP TESTING GUIDE

### STEP 1: Apply SQL Migration to Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to: **SQL Editor** (left sidebar)
4. Click: **New Query**
5. Paste this SQL:

```sql
ALTER TABLE gunapad_logs
ADD COLUMN IF NOT EXISTS mapping jsonb;

COMMENT ON COLUMN gunapad_logs.mapping IS 'Stores child anonymization mapping: { "childIdMap": { "RealName": "Child_1" }, "reverseMap": { "Child_1": "RealName" } }';
```

6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see: "Success. No rows returned"

---

### STEP 2: Test the Application

1. **Open the app in your browser:**
   - URL: http://localhost:5173/

2. **Fill out the form:**
   - Add 2-3 children with real names (e.g., "Lian", "Elli", "Tim")
   - Fill in ages and genders
   - (Optional) Enable Parent Mode and add context
   - Choose a story world, sidekicks, and action
   - Click "Geschichte zaubern" (Create Story)

3. **Wait for the story to generate**

4. **Check your browser console** (F12 → Console tab)
   - You should see:
     ```
     ✅ Story logged successfully to Supabase
     📊 Logged data summary: { children: 3, wordCount: 650, hasParentNote: true, mappingKeys: 3 }
     ```

---

### STEP 3: Verify Database Entry

1. Go to Supabase Dashboard → **Table Editor**
2. Open the `gunapad_logs` table
3. Find the most recent entry (sort by `timestamp` DESC)
4. Click on the row to expand it

**Check these fields:**

✅ **story_title**: Should contain "Child_1", "Child_2" instead of real names
✅ **raw_story**: Should contain "Child_1", "Child_2" instead of real names
✅ **mapping**: Should contain:
```json
{
  "childIdMap": {
    "Lian": "Child_1",
    "Elli": "Child_2",
    "Tim": "Child_3"
  },
  "reverseMap": {
    "Child_1": "Lian",
    "Child_2": "Elli",
    "Child_3": "Tim"
  }
}
```

✅ **children**: Should contain:
```json
[
  { "id_label": "Child_1", "age": 5, "gender": "m", "description_redacted": true, "preferences_redacted": true },
  { "id_label": "Child_2", "age": 7, "gender": "f", "description_redacted": true, "preferences_redacted": true },
  { "id_label": "Child_3", "age": 4, "gender": "m", "description_redacted": true, "preferences_redacted": true }
]
```

✅ **day_incident_short**: Should be `"user_context_redacted"`

❌ **VERIFY NO REAL NAMES APPEAR** in:
- story_title
- raw_story
- children array
- raw_input
- day_incident_short

✅ **Real names ONLY appear in**: `mapping` object

---

## 🔍 WHAT CHANGED

### Old Behavior:
- ❌ Real names stored in story text
- ❌ Descriptions and preferences stored
- ❌ Day incident text stored in plain text
- ❌ No mapping column (causing 400 errors)
- ❌ Incomplete anonymization

### New Behavior:
- ✅ **Complete anonymization** of all story texts
- ✅ **Possessive forms handled** ("Tim's" → "Child_2's")
- ✅ **Word boundary matching** (avoids partial replacements)
- ✅ **Sorted name replacement** (longest first to prevent conflicts)
- ✅ **Bidirectional mapping** stored (childIdMap + reverseMap)
- ✅ **Privacy-first**: Real names only in mapping field
- ✅ **Better error logging** with detailed console output

---

## 📊 EXAMPLE OUTPUT

### Example Story Title (in DB):
**Before:** "Lian und Elli finden den verlorenen Stern"
**After:** "Child_1 und Child_2 finden den verlorenen Stern"

### Example Story Content (in DB):
**Before:** "Lian war mutig und Elli half ihm dabei..."
**After:** "Child_1 war mutig und Child_2 half ihm dabei..."

### Example Mapping Object:
```json
{
  "childIdMap": {
    "Lian": "Child_1",
    "Elli": "Child_2",
    "Tim": "Child_3"
  },
  "reverseMap": {
    "Child_1": "Lian",
    "Child_2": "Elli",
    "Child_3": "Tim"
  }
}
```

---

## 🛡️ PRIVACY GUARANTEES

### ✅ What is NEVER stored:
- Real child names (except in mapping)
- Descriptions (e.g., "very energetic")
- Preferences (e.g., "loves dinosaurs")
- Day incident details (only length stored)

### ✅ What IS stored (anonymized):
- Story title (with Child_X labels)
- Story content (with Child_X labels)
- Moral (with Child_X labels)
- Parent notes (with Child_X labels)
- Metadata: age, gender, word count, settings
- Mapping object (for reverse lookup if needed)

---

## 🚨 TROUBLESHOOTING

### If you see "Supabase Log Error" in console:

1. **Check the error message:**
   - "column 'mapping' does not exist" → Run the SQL migration
   - "400 Bad Request" → Check Supabase table schema matches payload
   - "JWT expired" → Check your Supabase anon key in supabaseClient.js

2. **Verify Supabase connection:**
   - Open browser console
   - Check Network tab for failed requests
   - Verify supabaseClient.js has correct URL and key

3. **Check browser console logs:**
   - Look for detailed error messages
   - Stack traces will help identify the issue

---

## 📝 DEVELOPER NOTES

### Code Structure:
```
src/logStoryToDB.js
├── escapeRegex()           # Escape regex special chars
├── anonymizeText()         # Replace names with Child_X
└── logStoryToDB()          # Main logging function
    ├── Build mapping       # childIdMap + reverseMap
    ├── Anonymize texts     # title, content, moral, parentNote
    ├── Sanitize context    # Remove personal data
    ├── Construct payload   # Final DB object
    └── Insert to Supabase  # With error handling
```

### Key Features:
- **Length-sorted replacement**: Prevents "Tim" from matching "Timothy"
- **Possessive handling**: "Tim's" → "Child_2's"
- **Case-insensitive**: Matches "Lian", "lian", "LIAN"
- **Word boundaries**: Won't replace "Tim" in "Optimal"
- **Bidirectional mapping**: Can reverse lookup if needed

---

## ✅ SUCCESS CRITERIA

You've successfully implemented the logging pipeline if:

1. ✅ SQL migration runs without errors
2. ✅ Stories generate and log successfully
3. ✅ Console shows "✅ Story logged successfully"
4. ✅ Database entries contain Child_X labels (not real names)
5. ✅ Mapping object is present in DB
6. ✅ No real names appear outside mapping field
7. ✅ Descriptions/preferences are marked as redacted
8. ✅ Day incident is sanitized

---

## 🎯 NEXT STEPS

After verifying the above:

1. Generate 2-3 test stories with different names
2. Verify all DB entries are properly anonymized
3. Check that possessive forms work ("Tim's" → "Child_2's")
4. Test with special characters in names (accents, hyphens)
5. Verify the app works in German, English, and Spanish

---

**Date:** 2025-11-27
**Version:** 1.0
**Status:** ✅ Ready for Testing
