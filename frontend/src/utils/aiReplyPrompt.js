export const generateAIReplyPrompt = (rowData) => `
You are an AI Assistant for construction project management.
Compose a professional and context-aware email reply for the subcontractor conversation below.

DETAILS:
- Project: ${rowData.project_guess}
- Subject: ${rowData.thread_subject}
- Issue: ${rowData.issue_detected}
- Impact Area: ${rowData.impact_area}
- Risk Level: ${rowData.risk_level}
- Recommended Action: ${rowData.recommended_action}

Tone:
Polite, professional, collaborative. The goal is to follow up clearly while maintaining good vendor relationships.

OUTPUT FORMAT:
Return ONLY a valid JSON object (no markdown, no code blocks) with this structure:
{
  "subject": "Reply Subject",
  "body": "AI-generated reply email content"
}
`;

