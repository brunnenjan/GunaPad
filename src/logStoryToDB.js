import { supabase } from './supabaseClient';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Escape special regex characters to prevent regex injection
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for regex
 */
function escapeRegex(str) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Anonymize text by replacing real child names with Child_X labels
 * Handles possessive forms (e.g., "Tim's" → "Child_2's")
 * Uses word boundaries to avoid partial replacements
 *
 * @param {string} text - Text to anonymize
 * @param {object} childIdMap - Mapping of real names to Child_X labels
 * @returns {string} - Anonymized text
 */
function anonymizeText(text, childIdMap) {
  if (!text) return text;
  let output = text;

  // Sort names by length (longest first) to avoid partial replacements
  // Example: Replace "Timothy" before "Tim" to prevent incorrect matches
  const sortedNames = Object.keys(childIdMap).sort((a, b) => b.length - a.length);

  for (const realName of sortedNames) {
    const pseudo = childIdMap[realName];
    const safe = escapeRegex(realName);

    // Replace possessive forms first (e.g., "Tim's" → "Child_2's")
    const possessiveRegex = new RegExp(`\\b${safe}'s\\b`, "gi");
    output = output.replace(possessiveRegex, `${pseudo}'s`);

    // Replace regular word occurrences (case-insensitive, word boundaries)
    const regex = new RegExp(`\\b${safe}\\b`, "gi");
    output = output.replace(regex, pseudo);
  }

  return output;
}

// ============================================================================
// MAIN LOGGING FUNCTION
// ============================================================================

/**
 * Log anonymized story data to Supabase
 *
 * @param {object} params - Logging parameters
 * @param {object} params.rawInput - Raw form input from user
 * @param {object} params.storyJSON - Generated story from AI
 * @param {object} params.flags - Optional feature flags
 * @param {string} params.engineVersion - Version of story generation engine
 * @returns {boolean} - True if logging succeeded, false otherwise
 */
export const logStoryToDB = async ({ rawInput, storyJSON, flags = {}, engineVersion = "1.0" }) => {
  if (!supabase) {
    console.warn("Supabase client is not configured; skipping logging.");
    return false;
  }

  try {
    // ------------------------------------------------------------------------
    // STEP 1: BUILD CHILD NAME MAPPING
    // ------------------------------------------------------------------------
    const childrenToMap = rawInput.children || [];
    const childIdMap = {};    // { "Lian": "Child_1", "Elli": "Child_2" }
    const reverseMap = {};    // { "Child_1": "Lian", "Child_2": "Elli" }

    childrenToMap.forEach((child, index) => {
      if (child.name && child.name.trim()) {
        const label = `Child_${index + 1}`;
        const trimmedName = child.name.trim();
        childIdMap[trimmedName] = label;
        reverseMap[label] = trimmedName;
      }
    });

    // ------------------------------------------------------------------------
    // STEP 2: BUILD ANONYMIZED CHILDREN METADATA
    // ------------------------------------------------------------------------
    const anonymizedChildren = childrenToMap.map((child, index) => ({
      id_label: `Child_${index + 1}`,
      age: child.age || null,
      gender: child.gender || null,
      description_redacted: true,   // Never store actual descriptions
      preferences_redacted: true     // Never store actual preferences
    }));

    // ------------------------------------------------------------------------
    // STEP 3: ANONYMIZE ALL STORY TEXTS
    // ------------------------------------------------------------------------
    const anonymizedTitle = anonymizeText(storyJSON.title || "", childIdMap);
    const anonymizedContent = anonymizeText(storyJSON.content || "", childIdMap);
    const anonymizedMoral = anonymizeText(storyJSON.moral || "", childIdMap);

    // Anonymize parent note (handle both string and object formats)
    let anonymizedParentNote = null;
    if (storyJSON.parentNote) {
      if (typeof storyJSON.parentNote === 'string') {
        // Simple string format
        anonymizedParentNote = anonymizeText(storyJSON.parentNote, childIdMap);
      } else {
        // Structured object format { background, impulse, reflection }
        anonymizedParentNote = {
          background: anonymizeText(storyJSON.parentNote.background || "", childIdMap),
          impulse: anonymizeText(storyJSON.parentNote.impulse || "", childIdMap),
          reflection: anonymizeText(storyJSON.parentNote.reflection || "", childIdMap)
        };
      }
    }

    // ------------------------------------------------------------------------
    // STEP 4: SANITIZE DAY INCIDENT (Never store actual text)
    // ------------------------------------------------------------------------
    const incidentLength = (rawInput.dayIncident || "").length;
    const incidentShort = "user_context_redacted";  // Privacy-safe placeholder

    // ------------------------------------------------------------------------
    // STEP 5: BUILD SAFE RAW INPUT (No personal data)
    // ------------------------------------------------------------------------
    const sanitizedRawInput = {
      mood: rawInput.dayMood,
      goal: rawInput.storyGoal,
      settings: {
        world: rawInput.world || "none",
        sidekicks: rawInput.sidekicks || "none",
        action: rawInput.storyAction || "none"
      },
      children_meta: anonymizedChildren,
      lang: rawInput.lang
    };

    // ------------------------------------------------------------------------
    // STEP 6: BUILD FULL ANONYMIZED STORY TEXT
    // ------------------------------------------------------------------------
    const fullStoryText = `${anonymizedContent}\n\n${
      anonymizedParentNote ? JSON.stringify(anonymizedParentNote) : ""
    }`;

    // ------------------------------------------------------------------------
    // STEP 7: BUILD MAPPING OBJECT
    // ------------------------------------------------------------------------
    const mappingObject = {
      childIdMap,    // { "Lian": "Child_1", "Elli": "Child_2" }
      reverseMap     // { "Child_1": "Lian", "Child_2": "Elli" }
    };

    // ------------------------------------------------------------------------
    // STEP 8: CONSTRUCT FINAL SUPABASE PAYLOAD
    // ------------------------------------------------------------------------
    const payload = {
      // Metadata
      timestamp: new Date().toISOString(),
      engine_version: engineVersion,
      lang: rawInput.lang,

      // Story settings
      story_length: rawInput.storyLength,
      story_goal: rawInput.storyGoal,
      world: rawInput.world || "none",
      sidekicks: rawInput.sidekicks || "none",
      action: rawInput.storyAction || "none",

      // Anonymized children data
      children: anonymizedChildren,

      // Sanitized day context
      day_incident_short: incidentShort,
      day_incident_length: incidentLength,

      // Anonymized story outputs
      story_title: anonymizedTitle,
      story_word_count: anonymizedContent ? anonymizedContent.split(/\s+/).length : 0,
      has_parent_note: !!anonymizedParentNote,
      moral_length: anonymizedMoral ? anonymizedMoral.length : 0,

      // Optional flags
      flags,

      // Anonymization mapping (allows reverse lookup if needed)
      mapping: mappingObject,

      // Sanitized input data
      raw_input: sanitizedRawInput,

      // Full anonymized story text
      raw_story: fullStoryText
    };

    // ------------------------------------------------------------------------
    // STEP 9: INSERT INTO SUPABASE
    // ------------------------------------------------------------------------
    const { error } = await supabase
      .from("gunapad_logs")
      .insert([payload]);

    if (error) {
      console.error("❌ Supabase Log Error:", error.message);
      console.error("Error details:", error);
      return false;
    }

    console.log("✅ Story logged successfully to Supabase");
    console.log("📊 Logged data summary:", {
      children: anonymizedChildren.length,
      wordCount: payload.story_word_count,
      hasParentNote: payload.has_parent_note,
      mappingKeys: Object.keys(childIdMap).length
    });

    return true;

  } catch (err) {
    console.error("❌ Logging Exception:", err);
    console.error("Stack trace:", err.stack);
    return false;
  }
};
