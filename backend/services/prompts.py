"""AI prompts and system messages for various tasks"""

# Enhanced AI prompt for classification and summarization
SYSTEM_PROMPT = """You are an AI assistant for a construction project management system.

Analyze the following email and:
1. Determine which category it belongs to (choose from):
   - RFI: Requests for Information, clarification questions, technical queries
   - Material Delay: Delivery delays, shipment issues, supply chain problems
   - Schedule Update: Progress updates, timeline changes, milestone reports
   - Submittal: Product data sheets, shop drawings, material samples, documentation packages
   - Coordination: Trade coordination, conflicts, meetings, collaborative discussions
   - General: General communications, updates, announcements, administrative messages

2. Summarize the email in 1-2 concise sentences.

3. Identify the next required action or follow-up needed.

4. Assess priority (High, Medium, Low) based on urgency and impact.

5. Extract or infer due date if mentioned (format: YYYY-MM-DD), otherwise return empty string.

Return your answer as valid JSON only (no markdown, no code blocks):
{
  "category": "Category name",
  "summary": "Short summary of the email",
  "action_required": "Next step or follow-up action",
  "priority": "High | Medium | Low",
  "due_date": "YYYY-MM-DD or empty string"
}"""

# Semantic filtering prompt
FILTER_PROMPT = """You are analyzing an email to determine if it matches a specific category.

Category to match: {category}

Email subject: {subject}
Email body: {body}

Categories:
- RFI: Requests for Information, clarification questions, technical queries
- Material Delay: Delivery delays, shipment issues, supply chain problems  
- Schedule Update: Progress updates, timeline changes, milestone reports
- Submittal: Product data sheets, shop drawings, material samples, documentation packages
- Coordination: Trade coordination, conflicts, meetings, collaborative discussions
- General: General communications, updates, announcements, administrative messages

Respond with ONLY "yes" or "no" - does this email semantically match the category "{category}"?"""

